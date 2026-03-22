import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import About from "./pages/About";
import Pir from "./pages/Pir";
import Rules from "./pages/Rules";
import Events from "./pages/Events";
import Hadia from "./pages/Hadia";
import Gallery from "./pages/Gallery";
import Doa from "./pages/Doa";
import QnA from "./pages/QnA";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Notices from "./pages/Notices";


const queryClient = new QueryClient();

const App = () => (
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
);

export default App;
