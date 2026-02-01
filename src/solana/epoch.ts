import { Connection } from "@solana/web3.js";

export type EpochStatus = {
  epoch: number;
  slotIndex: number;
  slotsInEpoch: number;
  secsPerSlot: number;
  etaSeconds: number;
};

export async function fetchEpochStatus(conn: Connection): Promise<EpochStatus> {
  const [info, samples] = await Promise.all([
    conn.getEpochInfo(),
    conn.getRecentPerformanceSamples(3),
  ]);

  // Average seconds per slot from recent samples
  let secsPerSlot = 0.4; // fallback
  if (samples?.length) {
    const totalSlots = samples.reduce((sum, s) => sum + (s.numSlots ?? 0), 0);
    const totalSecs = samples.reduce((sum, s) => sum + (s.samplePeriodSecs ?? 0), 0);
    if (totalSlots > 0 && totalSecs > 0) secsPerSlot = totalSecs / totalSlots;
  }

  const remainingSlots = Math.max(0, info.slotsInEpoch - info.slotIndex);
  const etaSeconds = Math.round(remainingSlots * secsPerSlot);

  return {
    epoch: info.epoch,
    slotIndex: info.slotIndex,
    slotsInEpoch: info.slotsInEpoch,
    secsPerSlot,
    etaSeconds,
  };
}

export function formatHMS(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}
