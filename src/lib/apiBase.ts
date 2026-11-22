/**
 * Resolves backend API base URL for serverless `/api/*` endpoints.
 * On web builds, relative `/api/*` paths work directly on same origin (Vercel / Vite dev).
 * Inside Capacitor native Android/iOS shells, requests target the hosted domain.
 */
export function getApiBase(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
  if (configured) return configured;

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol;
    const isCapacitorNative = Boolean(
      (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );
    if (isCapacitorNative || protocol === "capacitor:" || protocol === "file:") {
      return "https://chandanaish-darbar.com";
    }
  }

  return "";
}
