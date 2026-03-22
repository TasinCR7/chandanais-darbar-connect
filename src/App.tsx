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


const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
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
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
