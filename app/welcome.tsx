import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet } from "react-native";

import { connectWallet } from "../src/solana/connectWallet";
import { loadPubkey, savePubkey } from "../src/solana/session";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Welcome to Epoch Buddy</ThemedText>

      <Pressable
        style={styles.button}
        onPress={async () => {

          try {
            const pubkey = await connectWallet();
            console.log("WELCOME connected pubkey =", pubkey);

            await savePubkey(pubkey);

            const check = await loadPubkey();
            console.log("WELCOME after save loadPubkey() =", check);

            router.replace("/(tabs)");
          } catch (e: any) {
            console.log("WELCOME connect error =", e);
            Alert.alert("Connect failed", e?.message ?? String(e));
          }
        }}

      >
        <ThemedText type="defaultSemiBold">Connect Wallet</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 90,
    gap: 20,
  },
  button: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
});
