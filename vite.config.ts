import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import netlify from "@netlify/vite-plugin-tanstack-start";

// TanStack Start + Tailwind v4, deploying to Netlify.
// The Netlify plugin wires up Nitro's Netlify preset for you (SSR routes,
// server functions and middleware all run as Netlify serverless functions)
// and, in local dev, emulates the Netlify platform (env vars, redirects,
// headers) so `npm run dev` behaves like production.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart(),
    netlify(),
    viteReact(),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
});
