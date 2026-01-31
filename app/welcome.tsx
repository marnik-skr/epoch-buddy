import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { connectWallet } from '../src/solana/connectWallet';
import { savePubkey } from '../src/solana/session';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Welcome to Epoch Buddy</ThemedText>
      <ThemedText type="subtitle">Your Solana wallet, organised.</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">What you can do</ThemedText>
        <ThemedText>• Track epochs</ThemedText>
        <ThemedText>• Daily wallet check-ins</ThemedText>
        <ThemedText>• Smart reminders</ThemedText>
      </ThemedView>

      <Pressable
        style={styles.button}
        onPress={async () => {
          try {
            const pubkey = await connectWallet();

            await savePubkey(pubkey);
            router.replace('/');

            // optional:
            // Alert.alert('Connected!', pubkey);
          } catch (e: any) {
            Alert.alert('Connect failed', e?.message ?? String(e));
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
  card: {
    padding: 16,
    borderRadius: 14,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  button: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
