import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import "./App.scss";

// ── Lazy-Loaded Pages for Route Code-Splitting ──────────────────────────────
const Index = lazy(() => import("./pages/Index"));
const Categories = lazy(() => import("./pages/Categories"));
const CategoryDetailPage = lazy(() => import("./pages/CategoryDetailPage"));
const Templates = lazy(() => import("./pages/Templates"));
const TemplateEditorPage = lazy(() => import("./pages/TemplateEditorPage"));
const TrendingTemplates = lazy(() => import("./pages/TrendingTemplates"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const UserDetailPage = lazy(() => import("./pages/UserDetailPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/Login"));
const Wishes = lazy(() => import("./pages/Wishes"));
const ContactMessages = lazy(() => import("./pages/ContactMessages"));
const FeedbackList = lazy(() => import("./pages/FeedbackList"));
const AIWaitlist = lazy(() => import("./pages/AIWaitlist"));
const Analytics = lazy(() => import("./pages/Analytics"));
const RankingsPage = lazy(() => import("./pages/RankingsPage"));
const Media = lazy(() => import("./pages/Media"));
const CurrencyRates = lazy(() => import("./pages/CurrencyRates"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const CacheManagement = lazy(() => import("./pages/CacheManagement"));
const CostManagement = lazy(() => import("./pages/CostManagement"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("adminToken");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PageFallback = () => (
  <div className="w-full h-screen flex flex-col items-center justify-center bg-background">
    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
      Loading Console...
    </p>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
            <Route path="/rankings" element={<RequireAuth><RankingsPage /></RequireAuth>} />
            <Route path="/categories" element={<RequireAuth><Categories /></RequireAuth>} />
            <Route path="/categories/new" element={<RequireAuth><CategoryDetailPage /></RequireAuth>} />
            <Route path="/categories/:id" element={<RequireAuth><CategoryDetailPage /></RequireAuth>} />
            <Route path="/categories/:id/edit" element={<RequireAuth><CategoryDetailPage /></RequireAuth>} />
            <Route path="/templates" element={<RequireAuth><Templates /></RequireAuth>} />
            <Route path="/templates/new" element={<RequireAuth><TemplateEditorPage /></RequireAuth>} />
            <Route path="/templates/edit/:id" element={<RequireAuth><TemplateEditorPage /></RequireAuth>} />
            <Route path="/templates/:id/edit" element={<RequireAuth><TemplateEditorPage /></RequireAuth>} />
            <Route path="/trending-templates" element={<RequireAuth><TrendingTemplates /></RequireAuth>} />
            <Route path="/currency-rates" element={<RequireAuth><CurrencyRates /></RequireAuth>} />
            <Route path="/payments" element={<RequireAuth><PaymentHistory /></RequireAuth>} />
            <Route path="/costs" element={<RequireAuth><CostManagement /></RequireAuth>} />
            <Route path="/cache" element={<RequireAuth><CacheManagement /></RequireAuth>} />
            <Route path="/wishes" element={<RequireAuth><Wishes /></RequireAuth>} />
            <Route path="/contact" element={<RequireAuth><ContactMessages /></RequireAuth>} />
            <Route path="/feedback" element={<RequireAuth><FeedbackList /></RequireAuth>} />
            <Route path="/ai-waitlist" element={<RequireAuth><AIWaitlist /></RequireAuth>} />
            <Route path="/users" element={<RequireAuth><UsersPage /></RequireAuth>} />
            <Route path="/users/:id" element={<RequireAuth><UserDetailPage /></RequireAuth>} />
            <Route path="/media" element={<RequireAuth><Media /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
