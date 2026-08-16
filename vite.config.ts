import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Plain static Vite build — no server runtime.
// base is the GitHub Pages project-page subpath (adjust to match the repo name).
export default defineConfig({
  base: "/sheetly/",
  plugins: [react(), tailwindcss(), tsConfigPaths()],
});
