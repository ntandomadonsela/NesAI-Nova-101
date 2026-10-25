import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import { loadEnv } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim() || "https://www.nesai.co.za";

  return {
    plugins: [
      tailwindcss(),
      tanstackStart({
        spa: {
          enabled: true,
          prerender: { outputPath: "/index.html" },
        },
      }),
      viteReact(),
    ],
    resolve: {
      tsconfigPaths: true,
      dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
    },
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBaseUrl),
      "import.meta.env.VITE_MOBILE_APP": JSON.stringify("true"),
    },
    build: { outDir: "mobile-dist", emptyOutDir: true },
  };
});
