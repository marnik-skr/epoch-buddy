import { ThemedText } from "@/components/themed-text";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { connectWallet } from "../src/solana/connectWallet";
import { loadPubkey, savePubkey } from "../src/solana/session";

import Constants from "expo-constants";

import Logo from "../assets/brand/logo.svg";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [busy, setBusy] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    let alive = true;

    (async () => {
      const k = await loadPubkey();

      if (k) {
        router.replace("/(tabs)");
        return;
      }

      if (!alive) return;

      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    })();

    return () => {
      alive = false;
    };
  }, [fade, slide, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <LinearGradient
        colors={["#070b0a", "#0c1b14", "#070b0a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bg}
      >
        {/* blobs */}
        <View style={[styles.blob, styles.blobA]} />
        <View style={[styles.blob, styles.blobB]} />

        {/* content respects safe area, background stays full screen */}
        <View
          style={[
            styles.content,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
          ]}
        >
          <Animated.View
            style={[
              styles.card,
              { opacity: fade, transform: [{ translateY: slide }] },
            ]}
          >
            <Logo width={160} height={160} style={styles.logo} />

            <ThemedText type="title" style={styles.title}>
              Epoch Buddy
            </ThemedText>

            <ThemedText style={styles.subtitle}>
              Understand your Solana epoch at a glance.
            </ThemedText>

            <Pressable hitSlop={10}
              disabled={busy}
              style={({ pressed }) => [
                styles.button,
                busy && styles.buttonDisabled,
                pressed && !busy
                  ? { transform: [{ scale: 0.99 }], opacity: 0.92 }
                  : null,
              ]}
              onPress={async () => {
                try {
                  setBusy(true);
                  await Haptics.selectionAsync();

                  const pubkey = await connectWallet();
                  await savePubkey(pubkey);

                  await Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  router.replace("/(tabs)");
                } catch (e: any) {
                  Alert.alert("Connect failed", e?.message ?? String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? (
                <View style={styles.btnInner}>
                  <ActivityIndicator />
                  <ThemedText type="defaultSemiBold" style={styles.btnText}>
                    Connecting…
                  </ThemedText>
                </View>
              ) : (
                <ThemedText type="defaultSemiBold" style={styles.btnText}>
                  Connect Wallet
                </ThemedText>
              )}
            </Pressable>

            <ThemedText style={styles.signatureNote}>
              No funds moved. Signature only.
            </ThemedText>

            <ThemedText style={styles.hint}>
              Tip: pull down on the Epoch screen to refresh.
            </ThemedText>

            <ThemedText style={styles.version}>
              v{Constants.expoConfig?.version ?? "0.0.0"}
            </ThemedText>

          </Animated.View>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },

  card: {
    borderRadius: 18,
    padding: 18,
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  title: {
    alignSelf: "center", 
    marginBottom: 6,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.3,
  },

  subtitle: {
    alignSelf: "center", 
    opacity: 0.7,
    fontSize: 15,
    lineHeight: 21,
  },

  button: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "rgba(80,255,160,0.18)",
    borderWidth: 1,
    borderColor: "rgba(80,255,160,0.25)",
  },
  buttonDisabled: { opacity: 0.6 },

  btnInner: { flexDirection: "row", gap: 10, alignItems: "center" },
  btnText: { fontSize: 16 },

  signatureNote: { marginTop: -2, opacity: 0.65, fontSize: 12 },
  hint: { marginTop: 6, opacity: 0.6, fontSize: 12 },

  blob: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: "rgba(80,255,160,0.10)",
  },
  blobA: { top: 30, left: -110 },
  blobB: {
    bottom: 60,
    right: -120,
    backgroundColor: "rgba(120,160,255,0.08)",
  },

  version: {
    marginTop: 12,
    fontSize: 11,
    opacity: 0.25,
    textAlign: "center",
    fontFamily: "monospace",
  },

  logo: {
    alignSelf: "center", 
    marginBottom: 6,
    opacity: 0.92,
  },

  signatureNote: {
    marginTop: 6,
    opacity: 0.6,
    fontSize: 12,
    maxWidth: 260,
  },

  hint: {
    marginTop: 6,
    opacity: 0.55,
    fontSize: 12,
    maxWidth: 260,
  },

});
