import { Analytics } from "@vercel/analytics/react";
import { Navigate, Route, Routes } from "react-router-dom";
import { EncryptionGate } from "./components/EncryptionGate";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CryptoProvider } from "./hooks/useCrypto";
import { GalleryPage } from "./pages/GalleryPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";

export const App = () => (
  <>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/signup/*" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          path="/gallery"
          element={
            <CryptoProvider>
              <EncryptionGate>
                <GalleryPage />
              </EncryptionGate>
            </CryptoProvider>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Analytics />
  </>
);
