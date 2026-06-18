export type AccessLevel = 'holder' | 'public';

export interface TierCapabilities {
  stage: number;
  label: string;           // T0–T4
  access: AccessLevel;     // who can chat
  maxTurns: number;        // per session
  maxResponseTokens: number;
  systemPromptDepth: 'cryptic' | 'self' | 'lineage' | 'scarce' | 'full';
  chronicleDepth: 'none' | 'self' | 'merge_tree' | 'full';
  ownershipDepth: 'none' | 'current' | 'count' | 'full';
  scarcityContext: boolean;
  holderCustomization: boolean;
  publicOraclePage: boolean;
}

const CAPABILITIES: Record<number, TierCapabilities> = {
  0: {
    stage: 0,
    label: 'T0',
    access: 'holder',
    maxTurns: 3,
    maxResponseTokens: 200,
    systemPromptDepth: 'cryptic',
    chronicleDepth: 'none',
    ownershipDepth: 'none',
    scarcityContext: false,
    holderCustomization: false,
    publicOraclePage: false,
  },
  1: {
    stage: 1,
    label: 'T1',
    access: 'holder',
    maxTurns: 10,
    maxResponseTokens: 500,
    systemPromptDepth: 'self',
    chronicleDepth: 'self',
    ownershipDepth: 'current',
    scarcityContext: false,
    holderCustomization: false,
    publicOraclePage: false,
  },
  2: {
    stage: 2,
    label: 'T2',
    access: 'holder',
    maxTurns: 20,
    maxResponseTokens: 1000,
    systemPromptDepth: 'lineage',
    chronicleDepth: 'merge_tree',
    ownershipDepth: 'current',
    scarcityContext: false,
    holderCustomization: false,
    publicOraclePage: false,
  },
  3: {
    stage: 3,
    label: 'T3',
    access: 'holder',
    maxTurns: 40,
    maxResponseTokens: 2000,
    systemPromptDepth: 'scarce',
    chronicleDepth: 'merge_tree',
    ownershipDepth: 'count',
    scarcityContext: true,
    holderCustomization: false,
    publicOraclePage: false,
  },
  4: {
    stage: 4,
    label: 'T4',
    access: 'public',
    maxTurns: Infinity,
    maxResponseTokens: 4000,
    systemPromptDepth: 'full',
    chronicleDepth: 'full',
    ownershipDepth: 'full',
    scarcityContext: true,
    holderCustomization: true,
    publicOraclePage: true,
  },
};

export function getTierCapabilities(stage: number): TierCapabilities {
  return CAPABILITIES[stage] ?? CAPABILITIES[0];
}

export function isPublicToken(stage: number): boolean {
  return getTierCapabilities(stage).access === 'public';
}

export function canViewFullOwnership(stage: number): boolean {
  return getTierCapabilities(stage).ownershipDepth === 'full';
}
