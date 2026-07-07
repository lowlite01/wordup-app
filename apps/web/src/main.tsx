import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import MobileAuthScreen from "./components/MobileAuthScreen";
import { GOOGLE_CLIENT_ID } from "./lib/api";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);

// When the mobile app opens the site with ?mobileauth=<redirect>, show only
// the sign-in and hand the token back to the app instead of the full app.
const mobileAuth = new URLSearchParams(window.location.search).get("mobileauth");
const rootView = mobileAuth ? <MobileAuthScreen redirect={mobileAuth} /> : <App />;

// GoogleOAuthProvider needs a client id; when it's blank the app still runs
// in offline mode and the login button simply isn't shown.
root.render(
  <React.StrictMode>
    {GOOGLE_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {rootView}
      </GoogleOAuthProvider>
    ) : (
      rootView
    )}
  </React.StrictMode>
);
