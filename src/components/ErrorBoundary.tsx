import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-heading font-bold text-gold mb-4">
              কিছু একটা সমস্যা হয়েছে
            </h1>
            <p className="text-muted-foreground mb-6">
              দুঃখিত, একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। পেজটি রিলোড করুন।
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gold-gradient text-primary-foreground px-6 py-2 rounded-md font-semibold"
            >
              রিলোড করুন
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
