/**
 * Ownership indexer — indexes all ERC-721 Transfer events on
 * the Blupets Core contract into ownership_events.
 *
 * Run: npx ts-node --esm indexer/ownership-indexer.ts
 */

import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import sql from '../lib/db';

const BLUPETS_CORE = process.env.NEXT_PUBLIC_BLUPETS_CORE!;
const POLL_INTERVAL_MS = 30_000;
const CHUNK_SIZE = 2000;

const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY!,
  network: Network.ETH_MAINNET,
});

async function getLastBlock(): Promise<number> {
  const row = await sql`
    SELECT value FROM indexer_state WHERE key = 'ownership_indexer_last_block'
  `;
  return parseInt(row[0]?.value ?? '0', 10);
}

async function saveLastBlock(block: number) {
  await sql`
    UPDATE indexer_state SET value = ${String(block)}, updated_at = NOW()
    WHERE key = 'ownership_indexer_last_block'
  `;
}

async function poll() {
  const lastBlock = await getLastBlock();
  const currentBlock = await alchemy.core.getBlockNumber();
  if (currentBlock <= lastBlock) return;

  const fromBlock = lastBlock + 1;
  const toBlock = Math.min(currentBlock, fromBlock + CHUNK_SIZE);

  console.log(`[ownership-indexer] Scanning blocks ${fromBlock}–${toBlock}`);

  const logs = await alchemy.core.getLogs({
    address: BLUPETS_CORE,
    topics: [TRANSFER_TOPIC],
    fromBlock,
    toBlock,
  });

  for (const log of logs) {
    if (log.topics.length < 4) continue;

    const fromAddr = ethers.getAddress('0x' + log.topics[1].slice(26));
    const toAddr = ethers.getAddress('0x' + log.topics[2].slice(26));
    const tokenId = parseInt(log.topics[3], 16);

    const block = await alchemy.core.getBlock(log.blockNumber);
    const ts = new Date(block.timestamp * 1000);

    const fromAddress = fromAddr === '0x0000000000000000000000000000000000000000' ? null : fromAddr;

    await sql`
      INSERT INTO ownership_events
        (token_id, from_address, to_address, tx_hash, block_number, transferred_at)
      VALUES
        (${tokenId}, ${fromAddress}, ${toAddr}, ${log.transactionHash}, ${log.blockNumber}, ${ts})
      ON CONFLICT (tx_hash, token_id) DO NOTHING
    `;
  }

  await saveLastBlock(toBlock);
  console.log(`[ownership-indexer] Processed ${logs.length} transfers`);
}

async function run() {
  console.log('[ownership-indexer] Starting…');
  while (true) {
    try {
      await poll();
    } catch (err) {
      console.error('[ownership-indexer] Poll error:', err);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

run();
