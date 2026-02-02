import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useFocusEffect } from "@react-navigation/native";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";

import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";

import { connectWallet } from "../../src/solana/connectWallet";
import { disconnectWallet } from "../../src/solana/disconnectWallet";
import { clearPubkey, loadPubkey, savePubkey } from "../../src/solana/session";
import { useEpochCountdown } from "../../src/hooks/useEpochCountdown";
import { formatHMS } from "../../src/solana/epoch";
import { shortAddress } from "../../src/ui/walletUi";
import {
  clearEpochNotifications,
  scheduleEpochNotifications,
} from "../../src/notifications/epochNotifications";

const NOTIF_1H_KEY = "epochbuddy_notify_1h";
const NOTIF_END_KEY = "epochbuddy_notify_end";

type PermStatus = "granted" | "denied" | "undetermined";

export default function HomeScreen() {
  const router = useRouter();

  const [showEpochInfo, setShowEpochInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pubkey, setPubkey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const { status, eta, error, secondsSinceUpdate, refresh: refreshEpoch } =
    useEpochCountdown();

  const [notify1h, setNotify1h] = useState(false);
  const [notifyEnd, setNotifyEnd] = useState(false);
  const [notifPerm, setNotifPerm] = useState<PermStatus>("undetermined");

  const [refreshing, setRefreshing] = useState(false);

  const reschedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress =
    status && status.slotsInEpoch > 0 ? status.slotIndex / status.slotsInEpoch : 0;
  const progressPct = Math.max(0, Math.min(1, progress));
  const progressLabel = `${(progressPct * 100).toFixed(1)}%`;
  const nextEpochAt = new Date(Date.now() + eta * 1000).toLocaleTimeString(
    undefined,
    { hour: "2-digit", minute: "2-digit" }
  );

  const refreshNotifPerm = useCallback(async () => {
    const perm = await Notifications.getPermissionsAsync();
    setNotifPerm(perm.status as PermStatus);
    return perm.status as PermStatus;
  }, []);

  const ensureNotifPerm = async () => {
  if (notifPerm === "granted") return true;

  const res = await Notifications.requestPermissionsAsync();
    setNotifPerm(res.status as PermStatus);

    if (res.status !== "granted") {
      Alert.alert(
        "Notifications disabled",
        "Enable notifications in system settings to receive alerts."
      );
      return false;
    }

    return true;
  };


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

  useEffect(() => {
    (async () => {
      const a = await SecureStore.getItemAsync(NOTIF_1H_KEY);
      const b = await SecureStore.getItemAsync(NOTIF_END_KEY);
      if (a != null) setNotify1h(a === "1");
      if (b != null) setNotifyEnd(b === "1");
      await refreshNotifPerm();
    })();
  }, [refreshNotifPerm]);

  useFocusEffect(
    useCallback(() => {
      refreshNotifPerm();
    }, [refreshNotifPerm])
  );

  const rescheduleEpochNotifs = useCallback(
    async (reason: string, next1h: boolean, nextEnd: boolean) => {
      if (!status) return;

      // persist toggles (so they survive reloads)
      await SecureStore.setItemAsync(NOTIF_1H_KEY, next1h ? "1" : "0");
      await SecureStore.setItemAsync(NOTIF_END_KEY, nextEnd ? "1" : "0");

      const p = await refreshNotifPerm();
      if (p !== "granted") {
        // keep things tidy
        await clearEpochNotifications();
        return;
      }

      if (!next1h && !nextEnd) {
        await clearEpochNotifications();
        return;
      }

      const ids = await scheduleEpochNotifications({
        etaSeconds: eta,
        epoch: status.epoch,
        notifyAtOneHour: next1h,
        notifyAtEnd: nextEnd,
      });

      if (__DEV__) console.log("NOTIFS rescheduled:", reason, ids.length);
    },
    [status, eta, refreshNotifPerm]
  );

  const scheduleDebounced = useCallback(
    (reason: string, next1h: boolean, nextEnd: boolean) => {
      if (reschedTimerRef.current) clearTimeout(reschedTimerRef.current);
      reschedTimerRef.current = setTimeout(() => {
        rescheduleEpochNotifs(reason, next1h, nextEnd);
      }, 250);
    },
    [rescheduleEpochNotifs]
  );

  useEffect(() => {
    if (!status) return;
    if (secondsSinceUpdate !== 0) return;

    scheduleDebounced("epoch-refresh", notify1h, notifyEnd);

    return () => {
      if (reschedTimerRef.current) clearTimeout(reschedTimerRef.current);
    };
  }, [status?.epoch, secondsSinceUpdate, notify1h, notifyEnd, scheduleDebounced, status]);

  const refreshAll = useCallback(async () => {
    try {
      setRefreshing(true);

      const k = await loadPubkey();
      setPubkey(k);

      await refreshEpoch?.();
      await Haptics.selectionAsync();

      scheduleDebounced("pull-to-refresh", notify1h, notifyEnd);
    } finally {
      setRefreshing(false);
    }
  }, [refreshEpoch, notify1h, notifyEnd, scheduleDebounced]);

  if (!ready) return null;
  if (!pubkey) return <Redirect href="/welcome" />;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
      }
    >
      <ThemedText type="title">Epoch</ThemedText>

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

      <ThemedView style={styles.card}>
        <View style={styles.cardHeader}>
          <ThemedText type="subtitle">Current Epoch</ThemedText>
          <Pressable
            onPress={() => setShowEpochInfo(true)}
            hitSlop={10}
            style={styles.infoBtn}
          >
            <ThemedText style={styles.infoBtnText}>i</ThemedText>
          </Pressable>
        </View>

        {status ? (
          <>
            <ThemedText style={styles.bigTimer}>{formatHMS(eta)}</ThemedText>
            <ThemedText style={styles.updatedText}>
              Updated {secondsSinceUpdate}s ago • Next epoch ~{nextEpochAt}
            </ThemedText>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progressPct * 100)}%` },
                ]}
              />
            </View>

            <ThemedText style={styles.muted}>
              {progressLabel} • Epoch {status.epoch} • Slot {status.slotIndex} /{" "}
              {status.slotsInEpoch}
            </ThemedText>

            <ThemedText style={styles.slot}>
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

      <Modal
        visible={showEpochInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEpochInfo(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowEpochInfo(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <ThemedText type="title">What’s an epoch?</ThemedText>
            <ThemedText style={styles.modalText}>
              A Solana epoch is a time window made of many slots. During an epoch,
              validators earn rewards and the network tracks performance.
            </ThemedText>
            <ThemedText style={styles.modalText}>
              • The big timer is an estimate for when the next epoch starts.
            </ThemedText>
            <ThemedText style={styles.modalText}>
              • The bar shows how far we are through the current epoch (by slot count).
            </ThemedText>
            <Pressable
              onPress={() => setShowEpochInfo(false)}
              style={styles.modalClose}
            >
              <ThemedText type="defaultSemiBold">Got it</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Notifications</ThemedText>

      <View style={styles.row}>
        <ThemedText>1 hour left</ThemedText>
        <Switch
          value={notify1h}
          onValueChange={async (v) => {
            if (v) {
              const ok = await ensureNotifPerm();
              if (!ok) {
                setNotify1h(false);
                return;
              }
            }
            const next1h = v;
            const nextEnd = notifyEnd;
            setNotify1h(next1h);
            scheduleDebounced("toggle-1h", next1h, nextEnd);
          }}
        />
      </View>

      <View style={styles.row}>
        <ThemedText>Epoch end</ThemedText>
        <Switch
          value={notifyEnd}
          onValueChange={async (v) => {
            if (v) {
              const ok = await ensureNotifPerm();
              if (!ok) {
                setNotifyEnd(false);
                return;
              }
            }
            const nextEnd = v;
            const next1h = notify1h;
            setNotifyEnd(nextEnd);
            scheduleDebounced("toggle-end", next1h, nextEnd);
          }}
        />
      </View>


        {notifPerm === "denied" && (
          <ThemedText style={styles.muted}>
            Enable notifications in system settings to receive alerts.
          </ThemedText>
        )}

      </ThemedView>

      <Pressable
        style={styles.switchWallet}
        onPress={async () => {
          try {
            await disconnectWallet();
            await clearPubkey();
            const next = await connectWallet();
            await savePubkey(next);
            setPubkey(next);
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
          } catch (e: any) {
            Alert.alert("Switch wallet failed", e?.message ?? String(e));
          }
        }}
      >
        <ThemedText type="defaultSemiBold">Switch wallet</ThemedText>
      </Pressable>

      <Pressable
        style={styles.disconnect}
        onPress={async () => {
          try {
            await disconnectWallet();
            await clearPubkey();
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  bigTimer: { fontSize: 34, fontFamily: "monospace" },
  muted: { opacity: 0.7 },
  updatedText: { opacity: 0.65, marginTop: -2 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  infoBtnText: { opacity: 0.85, fontFamily: "monospace" },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.10)",
    marginTop: 6,
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "rgba(80,255,160,0.35)",
  },
  modalOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    backgroundColor: "rgba(30,30,30,0.96)",
  },
  modalText: { opacity: 0.85, lineHeight: 20 },
  modalClose: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  disconnect: {
    marginTop: 24,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,80,80,0.18)",
  },
  switchWallet: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  slot: {
    fontSize: 11,
    opacity: 0.55,
    marginTop: 2,
    letterSpacing: 0.2,
  }
});
