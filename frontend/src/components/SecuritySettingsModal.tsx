import { KeyRound, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getApiError } from "../services/api";
import { useCrypto } from "../hooks/useCrypto";
import { MIN_PASSPHRASE_LENGTH, validatePassphrase } from "../lib/crypto";

interface SecuritySettingsModalProps {
  onClose: () => void;
}

export const SecuritySettingsModal = ({ onClose }: SecuritySettingsModalProps) => {
  const { rotate } = useCrypto();
  const [currentPassphrase, setCurrentPassphrase] = useState("");
  const [nextPassphrase, setNextPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearFields = () => {
    setCurrentPassphrase("");
    setNextPassphrase("");
    setConfirmPassphrase("");
  };

  useEffect(() => () => clearFields(), []);

  const submit = async () => {
    setError("");
    setSuccess("");
    const validation = validatePassphrase(nextPassphrase);
    if (validation) {
      setError(validation);
      return;
    }
    if (nextPassphrase !== confirmPassphrase) {
      setError("New passphrases do not match.");
      return;
    }
    setBusy(true);
    try {
      await rotate(currentPassphrase, nextPassphrase);
      setSuccess("Passphrase updated. Your photos remain readable with the new passphrase.");
      setCurrentPassphrase("");
      setNextPassphrase("");
      setConfirmPassphrase("");
    } catch (rotateError) {
      setError(getApiError(rotateError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white p-7 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Security settings"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight">Change passphrase</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close security settings"
            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-500">
          Rotating your passphrase re-wraps your master key. Your encrypted photos stay readable and
          your recovery code is preserved.
        </p>
        <div className="mt-4 space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Current passphrase"
            value={currentPassphrase}
            onChange={(event) => setCurrentPassphrase(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder={`New passphrase (${MIN_PASSPHRASE_LENGTH}+ characters)`}
            value={nextPassphrase}
            onChange={(event) => setNextPassphrase(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400"
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new passphrase"
            value={confirmPassphrase}
            onChange={(event) => setConfirmPassphrase(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-400"
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {busy ? "Updating..." : "Update passphrase"}
        </button>
      </div>
    </div>
  );
};
