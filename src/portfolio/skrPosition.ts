import { fetchSkrBalance } from "./skrBalance";

export type SkrPosition = {
  balance: number;          // liquid SKR in wallet
  staked: number | null;    // staked SKR (TODO: wire source)
  rewardsEarned: number | null; // lifetime rewards (TODO: wire source)
};

export async function fetchSkrPosition(ownerPubkeyBase58: string): Promise<SkrPosition> {
  const balance = await fetchSkrBalance(ownerPubkeyBase58);

  // TODO: wire these from Solana Mobile Guardian staking source
  // (program account / indexer / API)
  const staked: number | null = null;
  const rewardsEarned: number | null = null;

  return { balance, staked, rewardsEarned };
}
