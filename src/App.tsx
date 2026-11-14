import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
const LogsPage = lazy(() => import("./pages/LogsPage"));
const VideoManagement = lazy(() => import("./pages/VideoManagement"));

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
            {/* ── Public / Standalone Auth Pages (No Sidebar) ── */}
            <Route path="/login" element={<Login />} />

            {/* ── Authenticated Routes (Wrapped globally with persistent DashboardLayout) ── */}
            <Route
              element={
                <RequireAuth>
                  <DashboardLayout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/rankings" element={<RankingsPage />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/categories/new" element={<CategoryDetailPage />} />
              <Route path="/categories/:id" element={<CategoryDetailPage />} />
              <Route path="/categories/:id/edit" element={<CategoryDetailPage />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/templates/new" element={<TemplateEditorPage />} />
              <Route path="/templates/edit/:id" element={<TemplateEditorPage />} />
              <Route path="/templates/:id/edit" element={<TemplateEditorPage />} />
              <Route path="/trending-templates" element={<TrendingTemplates />} />
              <Route path="/currency-rates" element={<CurrencyRates />} />
              <Route path="/payments" element={<PaymentHistory />} />
              <Route path="/costs" element={<CostManagement />} />
              <Route path="/cache" element={<CacheManagement />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/videos" element={<VideoManagement />} />
              <Route path="/wishes" element={<Wishes />} />
              <Route path="/contact" element={<ContactMessages />} />
              <Route path="/feedback" element={<FeedbackList />} />
              <Route path="/ai-waitlist" element={<AIWaitlist />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
              <Route path="/media" element={<Media />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* ── 404 Standalone Page (No Sidebar) ── */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
