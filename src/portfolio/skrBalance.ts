import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../solana/connection";

const SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");

export async function fetchSkrBalance(ownerPubkeyBase58: string): Promise<number> {
  const connection = getConnection();
  const owner = new PublicKey(ownerPubkeyBase58);

  const res = await connection.getParsedTokenAccountsByOwner(owner, { mint: SKR_MINT });

  let total = 0;
  for (const a of res.value) {
    total += a.account.data.parsed.info.tokenAmount.uiAmount ?? 0;
  }
  return total;
}
