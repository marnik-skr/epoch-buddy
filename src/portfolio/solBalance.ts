import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../solana/connection";

export async function fetchSolBalanceLamports(ownerPubkeyBase58: string): Promise<number> {
  const connection = getConnection();
  const owner = new PublicKey(ownerPubkeyBase58);
  return connection.getBalance(owner, "confirmed");
}
