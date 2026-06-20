import { useAuth } from "@clerk/react";
import { Navigate, Outlet } from "react-router-dom";

export const ProtectedRoute = () => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading...</div>;
  }

  return isSignedIn ? <Outlet /> : <Navigate to="/login" replace />;
};
