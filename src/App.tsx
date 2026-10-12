import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Categories from "./pages/Categories";
import CategoryDetailPage from "./pages/CategoryDetailPage";
import Templates from "./pages/Templates";
import TemplateEditorPage from "./pages/TemplateEditorPage";
import TrendingTemplates from "./pages/TrendingTemplates";
import UsersPage from "./pages/UsersPage";
import UserDetailPage from "./pages/UserDetailPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Wishes from "./pages/Wishes";
import ContactMessages from "./pages/ContactMessages";
import FeedbackList from "./pages/FeedbackList";
import AIWaitlist from "./pages/AIWaitlist";
import Analytics from "./pages/Analytics";
import RankingsPage from "./pages/RankingsPage";
import Media from "./pages/Media";
import CurrencyRates from "./pages/CurrencyRates";
import PaymentHistory from "./pages/PaymentHistory";
import CacheManagement from "./pages/CacheManagement";
import './App.scss';

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
