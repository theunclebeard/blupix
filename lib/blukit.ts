const BASE = process.env.BLUKIT_BASE_URL ?? 'https://blupix.app/api/blukit';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BluToken {
  tokenId: number;
  owner: string;
  stage: number;           // 0=T0 1=T1 2=T2 3=T3 4=T4
  lineage: number;
  form: number;
  vibe: number;
  flags: number;
  locked: boolean;
  pending: boolean;
  requestId: string;
  indexedAt: string | null;
  stageLabel: string;
  lineageName: string;
  formName: string;
  vibeName: string;
  artKey: string;
  image: string;
  metadata: string;
}

export interface BluVibe {
  id: number;
  name: string;
  description: string;
  agentHint: string;
}

export interface BluVibesResponse {
  version: string;
  notes: string;
  vibes: BluVibe[];
}

export interface BluWalletInventory {
  wallet: string;
  count: number;
  tokens: BluToken[];
}

export interface BluTokenSearch {
  items: BluToken[];
  nextCursor: string | null;
}

export interface BluEvolutionFamily {
  id: number;
  pair: string[];
  name: string;
  color: string;
  t2: string[];
  t3: string[];
  t4: string;
}

export interface BluEvolutionMatrix {
  schemaVersion: string;
  principles: {
    t3Rule: string;
    t4Rule: string;
    keeperRule: string;
    randomnessRule: string;
  };
  families: BluEvolutionFamily[];
}

export interface BluEvolutionPreview {
  keeper: BluToken;
  donor: BluToken;
  possibleNext: Array<{
    stage: number;
    family: string;
    familyName: string;
    forms: string[];
    color: string;
  }>;
  note: string;
  matrix: string;
}

export interface BluStats {
  supply: number;
  indexed: number;
  stageCounts: Record<string, number>;
  locked: number;
  pending: number;
  latestIndexedAt: string;
  revealPaused: boolean;
  mergePaused: boolean;
}

// ─── Client ───────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`BluKit ${path}: ${err.error ?? res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const blukit = {
  token: (id: number) => get<BluToken>(`/token/${id}`),

  wallet: (address: string) => get<BluWalletInventory>(`/wallet/${address}`),

  vibes: () => get<BluVibesResponse>('/vibes'),

  stats: () => get<BluStats>('/stats'),

  evolutionMatrix: () => get<BluEvolutionMatrix>('/evolution/matrix'),

  evolutionPreview: (keeper: number, donor: number) =>
    get<BluEvolutionPreview>(`/evolution/preview?keeper=${keeper}&donor=${donor}`),

  tokens: (params: {
    owner?: string;
    stage?: number;
    lineage?: number;
    form?: number;
    vibe?: number;
    locked?: boolean;
    pending?: boolean;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    return get<BluTokenSearch>(`/tokens?${qs}`);
  },

  imageUrl: (id: number, size = 512) =>
    `${BASE}/token/${id}/image.png?size=${size}`,

  renderUrl: (key: string, size = 512) =>
    `${BASE}/render.png?key=${encodeURIComponent(key)}&size=${size}`,
};
