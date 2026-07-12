import { Camera } from "lucide-react";
import { useAuth } from "@clerk/react";
import { Link } from "react-router-dom";

export const SiteFooter = () => {
  const { isSignedIn } = useAuth();

  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5 font-bold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white">
              <Camera size={16} />
            </span>
            Pixora
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
            A private, end-to-end encrypted photo gallery. Your images are encrypted in your browser
            before upload — we never see your passphrase or raw photos.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Explore</p>
          <ul className="mt-4 space-y-2 text-sm font-medium text-slate-700">
            <li><Link to="/" className="transition hover:text-violet-600">Home</Link></li>
            {isSignedIn ? (
              <li><Link to="/gallery" className="transition hover:text-violet-600">My gallery</Link></li>
            ) : (
              <>
                <li><Link to="/login" className="transition hover:text-violet-600">Sign in</Link></li>
                <li><Link to="/signup" className="transition hover:text-violet-600">Create account</Link></li>
              </>
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Privacy</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>Client-side encryption before every upload</li>
            <li>Passphrase never sent to our servers</li>
            <li>Recovery code stored only by you</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 px-5 py-5 text-center text-xs text-slate-400 sm:px-8">
        © 2026 Pixora. Built for the moments that matter.
      </div>
    </footer>
  );
};
