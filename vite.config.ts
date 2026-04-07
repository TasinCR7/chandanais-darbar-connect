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
      "import.meta.env.VITE_TELEGRAM_BOT_TOKEN": JSON.stringify(env.VITE_TELEGRAM_BOT_TOKEN || "8577916741:AAHku7Xh3YpFn3Y2aF4L7swaJcOjKsoZwyg"),
      "import.meta.env.VITE_TELEGRAM_CHAT_ID": JSON.stringify(env.VITE_TELEGRAM_CHAT_ID || "7484314831,-1003880816949"),
      "import.meta.env.VITE_SMS_API_KEY": JSON.stringify(env.VITE_SMS_API_KEY || "80vYfyavkUELVQY8U4z78yUkBljg7Si6ljG56pyR"),
    },

    plugins: [react()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor';
              }
              if (id.includes('@radix-ui')) {
                return 'radix';
              }
              if (id.includes('lucide-react')) {
                return 'lucide';
              }
              if (id.includes('framer-motion')) {
                return 'framer';
              }
              if (id.includes('@tanstack/react-query')) {
                return 'query';
              }
              if (id.includes('@supabase/supabase-js')) {
                return 'supabase';
              }
              if (id.includes('jspdf') || id.includes('html2canvas')) {
                return 'pdf';
              }
              if (id.includes('date-fns') || id.includes('zod') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'utils-core';
              }
              return 'vendor-core';
            }
          }
        }
      }
    }
  };
});
