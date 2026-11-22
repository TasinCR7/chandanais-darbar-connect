import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function localApiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: "local-api-dev-middleware",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req, res) => {
        const { handleChat } = await import("./api/chat.js");
        await handleChat(req, res, env);
      });
      server.middlewares.use("/api/notify", async (req, res) => {
        const { handleNotify } = await import("./api/notify.js");
        await handleNotify(req, res, env);
      });
      server.middlewares.use("/api/sms", async (req, res) => {
        const { handleSms } = await import("./api/sms.js");
        await handleSms(req, res, env);
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  const publicBackendUrl = env.VITE_SUPABASE_URL || "";
  const publicBackendKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const publicBackendProjectId = env.VITE_SUPABASE_PROJECT_ID || "";

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

    plugins: [react(), localApiDevPlugin(env)],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      modulePreload: { polyfill: true },
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
              if (id.includes('lucide-react')) {
                return 'lucide-icons';
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
