'use client';

import { useAccount } from 'wagmi';
import { AgentChat } from '@/components/AgentChat';

interface AgentChatWrapperProps {
  tokenId: number;
  stage: number;
  vibeName: string;
  displayName?: string | null;
}

export function AgentChatWrapper({ tokenId, stage, vibeName, displayName }: AgentChatWrapperProps) {
  const { address } = useAccount();
  return (
    <AgentChat
      tokenId={tokenId}
      stage={stage}
      vibeName={vibeName}
      displayName={displayName}
      walletAddress={address}
    />
  );
}
