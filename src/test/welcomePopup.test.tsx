import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WelcomePopupBanner from "@/components/WelcomePopupBanner";

function createMemoryStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

function renderPopup(
  initialRoute = "/",
  settings: Record<string, string> = {
    popup_banner_enabled: "true",
    popup_banner_title: "পবিত্র ওরশ শরীফ ঘোষণা",
    popup_banner_message: "আগামী ১৬ই ফাল্গুন বার্ষিক ওরশ শরীফ অনুষ্ঠিত হবে।",
    popup_banner_cta_text: "বিস্তারিত দেখুন",
    popup_banner_cta_url: "/events",
    popup_banner_version: "test-v1",
  }
) {
  window.localStorage.setItem("app_settings_cache", JSON.stringify(settings));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={[initialRoute]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <WelcomePopupBanner />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("WelcomePopupBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const localMock = createMemoryStorage();
    const sessionMock = createMemoryStorage();
    vi.stubGlobal("localStorage", localMock);
    vi.stubGlobal("sessionStorage", sessionMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("shows automatically on website entry and remembers dismissal in sessionStorage", () => {
    renderPopup("/");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("পবিত্র ওরশ শরীফ ঘোষণা")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("পপআপ বন্ধ করুন"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem("darbar_welcome_popup_dismissed")).toBe("test-v1");
  });

  it("does not show on /admin routes or when disabled in settings", () => {
    renderPopup("/admin");
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    cleanup();

    renderPopup("/", { popup_banner_enabled: "false" });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
