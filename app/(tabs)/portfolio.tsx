import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Linking,
} from "react-native";
import { loadPubkey } from "../../src/solana/session";
import { shortAddress } from "../../src/ui/walletUi";
import { fetchSolBalanceLamports } from "../../src/portfolio/solBalance";
import { fetchNativeStakedSol } from "../../src/portfolio/nativeStake";
import { fetchSkrPosition } from "../../src/portfolio/skrPosition";

const SKR_STAKE_URL = "https://stake.solanamobile.com";

function is429(e: any) {
  const msg = e?.message ?? String(e);
  return msg.includes("429") || msg.toLowerCase().includes("too many requests");
}

async function withBackoff<T>(fn: () => Promise<T>, tries = 2) {
  let delay = 650;
  for (let i = 0; i <= tries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (!is429(e) || i === tries) throw e;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
  
  return await fn();
}

export default function PortfolioScreen() {
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


  const [sol, setSol] = useState<number | null>(null);
  const [stakedSol, setStakedSol] = useState<number | null>(null);


  const [skr, setSkr] = useState<number | null>(null);
  const [skrStaked, setSkrStaked] = useState<number | null>(null);
  const [skrRewards, setSkrRewards] = useState<number | null>(null);

  const [err, setErr] = useState<string | null>(null);

  const inFlightRef = useRef(false);

  const lastFetchMsRef = useRef(0);
  const COOLDOWN_MS = 15_000;

  const SOFT_REFRESH_MS = 30_000;

  const refresh = useCallback(async (force = false) => {
    if (inFlightRef.current) return;

    const now = Date.now();
    if (!force && now - lastFetchMsRef.current < COOLDOWN_MS) return;

    inFlightRef.current = true;
    lastFetchMsRef.current = now;

    try {
      setRefreshing(true);
      setErr(null);

      const k = await loadPubkey();
      setPubkey(k);
      if (!k) return;

      const solLamports = await withBackoff(() => fetchSolBalanceLamports(k), 2);
      setSol(solLamports / 1e9);

      const stakedLamports = await withBackoff(() => fetchNativeStakedSol(k), 2);
      setStakedSol(stakedLamports / 1e9);

      const skrPos = await withBackoff(() => fetchSkrPosition(k), 1);
      setSkr(skrPos.balance);
      setSkrStaked(skrPos.staked);
      setSkrRewards(skrPos.rewardsEarned);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg.includes("429") || msg.toLowerCase().includes("too many requests")) {
        setErr("RPC rate limited (429). Pull to refresh in a few seconds.");
      } else {
        setErr(msg);
      }
    } finally {
      setRefreshing(false);
      setReady(true);
      inFlightRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      
      if (now - lastFetchMsRef.current > SOFT_REFRESH_MS) {
        refresh(false);
      }
    }, [refresh])
  );

  const openSkrStake = useCallback(async () => {
    try {
      await Linking.openURL(SKR_STAKE_URL);
    } catch {
      setErr("Couldn't open SKR staking site.");
    }
  }, []);

  if (!ready) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <ThemedText type="title">Portfolio</ThemedText>
        <ThemedText style={styles.muted}>Loading…</ThemedText>
      </ScrollView>
    );
  }

  if (!pubkey) return <Redirect href="/welcome" />;

  // --- Insights (derived, free, no extra APIs) ---
  const solBalance = sol ?? 0;
  const solStaked = stakedSol ?? 0;
  const totalSol = solBalance + solStaked;
  const stakedPct = totalSol > 0 ? solStaked / totalSol : 0;

  const DEFAULT_SOL_APY = 0.07; // 7% est
  const EPOCH_DAYS_EST = 2; // ~2 days; varies
  const epochsPerYearEst = 365 / EPOCH_DAYS_EST;
  const estSolPerEpoch = solStaked * (DEFAULT_SOL_APY / epochsPerYearEst);

  const RENT_BUFFER_SOL = 0.005; // conservative buffer
  const stakeableIdleSol = Math.max(0, solBalance - RENT_BUFFER_SOL);
  const showIdleWarning = stakeableIdleSol >= 0.01;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => refresh(true)} />
      }
    >
      <ThemedText type="title">Portfolio</ThemedText>
      <ThemedText style={styles.muted}>Wallet: {shortAddress(pubkey)}</ThemedText>

      {err ? (
        <ThemedText style={[styles.muted, { color: "#ff8a8a" }]}>{err}</ThemedText>
      ) : null}

      {/* Insights */}
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Insights</ThemedText>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Staked %</ThemedText>
          <ThemedText style={styles.value}>
            {totalSol > 0 ? `${(stakedPct * 100).toFixed(0)}%` : "—"}
          </ThemedText>
        </View>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Est. rewards / epoch</ThemedText>
          <ThemedText style={styles.value}>
            {stakedSol == null ? "…" : `${estSolPerEpoch.toFixed(6)} SOL`}
          </ThemedText>
        </View>

        {showIdleWarning ? (
          <ThemedText style={[styles.muted, { color: "#ffd28a" }]}>
            ⚠️ You have ~{stakeableIdleSol.toFixed(4)} SOL idle (not earning).
          </ThemedText>
        ) : (
          <ThemedText style={styles.muted}>✅ Little/no idle SOL</ThemedText>
        )}

        <ThemedText style={styles.muted}>
          Estimates only (APY & epoch length vary).
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">SOL</ThemedText>
        
        <View style={styles.row}>
          <ThemedText style={styles.muted}>Unstaked</ThemedText>
          <ThemedText style={styles.value}>
            {sol == null ? "…" : `${sol.toFixed(4)} SOL`}
          </ThemedText>
        </View>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Staked</ThemedText>
          <ThemedText style={styles.value}>
            {stakedSol == null ? "…" : `${stakedSol.toFixed(4)} SOL`}
          </ThemedText>
        </View>

      </ThemedView>

      <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="subtitle">SKR</ThemedText>
          <Pressable onPress={openSkrStake} style={styles.linkBtn} hitSlop={10}>
            <ThemedText style={styles.linkText}>Open staking</ThemedText>
          </Pressable>
        </View>

        <View style={styles.row}>
          <ThemedText style={styles.muted}>Unstaked</ThemedText>
          <ThemedText style={styles.value}>
            {skr == null ? "…" : `${skr.toLocaleString()} SKR`}
          </ThemedText>
        </View>

        <View style={styles.row}>
          {skrStaked != null ? (
            <View style={styles.row}>
              <ThemedText style={styles.muted}>Staked</ThemedText>
              <ThemedText style={styles.value}>
                {`${skrStaked.toLocaleString()} SKR`}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.row}>
         {skrRewards != null ? (
            <View style={styles.row}>
              <ThemedText style={styles.muted}>Rewards earned</ThemedText>
              <ThemedText style={styles.value}>
                {`+ ${skrRewards.toLocaleString()} SKR`}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingTop: 70, gap: 12 },
  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  linkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  linkText: {
    fontSize: 12,
    opacity: 0.9,
    fontFamily: "monospace",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  value: { fontFamily: "monospace", fontSize: 16 },
  muted: { opacity: 0.7 },
});
