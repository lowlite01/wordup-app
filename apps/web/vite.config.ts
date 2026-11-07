import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The commit being built (Vercel sets VERCEL_GIT_COMMIT_SHA) goes into
// <meta name="build"> so tools/wait-deploy.sh can tell when it's live.
const commit = (process.env.VERCEL_GIT_COMMIT_SHA || "dev").slice(0, 7);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "build-commit",
      transformIndexHtml: html => html.replace("</head>", `  <meta name="build" content="${commit}" />
</head>`),
    },
  ],
  server: { port: 5175, strictPort: true },
});
