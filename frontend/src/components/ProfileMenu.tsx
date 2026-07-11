import { useClerk, useUser } from "@clerk/react";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const profileInitial = (firstName?: string | null, username?: string | null, email?: string | null) => {
  const label =
    firstName?.trim() ||
    username?.trim() ||
    email?.split("@")[0]?.trim() ||
    "?";
  return label.charAt(0).toUpperCase();
};

export const ProfileMenu = () => {
  const { user } = useUser();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const initial = useMemo(
    () =>
      profileInitial(
        user?.firstName,
        user?.username,
        user?.primaryEmailAddress?.emailAddress,
      ),
    [user],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white shadow-sm ring-2 ring-white transition hover:bg-violet-700"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 min-w-[190px] overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              clerk.openUserProfile();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <UserRound size={16} className="text-violet-500" />
            Manage profile
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void clerk.signOut({ redirectUrl: "/" });
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut size={16} className="text-violet-500" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};
