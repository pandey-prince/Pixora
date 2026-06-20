import { SignIn, useAuth } from "@clerk/react";
import { Navigate } from "react-router-dom";

export const LoginPage = () => {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Navigate to="/gallery" replace />;

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_#ede9fe,_#f8fafc_45%)] p-5">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        <section className="hidden lg:block">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-violet-600">Pixora</p>
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900">
            Every frame deserves a beautiful home.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            Upload, organize, and revisit your favorite moments in one private gallery.
          </p>
        </section>
        <div className="flex justify-center">
          <SignIn routing="path" path="/login" signUpUrl="/signup" forceRedirectUrl="/gallery" />
        </div>
      </div>
    </main>
  );
};
