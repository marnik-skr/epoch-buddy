import bs58 from 'bs58';
import { Platform } from 'react-native';

export async function connectWallet(): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('Solana Mobile wallet connect is Android-only (Saga/Seeker).');
  }

  // Lazy import so iOS never loads native stuff
  const { transact } = await import('@solana-mobile/mobile-wallet-adapter-protocol');

  return transact(async (wallet) => {
    // helps in dev builds during the app ↔ wallet handoff
    await new Promise((r) => setTimeout(r, 700));
  
    const auth = await wallet.authorize({
      cluster: 'mainnet-beta',
      identity: {
        name: 'Epoch Buddy',
        // keep it minimal for now (remove uri/icon)
      },
    });
  
    if (!auth.accounts?.length) throw new Error('No accounts returned from wallet');
  
    return bs58.encode(Uint8Array.from(auth.accounts[0].address as any));
  });
  
}
