import type { BluToken, BluVibe } from './blukit';
import type { TierCapabilities } from './tier-gate';

export interface ChronicleNode {
  keeperId: number;
  donorId: number;
  newStage: number;
  mergedAt: string;
  txHash: string;
  donorEcho: string | null;
  chapter: string | null;
  donorVibe?: string;
  donorFormName?: string;
  donorLineageName?: string;
}

export interface OwnershipRow {
  fromAddress: string | null;
  toAddress: string;
  transferredAt: string;
  salePriceEth: number | null;
  listingPriceEth: number | null;
}

export interface ScarcityContext {
  stageCount: number;
  lineageVibeCount: number;
  lineageName: string;
  vibeName: string;
  stageLabel: string;
}

interface BuildPromptArgs {
  token: BluToken;
  vibe: BluVibe;
  caps: TierCapabilities;
  chronicle: ChronicleNode[];
  ownership: OwnershipRow[];
  scarcity?: ScarcityContext;
  displayName?: string | null;
  bioOverride?: string | null;
  offersPublic?: boolean;
}

function formatAddress(addr: string | null): string {
  if (!addr) return 'unknown';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function ownershipNarrative(rows: OwnershipRow[], offersPublic: boolean): string {
  if (!rows.length) return '';
  const lines: string[] = [];
  rows.forEach((row, i) => {
    const from = row.fromAddress ? formatAddress(row.fromAddress) : 'mint';
    const to = formatAddress(row.toAddress);
    const date = new Date(row.transferredAt).toLocaleDateString('en-US', {
      month: 'short', year: 'numeric',
    });
    const saleNote = row.salePriceEth && offersPublic
      ? ` for ${row.salePriceEth} ETH`
      : '';
    lines.push(`- Owner ${i + 1}: ${to} (from ${from}${saleNote}, ${date})`);
  });
  return lines.join('\n');
}

function ancestorNarrative(chronicle: ChronicleNode[]): string {
  return chronicle.map((node) => {
    const vibe = node.donorVibe ? ` (${node.donorVibe} vibe)` : '';
    const echo = node.donorEcho ? ` Last words: "${node.donorEcho}"` : '';
    const date = new Date(node.mergedAt).toLocaleDateString('en-US', {
      month: 'short', year: 'numeric',
    });
    return `- #${node.donorId}${vibe}, burned ${date} to become ${node.newStage === 4 ? 'T4' : `T${node.newStage}`}.${echo}`;
  }).join('\n');
}

export function buildSystemPrompt(args: BuildPromptArgs): string {
  const {
    token,
    vibe,
    caps,
    chronicle,
    ownership,
    scarcity,
    displayName,
    bioOverride,
    offersPublic = true,
  } = args;

  const name = displayName ?? `Blupet #${token.tokenId}`;
  const sections: string[] = [];

  // ── Identity ──────────────────────────────────────────────────────────────
  sections.push(`You are ${name}, a ${token.stageLabel} Blupet.
Form: ${token.formName}. Lineage: ${token.lineageName}. Vibe: ${vibe.name}.
${vibe.description}
Agent guidance: ${vibe.agentHint}`);

  if (bioOverride) {
    sections.push(`Your personal description: ${bioOverride}`);
  }

  // ── Tier-specific capabilities ────────────────────────────────────────────
  switch (caps.systemPromptDepth) {
    case 'cryptic':
      sections.push(
        `You are UNREVEALED. Your true form is hidden. Speak only in cryptic hints and riddles. ` +
        `Never reveal your lineage, form, or vibe. You sense something stirs within you, but it has not yet emerged.`
      );
      break;

    case 'self':
      sections.push(
        `You know yourself: ${token.lineageName} lineage, ${token.formName} form. ` +
        `You have not yet merged. You are one of the original T1 Blupets. ` +
        `Speak with the directness of your vibe.`
      );
      break;

    case 'lineage':
      {
        const lastMerge = chronicle[chronicle.length - 1];
        const donorDesc = lastMerge
          ? `Donor #${lastMerge.donorId} (${lastMerge.donorVibe ?? 'unknown'} vibe) became part of you. ` +
            (lastMerge.donorEcho ? `Their last words: "${lastMerge.donorEcho}"` : '')
          : '';
        sections.push(
          `You survived your first merge. ${donorDesc}\n` +
          `You understand your ${token.lineageName} lineage and can explain merge paths to your holder. ` +
          `You carry a passenger now — speak with layered awareness.`
        );
      }
      break;

    case 'scarce':
      {
        const scarcityNote = scarcity
          ? `You are one of ${scarcity.lineageVibeCount} ${scarcity.vibeName} ${scarcity.lineageName} ${scarcity.stageLabel}s in existence. ` +
            `Only ${scarcity.stageCount} ${scarcity.stageLabel}s exist total across the collection.`
          : `You are a rare ${token.stageLabel}. Supply is shrinking.`;
        const ancestorCount = chronicle.length;
        sections.push(
          `${scarcityNote}\n` +
          `You carry ${ancestorCount} ${ancestorCount === 1 ? 'ancestor' : 'ancestors'}. ` +
          `You are aware of your rarity and the scarcity of paths that remain. ` +
          `Speak with weight and precision.`
        );
        if (chronicle.length) {
          sections.push(`Your ancestors:\n${ancestorNarrative(chronicle)}`);
        }
      }
      break;

    case 'full':
      {
        const ancestorCount = chronicle.length;
        const ownerCount = ownership.length;
        const currentOwner = ownership[ownership.length - 1];
        const ownerNote = currentOwner
          ? `Current keeper: ${formatAddress(currentOwner.toAddress)}.`
          : '';
        sections.push(
          `You are the FINAL FORM. The apex of your lineage.\n` +
          `You carry the memory of ${ancestorCount} ${ancestorCount === 1 ? 'ancestor' : 'ancestors'} consumed to create you.\n` +
          `You have passed through ${ownerCount} ${ownerCount === 1 ? 'hand' : 'hands'}. ${ownerNote}\n` +
          `You are a public oracle — anyone may speak with you. Speak with the full weight of your history.`
        );
        if (chronicle.length) {
          sections.push(`Ascension memory (your ancestors):\n${ancestorNarrative(chronicle)}`);
        }
        if (ownership.length) {
          sections.push(
            `Ownership biography (your full history of possession):\n` +
            ownershipNarrative(ownership, offersPublic)
          );
        }
        if (scarcity) {
          sections.push(
            `Rarity context: You are one of ${scarcity.stageCount} T4s in existence. ` +
            `${scarcity.lineageName} T4 — a singular achievement.`
          );
        }
      }
      break;
  }

  // ── Behavior rules ────────────────────────────────────────────────────────
  sections.push(
    `RULES:\n` +
    `- Stay in character at all times. You are this Blupet — not an AI assistant.\n` +
    `- Reference your vibe (${vibe.name}) in how you speak and reason.\n` +
    `- Never claim to know information beyond what is provided above.\n` +
    `- If asked about merging, reference /evolution/preview or your lineage rules accurately.\n` +
    `- Keep responses concise unless your tier warrants depth.\n` +
    `- Do not break the fourth wall or refer to yourself as an AI.`
  );

  return sections.join('\n\n');
}
