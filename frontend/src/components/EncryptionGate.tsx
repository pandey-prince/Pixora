import { AlertTriangle, Copy, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { getApiError } from "../services/api";
import { useCrypto } from "../hooks/useCrypto";

const Shell = ({ children }: { children: ReactNode }) => (
  <main className="grid min-h-screen place-items-center bg-[#f8f7f4] px-4 text-slate-950">
    <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-sm">
      {children}
    </div>
  </main>
);

const SetupForm = () => {
  const { setup } = useCrypto();
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [withRecovery, setWithRecovery] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    setError("");
    if (passphrase.length < 8) {
      setError("Use a passphrase of at least 8 characters.");
      return;
    }
    if (passphrase !== confirm) {
      setError("Passphrases do not match.");
      return;
    }
    setBusy(true);
    try {
      const code = await setup(passphrase, withRecovery);
      if (code) setRecoveryCode(code);
    } catch (setupError) {
      setError(getApiError(setupError));
    } finally {
      setBusy(false);
    }
  };

  if (recoveryCode) {
    return (
      <Shell>
        <div className="mb-3 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-600">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-xl font-black tracking-tight">Save your recovery code</h1>
        <p className="mt-2 text-sm text-slate-500">
          This is the only way to recover your photos if you forget your passphrase. We cannot
          recover it for you. Store it somewhere safe.
        </p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center font-mono text-sm font-semibold tracking-wider text-slate-800">
          {recoveryCode}
        </div>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(recoveryCode);
            setCopied(true);
          }}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Copy size={15} />
          {copied ? "Copied" : "Copy code"}
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">
          Your gallery is ready. This code will not be shown again.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-3 inline-flex rounded-2xl bg-violet-100 p-3 text-violet-600">
        <ShieldCheck size={22} />
      </div>
      <h1 className="text-xl font-black tracking-tight">Set up encryption</h1>
      <p className="mt-2 text-sm text-slate-500">
        Pick a passphrase to protect your photos. Everything is encrypted in your browser before
        upload, so this passphrase never leaves your device and cannot be reset by us.
      </p>
      <div className="mt-5 space-y-3">
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Encryption passphrase"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400"
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Confirm passphrase"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400"
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

const UnlockForm = () => {
  const { unlock } = useCrypto();
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!passphrase) return;
    setBusy(true);
    try {
      await unlock(passphrase);
    } catch {
      setError("Incorrect passphrase. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="mb-3 inline-flex rounded-2xl bg-violet-100 p-3 text-violet-600">
        <Lock size={22} />
      </div>
      <h1 className="text-xl font-black tracking-tight">Unlock your gallery</h1>
      <p className="mt-2 text-sm text-slate-500">
        Enter your encryption passphrase to decrypt your photos on this device.
      </p>
      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Encryption passphrase"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {busy ? "Unlocking..." : "Unlock"}
        </button>
      </form>
    </Shell>
  );
};

export const EncryptionGate = ({ children }: { children: ReactNode }) => {
  const { state, error, refresh } = useCrypto();

  if (state === "unlocked") return <>{children}</>;

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

  return state === "needs-setup" ? <SetupForm /> : <UnlockForm />;
};
