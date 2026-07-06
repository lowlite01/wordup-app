import React from "react";
import ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App";
import { GOOGLE_CLIENT_ID } from "./lib/api";
import "./styles.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);

// GoogleOAuthProvider needs a client id; when it's blank the app still runs
// in offline mode and the login button simply isn't shown.
root.render(
  <React.StrictMode>
    {GOOGLE_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
