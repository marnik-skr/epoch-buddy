import { fetchSkrBalance } from "./skrBalance";

export type SkrPosition = {
  balance: number;
  staked: number | null;
  rewardsEarned: number | null;
};

export async function fetchSkrPosition(ownerPubkeyBase58: string): Promise<SkrPosition> {
  const balance = await fetchSkrBalance(ownerPubkeyBase58);
  return {
    balance,
    staked: null,        // TODO: wire once we find on-chain source
    rewardsEarned: null, // TODO: wire once we find on-chain source
  };
}
