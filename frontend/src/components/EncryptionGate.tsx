import { AlertTriangle, Copy, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useAuth, useUser } from "@clerk/react";
import { useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { getApiError, photoApi } from "../services/api";
import { useCrypto } from "../hooks/useCrypto";
import { MIN_PASSPHRASE_LENGTH, validatePassphrase } from "../lib/crypto";

const GateCard = ({ children }: { children: ReactNode }) => (
  <div className="w-full rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-sm">
    {children}
  </div>
);

const Shell = ({ embedded, children }: { embedded?: boolean; children: ReactNode }) => {
  if (embedded) return <GateCard>{children}</GateCard>;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6 text-slate-950">
      <GateCard>{children}</GateCard>
    </main>
  );
};

const PasswordInput = ({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-11 text-sm outline-none focus:border-violet-400"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide passphrase" : "Show passphrase"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

const RecoveryAckScreen = () => {
  const { pendingRecoveryCode, acknowledgeRecovery } = useCrypto();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!pendingRecoveryCode) return null;

  return (
    <Shell>
      <div className="mb-3 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-600">
        <AlertTriangle size={22} />
      </div>
      <h1 className="text-xl font-black tracking-tight">Save your recovery code</h1>
      <p className="mt-2 text-sm text-slate-500">
        This is the only way to recover your photos if you forget your passphrase. We cannot recover
        it for you. Store it somewhere safe before continuing.
      </p>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center font-mono text-sm font-semibold tracking-wider text-slate-800">
        {pendingRecoveryCode}
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(pendingRecoveryCode).then(() => setCopied(true));
        }}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Copy size={15} />
        {copied ? "Copied" : "Copy code"}
      </button>
      <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />
        I have saved this recovery code somewhere safe
      </label>
      <button
        type="button"
        disabled={!saved}
        onClick={acknowledgeRecovery}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
      >
        Continue to gallery
      </button>
    </Shell>
  );
};

const SetupForm = ({ onBrowse, embedded }: { onBrowse: boolean; embedded?: boolean }) => {
  const { setup } = useCrypto();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [withRecovery, setWithRecovery] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const validation = validatePassphrase(passphrase);
    if (validation) {
      setError(validation);
      return;
    }
    if (passphrase !== confirm) {
      setError("Passphrases do not match.");
      return;
    }
    setBusy(true);
    try {
      await setup(passphrase, withRecovery);
    } catch (setupError) {
      setError(getApiError(setupError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell embedded={embedded}>
      <div className="mb-3 inline-flex rounded-2xl bg-violet-100 p-3 text-violet-600">
        <ShieldCheck size={22} />
      </div>
      <h1 className="text-xl font-black tracking-tight">Set up encryption</h1>
      <p className="mt-2 text-sm text-slate-500">
        Pick a passphrase of at least {MIN_PASSPHRASE_LENGTH} characters. Everything is encrypted in
        your browser before upload and never leaves your device.
      </p>
      {onBrowse && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          You can browse existing photos below, but setup is required before uploading new encrypted
          photos.
        </p>
      )}
      <div className="mt-5 space-y-3">
        <PasswordInput
          value={passphrase}
          onChange={setPassphrase}
          placeholder="Encryption passphrase"
          autoComplete="new-password"
        />
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          placeholder="Confirm passphrase"
          autoComplete="new-password"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={withRecovery}
            onChange={(event) => setWithRecovery(event.target.checked)}
          />
          Generate a recovery code (recommended)
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
        {busy ? "Setting up..." : "Enable encryption"}
      </button>
    </Shell>
  );
};

const formatUnlockError = (unlockError: unknown) => {
  if (axios.isAxiosError(unlockError)) return getApiError(unlockError);
  if (unlockError instanceof DOMException && unlockError.name === "OperationError") {
    return "Incorrect passphrase or recovery code. Please try again.";
  }
  if (unlockError instanceof Error) {
    if (unlockError.message.includes("not set up")) return unlockError.message;
    if (unlockError.message.includes("Recovery")) return unlockError.message;
    if (unlockError.message.includes("Failed to download")) return unlockError.message;
    if (unlockError.message.includes("Not authenticated")) return unlockError.message;
    return "Incorrect passphrase or recovery code. Please try again.";
  }
  return "Something went wrong. Check your connection and try again.";
};

const UnlockForm = ({ embedded }: { embedded?: boolean }) => {
  const { unlock, unlockWithRecovery, hasRecovery } = useCrypto();
  const [mode, setMode] = useState<"passphrase" | "recovery">("passphrase");
  const [passphrase, setPassphrase] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      if (mode === "recovery") {
        await unlockWithRecovery(recoveryCode);
      } else {
        if (!passphrase) return;
        await unlock(passphrase);
      }
    } catch (unlockError) {
      setError(formatUnlockError(unlockError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell embedded={embedded}>
      <div className="mb-3 inline-flex rounded-2xl bg-violet-100 p-3 text-violet-600">
        <Lock size={22} />
      </div>
      <h1 className="text-xl font-black tracking-tight">Unlock your gallery</h1>
      <AccountHint />
      <p className="mt-2 text-sm text-slate-500">
        {mode === "passphrase"
          ? "Enter your encryption passphrase to decrypt your photos on this device."
          : "Enter the recovery code you saved during setup."}
      </p>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {mode === "passphrase" ? (
          <PasswordInput
            value={passphrase}
            onChange={setPassphrase}
            placeholder="Encryption passphrase"
            autoComplete="current-password"
          />
        ) : (
          <input
            type="text"
            autoComplete="off"
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
            value={recoveryCode}
            onChange={(event) => setRecoveryCode(event.target.value.toUpperCase())}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none focus:border-violet-400"
          />
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {busy ? "Unlocking..." : "Unlock"}
        </button>
        {hasRecovery && (
          <button
            type="button"
            onClick={() => {
              setMode(mode === "passphrase" ? "recovery" : "passphrase");
              setError("");
            }}
            className="w-full text-center text-sm font-semibold text-violet-600 hover:text-violet-700"
          >
            {mode === "passphrase" ? "Forgot passphrase? Use recovery code" : "Use passphrase instead"}
          </button>
        )}
      </form>
    </Shell>
  );
};

const GateBanner = ({ children, onAction, actionLabel, message }: {
  children: ReactNode;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) => (
  <div className="relative">
    <div className="sticky top-0 z-30 border-b border-violet-200 bg-violet-50/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-violet-900">{message}</p>
        <button
          type="button"
          onClick={onAction}
          className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
        >
          {actionLabel}
        </button>
      </div>
    </div>
    {children}
  </div>
);

export const EncryptionGate = ({ children }: { children: ReactNode }) => {
  const { getToken } = useAuth();
  const { state, error, refresh } = useCrypto();
  const [allowBrowse, setAllowBrowse] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  useEffect(() => {
    if (state !== "locked" && state !== "needs-setup") return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const data = await photoApi.list(token, 1, 24);
        if (!cancelled) {
          setAllowBrowse(data.photos.some((photo) => !photo.encrypted) || data.photos.length > 0);
        }
      } catch {
        if (!cancelled) setAllowBrowse(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state, getToken]);

  if (state === "unlocked") return <>{children}</>;
  if (state === "needsRecoveryAck") return <RecoveryAckScreen />;

  if (state === "loading") {
    return (
      <Shell>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Preparing secure gallery...
        </div>
      </Shell>
    );
  }

  if (state === "error") {
    return (
      <Shell>
        <div className="mb-3 inline-flex rounded-2xl bg-red-100 p-3 text-red-600">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-xl font-black tracking-tight">Could not load encryption</h1>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Retry
        </button>
      </Shell>
    );
  }

  if (state === "locked" && allowBrowse) {
    return (
      <>
        <GateBanner
          message="Your gallery is locked. Unlock to view encrypted photos and upload new ones."
          actionLabel="Unlock gallery"
          onAction={() => setShowUnlockModal(true)}
        >
          {children}
        </GateBanner>
        {showUnlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md">
              <UnlockForm embedded />
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="mt-3 w-full text-center text-sm font-semibold text-white"
              >
                Continue browsing
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (state === "needs-setup" && allowBrowse) {
    return (
      <>
        <GateBanner
          message="Set up encryption before uploading new photos. Existing photos remain visible below."
          actionLabel="Set up encryption"
          onAction={() => setShowSetupModal(true)}
        >
          {children}
        </GateBanner>
        {showSetupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md">
              <SetupForm onBrowse embedded />
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="mt-3 w-full text-center text-sm font-semibold text-white"
              >
                Continue browsing
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return state === "needs-setup" ? <SetupForm onBrowse={false} /> : <UnlockForm />;
};
