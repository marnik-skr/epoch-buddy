import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../solana/connection";

const STAKE_PROGRAM_ID = new PublicKey(
  "Stake11111111111111111111111111111111111111"
);

// Stake account layout (common offsets):
// - staker pubkey at offset 12
// - withdrawer pubkey at offset 44
const OFFSET_STAKER = 12;
const OFFSET_WITHDRAWER = 44;
const STAKE_ACCT_SIZE = 200;

// Returns lamports (sum of stake accounts controlled by this wallet)
export async function fetchNativeStakedSol(
  ownerPubkeyBase58: string
): Promise<number> {
  const connection = getConnection();
  const owner = new PublicKey(ownerPubkeyBase58);

  // We only need lamports, so slice out all data to keep payload tiny
  const dataSlice = { offset: 0, length: 0 as const };

  // Query stake accounts where wallet is staker
  const stakerAccounts = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
    dataSlice,
    filters: [
      { dataSize: STAKE_ACCT_SIZE },
      { memcmp: { offset: OFFSET_STAKER, bytes: owner.toBase58() } },
    ],
  });

  // Query stake accounts where wallet is withdrawer (can differ)
  const withdrawerAccounts = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
    dataSlice,
    filters: [
      { dataSize: STAKE_ACCT_SIZE },
      { memcmp: { offset: OFFSET_WITHDRAWER, bytes: owner.toBase58() } },
    ],
  });

  // Dedup by pubkey (some accounts match both filters)
  const map = new Map<string, number>();
  for (const a of stakerAccounts) map.set(a.pubkey.toBase58(), a.account.lamports);
  for (const a of withdrawerAccounts) map.set(a.pubkey.toBase58(), a.account.lamports);

  let total = 0;
  for (const lamports of map.values()) total += lamports;

  return total;
}
