/**
 * Merge indexer — polls Alchemy for Evolution contract events,
 * detects burns (keeper ascends, donor burns), writes chronicle_events,
 * and queues enrich-merge jobs.
 *
 * Run: npx ts-node --esm indexer/merge-indexer.ts
 */

import { Alchemy, Network, Log } from 'alchemy-sdk';
import { ethers } from 'ethers';
import sql from '../lib/db';
import { enrichMerge } from '../jobs/enrich-merge';

const BLUPETS_CORE = process.env.NEXT_PUBLIC_BLUPETS_CORE!;
const BLUPETS_EVOLUTION = process.env.NEXT_PUBLIC_BLUPETS_EVOLUTION!;
const POLL_INTERVAL_MS = 15_000;

// Transfer(address from, address to, uint256 tokenId)
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY!,
  network: Network.ETH_MAINNET,
});

async function getLastBlock(): Promise<number> {
  const row = await sql`
    SELECT value FROM indexer_state WHERE key = 'merge_indexer_last_block'
  `;
  return parseInt(row[0]?.value ?? '0', 10);
}

async function saveLastBlock(block: number) {
  await sql`
    UPDATE indexer_state SET value = ${String(block)}, updated_at = NOW()
    WHERE key = 'merge_indexer_last_block'
  `;
}

async function processLog(log: Log, blockTimestamp: Date) {
  if (log.topics.length < 4) return;

  const from = ethers.getAddress('0x' + log.topics[1].slice(26));
  const to = ethers.getAddress('0x' + log.topics[2].slice(26));
  const tokenId = parseInt(log.topics[3], 16);

  // Burn event: Transfer to the Evolution contract address or dead address
  // means donor was burned. We detect keeper ascension by checking
  // if any OTHER token was transferred to the same wallet in the same tx.
  // For simplicity in v1: detect transfers TO zero address = burn = donor.
  if (to !== ZERO_ADDRESS && to.toLowerCase() !== BLUPETS_EVOLUTION.toLowerCase()) return;

  const donorId = tokenId;
  const txHash = log.transactionHash;

  // Check if already processed
  const existing = await sql`
    SELECT id FROM chronicle_events WHERE tx_hash = ${txHash}
  `;
  if (existing.length > 0) return;

  // Get tx receipt to find the keeper token (another Transfer in same tx to a real wallet)
  const receipt = await alchemy.core.getTransactionReceipt(txHash);
  if (!receipt) return;

  let keeperId: number | null = null;
  let newStage: number | null = null;

  for (const txLog of receipt.logs) {
    if (
      txLog.address.toLowerCase() !== BLUPETS_CORE.toLowerCase() ||
      txLog.topics[0] !== TRANSFER_TOPIC ||
      txLog.topics.length < 4
    ) continue;

    const logTo = '0x' + txLog.topics[2].slice(26);
    const logTokenId = parseInt(txLog.topics[3], 16);

    // Keeper = token transferred to the original owner (not zero/evolution)
    if (
      logTokenId !== donorId &&
      logTo.toLowerCase() !== ZERO_ADDRESS &&
      logTo.toLowerCase() !== BLUPETS_EVOLUTION.toLowerCase()
    ) {
      keeperId = logTokenId;
      break;
    }
  }

  if (!keeperId) return;

  // Fetch keeper's new stage from BluKit
  try {
    const res = await fetch(`${process.env.BLUKIT_BASE_URL ?? 'https://blupix.app/api/blukit'}/token/${keeperId}`);
    if (res.ok) {
      const data = await res.json();
      newStage = data.stage;
    }
  } catch {
    // proceed without stage
  }

  if (newStage === null) return;

  const blockNumber = log.blockNumber;

  await sql`
    INSERT INTO chronicle_events
      (keeper_id, donor_id, new_stage, tx_hash, block_number, merged_at, selection_mode)
    VALUES
      (${keeperId}, ${donorId}, ${newStage}, ${txHash}, ${blockNumber}, ${blockTimestamp}, 'deterministic')
    ON CONFLICT (tx_hash) DO NOTHING
  `;

  console.log(`[merge-indexer] Recorded merge: keeper=${keeperId} donor=${donorId} T${newStage} tx=${txHash}`);

  // Queue enrichment async (fire and forget)
  enrichMerge({ keeperId, donorId, newStage, txHash }).catch(console.error);
}

async function poll() {
  const lastBlock = await getLastBlock();
  const currentBlock = await alchemy.core.getBlockNumber();

  if (currentBlock <= lastBlock) return;

  // Process in chunks of 2000 blocks
  const fromBlock = lastBlock + 1;
  const toBlock = Math.min(currentBlock, fromBlock + 2000);

  console.log(`[merge-indexer] Scanning blocks ${fromBlock}–${toBlock}`);

  const logs = await alchemy.core.getLogs({
    address: BLUPETS_CORE,
    topics: [TRANSFER_TOPIC],
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    const block = await alchemy.core.getBlock(log.blockNumber);
    const ts = new Date(block.timestamp * 1000);
    await processLog(log as unknown as Log, ts);
  }

  await saveLastBlock(toBlock);
}

async function run() {
  console.log('[merge-indexer] Starting…');
  while (true) {
    try {
      await poll();
    } catch (err) {
      console.error('[merge-indexer] Poll error:', err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

run();
