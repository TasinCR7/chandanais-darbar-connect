import React, { type ErrorInfo, type ReactNode, Component } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);

    // Auto-reload once if dynamic import/chunk fails (due to deployment cache)
    const isChunkLoadError = 
      error?.name === "ChunkLoadError" ||
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed");

    if (isChunkLoadError) {
      const reloaded = sessionStorage.getItem("chunk_reload_attempted");
      if (!reloaded) {
        sessionStorage.setItem("chunk_reload_attempted", "true");
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem("chunk_reload_attempted");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md p-8 bg-card border border-gold/20 rounded-2xl shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="text-xl md:text-2xl font-heading font-bold text-cream">
              কিছু একটা সমস্যা হয়েছে
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              একটি সাময়িক কারিগরি ত্রুটি ঘটেছে। পেজটি পুনরায় লোড (Reload) করে দেখুন।
            </p>
            <button
              onClick={this.handleReload}
              className="bg-gold-gradient text-primary-foreground font-bold px-6 py-2.5 rounded-xl shadow-lg gold-glow-hover transition-all duration-300 inline-flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              পেজ রিলোড করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
