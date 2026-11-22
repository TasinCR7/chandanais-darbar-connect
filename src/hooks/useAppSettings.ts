import { useQuery } from "@tanstack/react-query";
import { fetchSettings } from "@/lib/api";

const APP_SETTINGS_CACHE_KEY = "app_settings_cache";

/**
 * Shared React Query hook for site-wide `app_settings` backed by localStorage initial cache.
 */
export function useAppSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["app_settings"],
    queryFn: async () => {
      const settings = await fetchSettings();
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(APP_SETTINGS_CACHE_KEY, JSON.stringify(settings));
        } catch (err) {
          console.warn("Cache write warning", err);
        }
      }
      return settings;
    },
    initialData: () => {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem(APP_SETTINGS_CACHE_KEY);
          if (cached) return JSON.parse(cached) as Record<string, string>;
        } catch {
          return undefined;
        }
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });
}
