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
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf')) {
                return 'jspdf';
              }
              if (id.includes('html2canvas')) {
                return 'html2canvas';
              }
              if (id.includes('pdfjs-dist')) {
                return 'pdfjs';
              }
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'recharts';
              }
              if (id.includes('framer-motion')) {
                return 'framer-motion';
              }
              if (id.includes('@supabase')) {
                return 'supabase';
              }
              if (id.includes('@radix-ui')) {
                return 'radix-ui';
              }
              if (id.includes('zod') || id.includes('react-helmet') || id.includes('@tanstack')) {
                return 'utils';
              }
              return 'vendor';
            }
          }
        }
      }
    }
  };
});
