import bs58 from 'bs58';
import { Platform } from 'react-native';

type WalletWithAccounts = {
  getAccounts: () => Promise<{ address: Uint8Array }[]>;
};

export async function connectWallet(): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('Solana Mobile wallet connect is Android-only (Saga/Seeker).');
  }

  // Lazy import so iOS/Expo Go never tries to load the native module
  const { transact } = await import('@solana-mobile/mobile-wallet-adapter-protocol');

  return transact(async (wallet: unknown) => {
    const w = wallet as WalletWithAccounts;

    const accounts = await w.getAccounts();
    if (!accounts?.length) throw new Error('No accounts returned from wallet');

    return bs58.encode(accounts[0].address);
  });
}
