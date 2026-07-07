import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { api, GOOGLE_CLIENT_ID } from "../lib/api";

// Rendered when the mobile app opens the site with ?mobileauth=<redirect>.
// After Google sign-in, it hands the JWT back to the app via the deep link.
export default function MobileAuthScreen({ redirect }: { redirect: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 18, padding: 24, textAlign: "center",
    }}>
      <h1 className="logo">WordUp</h1>
      <p className="muted">Sign in to continue in the app</p>
      {GOOGLE_CLIENT_ID ? (
        <GoogleLogin
          onSuccess={async cred => {
            if (!cred.credential) return;
            setBusy(true);
            setError("");
            try {
              const { token } = await api.loginWithGoogle(cred.credential);
              const sep = redirect.includes("?") ? "&" : "?";
              window.location.href = `${redirect}${sep}token=${encodeURIComponent(token)}`;
            } catch {
              setError("Sign-in failed — please try again.");
              setBusy(false);
            }
          }}
          onError={() => setError("Sign-in failed — please try again.")}
        />
      ) : (
        <p className="muted">Google sign-in isn't configured.</p>
      )}
      {busy && <p className="muted">Signing you in…</p>}
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
