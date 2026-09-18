"use client";

import Image from "next/image";
import { useFormStatus } from "react-dom";
import { signInWithGoogle, signOutUser } from "@/app/actions/auth";
import type { SessionUser } from "@/types/auth";

type Props = {
  user: SessionUser | null;
};

/** Google's multicolor "G", as its sign-in branding guidelines require on the button. */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function SignInButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-5 py-3 font-medium text-black hover:bg-neutral-100 disabled:opacity-60"
    >
      <GoogleLogo />
      {pending ? "Redirecting to Google…" : "Sign in with Google"}
    </button>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/10 hover:text-zinc-50 disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export default function AccountPanel({ user }: Props) {
  if (!user) {
    return (
      <form action={signInWithGoogle} className="flex flex-col gap-2">
        <SignInButton />
        <p className="text-xs text-zinc-400">
          Playing as a guest. Progress is saved on this device.
        </p>
      </form>
    );
  }

  const label = user.name ?? user.email ?? "Player";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {user.image ? (
          <Image src={user.image} alt="" width={36} height={36} className="size-9 rounded-full" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-medium text-zinc-50">{label}</p>
          {user.email && user.name && (
            <p className="truncate text-xs text-zinc-400">{user.email}</p>
          )}
        </div>
      </div>
      <form action={signOutUser}>
        <SignOutButton />
      </form>
    </div>
  );
}
