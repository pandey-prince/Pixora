import type { MasterKey } from "./crypto";
import { zeroMasterKey } from "./crypto";

let vaultMasterKey: MasterKey | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

export const isVaultUnlocked = () => vaultMasterKey !== null;

export const getVaultMasterKey = (): MasterKey | null => vaultMasterKey;

export const requireVaultMasterKey = (): MasterKey => {
  if (!vaultMasterKey) throw new Error("Gallery is locked");
  return vaultMasterKey;
};

export const setVaultMasterKey = (master: MasterKey | null) => {
  if (vaultMasterKey) zeroMasterKey(vaultMasterKey);
  vaultMasterKey = master;
  notify();
};

export const subscribeVault = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const clearVault = () => {
  setVaultMasterKey(null);
};
