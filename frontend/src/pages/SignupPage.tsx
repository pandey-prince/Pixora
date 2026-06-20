import { SignUp, useAuth } from "@clerk/react";
import { Navigate } from "react-router-dom";

export const SignupPage = () => {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Navigate to="/gallery" replace />;

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,_#ede9fe,_#f8fafc_45%)] p-5">
      <SignUp routing="path" path="/signup" signInUrl="/login" forceRedirectUrl="/gallery" />
    </main>
  );
};
