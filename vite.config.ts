import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const publicBackendUrl =
    env.VITE_SUPABASE_URL || "https://exrevduphqknvlejjabg.supabase.co";
  const publicBackendKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4cmV2ZHVwaHFrbnZsZWpqYWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjA4MTAsImV4cCI6MjA4OTMzNjgxMH0.bC2-D6f3RhYZI_3RR6rEtzTKxuoRwtJ4P7qHGbjADHY";
  const publicBackendProjectId = env.VITE_SUPABASE_PROJECT_ID || "exrevduphqknvlejjabg";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(publicBackendUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publicBackendKey),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(publicBackendProjectId),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
