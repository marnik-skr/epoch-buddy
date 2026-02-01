import { useCallback, useEffect, useMemo, useState } from "react";
import { Connection } from "@solana/web3.js";
import { EpochStatus, fetchEpochStatus } from "../solana/epoch";

export function useEpochCountdown(
  rpcUrl = "https://api.mainnet-beta.solana.com"
) {
  const conn = useMemo(() => new Connection(rpcUrl, "confirmed"), [rpcUrl]);

  const [status, setStatus] = useState<EpochStatus | null>(null);
  const [eta, setEta] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);

  const [refreshTick, setRefreshTick] = useState(0);

  // ✅ exposed manual refresh
  const refresh = useCallback(() => {
    setRefreshTick((v) => v + 1);
  }, []);

  useEffect(() => {
    let alive = true;

    const fetchNow = async () => {
      try {
        setError(null);
        const s = await fetchEpochStatus(conn);
        if (!alive) return;

        setStatus(s);
        setEta(s.etaSeconds);
        setSecondsSinceUpdate(0);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? String(e));
        setStatus(null);
      }
    };

    fetchNow();
    const poll = setInterval(fetchNow, 30_000);

    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, [conn, refreshTick]);

  useEffect(() => {
    if (!status) return;

    const t = setInterval(() => {
      setEta((v) => Math.max(0, v - 1));
      setSecondsSinceUpdate((v) => v + 1);
    }, 1000);

    return () => clearInterval(t);
  }, [status]);

  return { status, eta, error, secondsSinceUpdate, refresh };
}
