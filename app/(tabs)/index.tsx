import { Image } from 'expo-image';
import { Platform, StyleSheet } from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Epoch Buddy</ThemedText>
      <ThemedText type="subtitle">Your Solana wallet, organised.</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Wallet Snapshot</ThemedText>
        <ThemedText>Balance: —</ThemedText>
        <ThemedText>Epoch: —</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="defaultSemiBold">Daily Check-In</ThemedText>
        <ThemedText>Coming next 👀</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});

