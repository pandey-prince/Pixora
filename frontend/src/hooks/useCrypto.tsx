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
import { cryptoApi, getApiError } from "../services/api";
import {
  generateMasterKey,
  generateRecoveryCode,
  unwrapMasterKey,
  wrapMasterKey,
  type MasterKey,
} from "../lib/crypto";

type CryptoState = "loading" | "needs-setup" | "locked" | "unlocked" | "error";

interface CryptoContextValue {
  state: CryptoState;
  error: string;
  masterKey: MasterKey | null;
  refresh: () => Promise<void>;
  setup: (passphrase: string, withRecovery: boolean) => Promise<string | null>;
  unlock: (passphrase: string) => Promise<void>;
  rotate: (currentPassphrase: string, nextPassphrase: string) => Promise<void>;
  lock: () => void;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export const CryptoProvider = ({ children }: { children: ReactNode }) => {
  const { getToken } = useAuth();
  const [state, setState] = useState<CryptoState>("loading");
  const [error, setError] = useState("");
  const masterKeyRef = useRef<MasterKey | null>(null);
  const [masterKey, setMasterKey] = useState<MasterKey | null>(null);

  const requireToken = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [getToken]);

  const loadStatus = useCallback(async () => {
    try {
      const token = await requireToken();
      const status = await cryptoApi.getKeys(token);
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

  const setup = useCallback(
    async (passphrase: string, withRecovery: boolean) => {
      const token = await requireToken();
      const master = await generateMasterKey();
      const recoveryCode = withRecovery ? generateRecoveryCode() : undefined;
      const wrapped = await wrapMasterKey(master, passphrase, recoveryCode);
      await cryptoApi.initKeys(token, wrapped);
      masterKeyRef.current = master;
      setMasterKey(master);
      setState("unlocked");
      return recoveryCode ?? null;
    },
    [requireToken],
  );

  const unlock = useCallback(
    async (passphrase: string) => {
      const token = await requireToken();
      const status = await cryptoApi.getKeys(token);
      if (
        !status.initialized ||
        !status.encryptedMasterKey ||
        !status.masterKeySalt ||
        !status.masterKeyIv ||
        !status.kdf
      ) {
        throw new Error("Encryption is not set up for this account");
      }
      const master = await unwrapMasterKey(passphrase, {
        encryptedMasterKey: status.encryptedMasterKey,
        masterKeySalt: status.masterKeySalt,
        masterKeyIv: status.masterKeyIv,
        kdf: status.kdf,
      });
      masterKeyRef.current = master;
      setMasterKey(master);
      setState("unlocked");
    },
    [requireToken],
  );

  const rotate = useCallback(
    async (currentPassphrase: string, nextPassphrase: string) => {
      const token = await requireToken();
      const status = await cryptoApi.getKeys(token);
      if (
        !status.initialized ||
        !status.encryptedMasterKey ||
        !status.masterKeySalt ||
        !status.masterKeyIv ||
        !status.kdf
      ) {
        throw new Error("Encryption is not set up for this account");
      }
      const master = await unwrapMasterKey(currentPassphrase, {
        encryptedMasterKey: status.encryptedMasterKey,
        masterKeySalt: status.masterKeySalt,
        masterKeyIv: status.masterKeyIv,
        kdf: status.kdf,
      });
      const rewrapped = await wrapMasterKey(master, nextPassphrase);
      await cryptoApi.rotateKeys(token, rewrapped);
      masterKeyRef.current = master;
      setMasterKey(master);
      setState("unlocked");
    },
    [requireToken],
  );

  const lock = useCallback(() => {
    masterKeyRef.current = null;
    setMasterKey(null);
    setState("locked");
  }, []);

  const value = useMemo<CryptoContextValue>(
    () => ({ state, error, masterKey, refresh, setup, unlock, rotate, lock }),
    [state, error, masterKey, refresh, setup, unlock, rotate, lock],
  );

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
};

export const useCrypto = () => {
  const context = useContext(CryptoContext);
  if (!context) throw new Error("useCrypto must be used within a CryptoProvider");
  return context;
};

/** Convenience hook for code paths that require an unlocked master key. */
export const useMasterKey = (): MasterKey => {
  const { masterKey } = useCrypto();
  if (!masterKey) throw new Error("Master key is locked");
  return masterKey;
};
