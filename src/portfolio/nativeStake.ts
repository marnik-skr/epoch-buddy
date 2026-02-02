import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../solana/connection";

const STAKE_PROGRAM_ID = new PublicKey(
  "Stake11111111111111111111111111111111111111"
);

const OFFSET_STAKER = 12;
const OFFSET_WITHDRAWER = 44;
const STAKE_ACCT_SIZE = 200;

export async function fetchNativeStakedSol(
  ownerPubkeyBase58: string
): Promise<number> {
  const connection = getConnection();
  const owner = new PublicKey(ownerPubkeyBase58);

  const dataSlice = { offset: 0, length: 0 as const };

  const stakerAccounts = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
    dataSlice,
    filters: [
      { dataSize: STAKE_ACCT_SIZE },
      { memcmp: { offset: OFFSET_STAKER, bytes: owner.toBase58() } },
    ],
  });

  const withdrawerAccounts = await connection.getProgramAccounts(STAKE_PROGRAM_ID, {
    dataSlice,
    filters: [
      { dataSize: STAKE_ACCT_SIZE },
      { memcmp: { offset: OFFSET_WITHDRAWER, bytes: owner.toBase58() } },
    ],
  });

  const map = new Map<string, number>();
  for (const a of stakerAccounts) map.set(a.pubkey.toBase58(), a.account.lamports);
  for (const a of withdrawerAccounts) map.set(a.pubkey.toBase58(), a.account.lamports);

  let total = 0;
  for (const lamports of map.values()) total += lamports;

  return total;
}
