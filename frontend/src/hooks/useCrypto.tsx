import { useAuth } from "@clerk/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearDecryptionCache } from "../lib/decryption-cache";
import { cryptoApi, getApiError } from "../services/api";
import {
  generateMasterKey,
  generateRecoveryCode,
  unwrapMasterKey,
  unwrapMasterKeyWithRecovery,
  wrapMasterKey,
  zeroMasterKey,
  type MasterKey,
} from "../lib/crypto";
import type { KeyStatus } from "../types/photo";

type CryptoState =
  | "loading"
  | "needs-setup"
  | "locked"
  | "unlocked"
  | "needsRecoveryAck"
  | "error";

interface CryptoContextValue {
  state: CryptoState;
  error: string;
  masterKey: MasterKey | null;
  pendingRecoveryCode: string | null;
  hasRecovery: boolean;
  refresh: () => Promise<void>;
  setup: (passphrase: string, withRecovery: boolean) => Promise<void>;
  acknowledgeRecovery: () => void;
  unlock: (passphrase: string) => Promise<void>;
  unlockWithRecovery: (recoveryCode: string) => Promise<void>;
  rotate: (currentPassphrase: string, nextPassphrase: string) => Promise<void>;
  lock: () => void;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export const CryptoProvider = ({ children }: { children: ReactNode }) => {
  const { getToken, isSignedIn } = useAuth();
  const [state, setState] = useState<CryptoState>("loading");
  const [error, setError] = useState("");
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState<string | null>(null);
  const [hasRecovery, setHasRecovery] = useState(false);
  const masterKeyRef = useRef<MasterKey | null>(null);
  const [masterKey, setMasterKey] = useState<MasterKey | null>(null);

  const requireToken = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [getToken]);

  const applyUnlocked = useCallback((master: MasterKey) => {
    masterKeyRef.current = master;
    setMasterKey(master);
    setState("unlocked");
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const token = await requireToken();
      const status = await cryptoApi.getKeys(token);
      setHasRecovery(status.hasRecovery);
      if (masterKeyRef.current) {
        setState("unlocked");
        return;
      }
      setState(status.initialized ? "locked" : "needs-setup");
    } catch (refreshError) {
      setError(getApiError(refreshError));
      setState("error");
    }
  }, [requireToken]);

  const refresh = useCallback(async () => {
    setState("loading");
    setError("");
    await loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await loadStatus();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadStatus]);

  useEffect(() => {
    if (isSignedIn) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      zeroMasterKey(masterKeyRef.current);
      masterKeyRef.current = null;
      setMasterKey(null);
      clearDecryptionCache();
      setPendingRecoveryCode(null);
      setState("loading");
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const setup = useCallback(
    async (passphrase: string, withRecovery: boolean) => {
      const token = await requireToken();
      const master = await generateMasterKey();
      const recoveryCode = withRecovery ? generateRecoveryCode() : undefined;
      const wrapped = await wrapMasterKey(master, passphrase, recoveryCode);
      await cryptoApi.initKeys(token, wrapped);
      masterKeyRef.current = master;
      setMasterKey(master);
      setHasRecovery(Boolean(recoveryCode));
      if (recoveryCode) {
        setPendingRecoveryCode(recoveryCode);
        setState("needsRecoveryAck");
      } else {
        setState("unlocked");
      }
    },
    [requireToken],
  );

  const acknowledgeRecovery = useCallback(() => {
    setPendingRecoveryCode(null);
    setState("unlocked");
  }, []);

  const unlockWithStatus = useCallback(
    async (status: KeyStatus, unlocker: () => Promise<MasterKey>) => {
      if (
        !status.initialized ||
        !status.encryptedMasterKey ||
        !status.masterKeySalt ||
        !status.masterKeyIv ||
        !status.kdf
      ) {
        throw new Error("Encryption is not set up for this account");
      }
      const master = await unlocker();
      applyUnlocked(master);
    },
    [applyUnlocked],
  );

  const unlock = useCallback(
    async (passphrase: string) => {
      const token = await requireToken();
      const status = await cryptoApi.getKeys(token);
      setHasRecovery(status.hasRecovery);
      await unlockWithStatus(status, () =>
        unwrapMasterKey(passphrase, {
          encryptedMasterKey: status.encryptedMasterKey!,
          masterKeySalt: status.masterKeySalt!,
          masterKeyIv: status.masterKeyIv!,
          kdf: status.kdf!,
        }),
      );
    },
    [requireToken, unlockWithStatus],
  );

  const unlockWithRecovery = useCallback(
    async (recoveryCode: string) => {
      const token = await requireToken();
      const status = await cryptoApi.getKeys(token);
      if (!status.hasRecovery || !status.recoveryWrappedKey || !status.recoverySalt || !status.recoveryIv) {
        throw new Error("Recovery is not available for this account");
      }
      setHasRecovery(true);
      await unlockWithStatus(status, () =>
        unwrapMasterKeyWithRecovery(recoveryCode, {
          recoveryWrappedKey: status.recoveryWrappedKey!,
          recoverySalt: status.recoverySalt!,
          recoveryIv: status.recoveryIv!,
          kdf: status.kdf!,
        }),
      );
    },
    [requireToken, unlockWithStatus],
  );

  const rotate = useCallback(
    async (currentPassphrase: string, nextPassphrase: string) => {
      const token = await requireToken();
      const status = await cryptoApi.getKeys(token);
      const master = await unwrapMasterKey(currentPassphrase, {
        encryptedMasterKey: status.encryptedMasterKey!,
        masterKeySalt: status.masterKeySalt!,
        masterKeyIv: status.masterKeyIv!,
        kdf: status.kdf!,
      });
      const rewrapped = await wrapMasterKey(master, nextPassphrase);
      await cryptoApi.rotateKeys(token, rewrapped);
      applyUnlocked(master);
    },
    [requireToken, applyUnlocked],
  );

  const lock = useCallback(() => {
    zeroMasterKey(masterKeyRef.current);
    masterKeyRef.current = null;
    setMasterKey(null);
    clearDecryptionCache();
    setState("locked");
  }, []);

  const value = useMemo<CryptoContextValue>(
    () => ({
      state,
      error,
      masterKey,
      pendingRecoveryCode,
      hasRecovery,
      refresh,
      setup,
      acknowledgeRecovery,
      unlock,
      unlockWithRecovery,
      rotate,
      lock,
    }),
    [
      state,
      error,
      masterKey,
      pendingRecoveryCode,
      hasRecovery,
      refresh,
      setup,
      acknowledgeRecovery,
      unlock,
      unlockWithRecovery,
      rotate,
      lock,
    ],
  );

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
};

export const useCrypto = () => {
  const context = useContext(CryptoContext);
  if (!context) throw new Error("useCrypto must be used within a CryptoProvider");
  return context;
};

export const useMasterKey = (): MasterKey => {
  const { masterKey } = useCrypto();
  if (!masterKey) throw new Error("Master key is locked");
  return masterKey;
};
