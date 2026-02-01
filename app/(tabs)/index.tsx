import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";

import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { disconnectWallet } from "../../src/solana/disconnectWallet";
import { clearPubkey, loadPubkey } from "../../src/solana/session";
import { shortAddress } from "../../src/ui/walletUi";

import { useEpochCountdown } from "../../src/hooks/useEpochCountdown";
import { formatHMS } from "../../src/solana/epoch";

export default function HomeScreen() {
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { status, eta, error } = useEpochCountdown();

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      (async () => {
        const k = await loadPubkey();
        if (!alive) return;
        setPubkey(k);
        setReady(true);
      })();

      return () => {
        alive = false;
      };
    }, [])
  );

  if (!ready) return null;
  if (!pubkey) return <Redirect href="/welcome" />;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Epoch</ThemedText>

      {/* Wallet */}
      <ThemedText type="subtitle">Connected wallet</ThemedText>

      <Pressable
        onPress={async () => {
          await Clipboard.setStringAsync(pubkey);
          await Haptics.selectionAsync();
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        style={styles.addrWrap}
      >
        <ThemedText style={styles.addrText}>{shortAddress(pubkey)}</ThemedText>
        <ThemedText style={styles.addrHint}>
          {copied ? "Copied ✅" : "Tap to copy"}
        </ThemedText>
      </Pressable>

      <ThemedText style={styles.chip}>Connected</ThemedText>

      {/* Epoch countdown */}
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Epoch status</ThemedText>

        {status ? (
          <>
            <ThemedText style={styles.bigTimer}>{formatHMS(eta)}</ThemedText>
            <ThemedText style={styles.muted}>Epoch: {status.epoch}</ThemedText>
            <ThemedText style={styles.muted}>
              ~{status.secsPerSlot.toFixed(3)}s/slot
            </ThemedText>
          </>
        ) : error ? (
          <ThemedText style={[styles.muted, { color: "#ff8a8a" }]}>
            RPC error: {error}
          </ThemedText>
        ) : (
          <ThemedText style={styles.muted}>Loading epoch…</ThemedText>
        )}
      </ThemedView>

      {/* Disconnect */}
      <Pressable
        style={styles.disconnect}
        onPress={async () => {
          try {
            await disconnectWallet(); // revoke wallet auth
            await clearPubkey(); // clear local session
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            router.replace("/welcome");
          } catch (e: any) {
            Alert.alert("Disconnect failed", e?.message ?? String(e));
          }
        }}
      >
        <ThemedText type="defaultSemiBold">Disconnect</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
    gap: 12,
  },

  addrWrap: { marginTop: 8, gap: 6 },
  addrText: { fontSize: 22, fontFamily: "monospace" },
  addrHint: { opacity: 0.7 },

  chip: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(80,255,160,0.12)",
  },

  card: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  bigTimer: { fontSize: 34, fontFamily: "monospace" },
  muted: { opacity: 0.7 },

  disconnect: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,80,80,0.18)",
  },
});
