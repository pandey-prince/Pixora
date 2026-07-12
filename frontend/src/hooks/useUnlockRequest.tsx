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
import { useCrypto } from "./useCrypto";

interface UnlockRequestContextValue {
  requestUnlock: () => Promise<void>;
  showUnlockModal: boolean;
  setShowUnlockModal: (open: boolean) => void;
  showSetupModal: boolean;
  setShowSetupModal: (open: boolean) => void;
}

const UnlockRequestContext = createContext<UnlockRequestContextValue | null>(null);

export const UnlockRequestProvider = ({ children }: { children: ReactNode }) => {
  const { state, isUnlocked } = useCrypto();
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const resolversRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!isUnlocked) return;
    for (const resolve of resolversRef.current) resolve();
    resolversRef.current = [];
    setShowUnlockModal(false);
    setShowSetupModal(false);
  }, [isUnlocked]);

  const requestUnlock = useCallback(() => {
    if (isUnlocked) return Promise.resolve();
    return new Promise<void>((resolve) => {
      resolversRef.current.push(resolve);
      if (state === "needs-setup") {
        setShowSetupModal(true);
      } else {
        setShowUnlockModal(true);
      }
    });
  }, [isUnlocked, state]);

  const value = useMemo(
    () => ({
      requestUnlock,
      showUnlockModal,
      setShowUnlockModal,
      showSetupModal,
      setShowSetupModal,
    }),
    [requestUnlock, showUnlockModal, showSetupModal],
  );

  return <UnlockRequestContext.Provider value={value}>{children}</UnlockRequestContext.Provider>;
};

export const useUnlockRequest = () => {
  const context = useContext(UnlockRequestContext);
  if (!context) throw new Error("useUnlockRequest must be used within UnlockRequestProvider");
  return context;
};
