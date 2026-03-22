import {
  installGlobalErrorGuards,
  isIgnorableExtensionError,
} from "./lib/installGlobalErrorGuards";
import "./index.css";

installGlobalErrorGuards();

const BOOTSTRAP_RETRY_LIMIT = 3;
const BOOTSTRAP_RETRY_DELAY_MS = 150;

const renderBootstrapFallback = () => {
  const root = document.getElementById("root");

  if (!root) {
    return;
  }

  root.innerHTML = [
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:hsl(32 35% 8%);color:hsl(45 65% 92%);font-family:system-ui,sans-serif;text-align:center;">',
    '<div>',
    '<h1 style="margin:0 0 12px;font-size:28px;font-weight:700;">কিছু একটা সমস্যা হয়েছে</h1>',
    '<p style="margin:0 0 16px;color:hsl(45 18% 74%);">পেজটি আবার রিলোড করে চেষ্টা করুন।</p>',
    '<button onclick="window.location.reload()" style="border:none;border-radius:999px;padding:12px 18px;background:hsl(45 73% 52%);color:hsl(32 35% 8%);font-weight:700;cursor:pointer;">রিলোড করুন</button>',
    '</div>',
    '</div>',
  ].join("");
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const bootstrap = async (attempt = 1): Promise<void> => {
  try {
    const [{ createRoot }, { default: App }] = await Promise.all([
      import("react-dom/client"),
      import("./App.tsx"),
    ]);

    createRoot(document.getElementById("root")!, {
      onRecoverableError: (error) => {
        if (isIgnorableExtensionError(error)) {
          console.warn("Ignored recoverable external browser extension error:", error);
          return;
        }

        console.error("Recoverable React rendering error:", error);
      },
    }).render(<App />);
  } catch (error) {
    if (isIgnorableExtensionError(error) && attempt < BOOTSTRAP_RETRY_LIMIT) {
      console.warn(`Ignored bootstrap extension error on attempt ${attempt}; retrying...`, error);
      await wait(BOOTSTRAP_RETRY_DELAY_MS * attempt);
      return bootstrap(attempt + 1);
    }

    console.error("Application bootstrap failed:", error);
    renderBootstrapFallback();
  }
};

void bootstrap();
