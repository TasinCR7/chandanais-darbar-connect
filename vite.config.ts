import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  const publicBackendUrl =

    env.VITE_SUPABASE_URL || "https://uezrdvjbazehzjorhfrl.supabase.co";
  const publicBackendKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_jcSthwFxzUPKKEi5i5cjDA_gZG94j_h";
  const publicBackendProjectId = env.VITE_SUPABASE_PROJECT_ID || "uezrdvjbazehzjorhfrl";

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
      "import.meta.env.VITE_TELEGRAM_BOT_TOKEN": JSON.stringify(env.VITE_TELEGRAM_BOT_TOKEN || ""),
      "import.meta.env.VITE_TELEGRAM_CHAT_ID": JSON.stringify(env.VITE_TELEGRAM_CHAT_ID || ""),
      "import.meta.env.VITE_SMS_API_KEY": JSON.stringify(env.VITE_SMS_API_KEY || ""),
    },
    plugins: [react()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
