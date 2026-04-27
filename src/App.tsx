import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import PremiumLoader from "./components/PremiumLoader";
import ScrollToTop from "./components/ScrollToTop";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const About = lazy(() => import("./pages/About"));
const Pir = lazy(() => import("./pages/Pir"));
const Rules = lazy(() => import("./pages/Rules"));
const Events = lazy(() => import("./pages/Events"));
const Hadia = lazy(() => import("./pages/Hadia"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Doa = lazy(() => import("./pages/Doa"));
const QnA = lazy(() => import("./pages/QnA"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Admin = lazy(() => import("./pages/Admin"));
const Notices = lazy(() => import("./pages/Notices"));
const Committee = lazy(() => import("./pages/Committee"));
const CommitteeLogin = lazy(() => import("./pages/CommitteeLogin"));
const CommitteeDashboard = lazy(() => import("./pages/CommitteeDashboard"));
const BookReader = lazy(() => import("./pages/BookReader"));
const Finance = lazy(() => import("./pages/Finance"));
const MemberSearch = lazy(() => import("./pages/MemberSearch"));
const MemberProfile = lazy(() => import("./pages/MemberProfile"));
const MemberPortal = lazy(() => import("./pages/MemberPortal"));
const TransparencyNew = lazy(() => import("./pages/Transparency"));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, 
      gcTime: 10 * 60 * 1000, 
      refetchOnWindowFocus: false, 
      retry: 1,
    },
  },
});

const AppContent = () => {
  const location = useLocation();
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <Suspense fallback={<PremiumLoader />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/pir" element={<Pir />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/events" element={<Events />} />
              <Route path="/hadia" element={<Hadia />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/doa" element={<Doa />} />
              <Route path="/qna" element={<QnA />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/notices" element={<Notices />} />
              <Route path="/committee" element={<Committee />} />
              <Route path="/committee-login" element={<CommitteeLogin />} />
              <Route path="/committee-dashboard" element={<ProtectedRoute allowedRoles={['admin', 'editor', 'moderator', 'treasurer']}><CommitteeDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/book" element={<BookReader />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/member-search" element={<MemberSearch />} />
              <Route path="/member/:id" element={<MemberProfile />} />
              <Route path="/transparency" element={<TransparencyNew />} />
              <Route path="/member-portal" element={<MemberPortal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <ScrollToTop />
              <AppContent />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
