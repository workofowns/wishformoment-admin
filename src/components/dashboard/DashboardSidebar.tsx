import {
  Home,
  Layers,
  LayoutGrid,
  Users,
  Settings,
  Sparkles,
  LogOut,
  BarChart,
  MessageSquare,
  MessageSquarePlus,
  Mail,
  Image,
  Flame,
  Coins,
  CreditCard,
  Database,
  Trophy,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: BarChart, label: "Analytics", path: "/analytics" },
  { icon: Trophy, label: "Rankings", path: "/rankings" },
  { icon: Layers, label: "Categories", path: "/categories" },
  { icon: LayoutGrid, label: "Templates", path: "/templates" },
  { icon: Flame, label: "Trending", path: "/trending-templates" },
  { icon: Coins, label: "Rates", path: "/currency-rates" },
  { icon: CreditCard, label: "Payments", path: "/payments" },
  { icon: Database, label: "Cache", path: "/cache" },
  { icon: Sparkles, label: "Wishes", path: "/wishes" },
  { icon: Users, label: "Users", path: "/users" },
  { icon: Image, label: "S3", path: "/media" },
  { icon: MessageSquare, label: "Contact", path: "/contact" },
  { icon: MessageSquarePlus, label: "Feedback", path: "/feedback" },
  { icon: Mail, label: "Waitlist", path: "/ai-waitlist" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/login";
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[76px] btn-primary shadow-none hover:shadow-none flex flex-col items-center py-6 z-50">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <img src="/images/white-logo.webp" alt="WishForMoment" loading="eager" className="w-10 h-10" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2 pb-5 overflow-y-auto overflow-x-hidden no-scrollbar">
        {navItems.map((item) => {
          const isActive = item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-icon-btn w-full py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${isActive ? "bg-white/20 shadow-inner" : "hover:bg-white/10"}`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-white/80"}`} />
              <span className={`text-[9px] font-bold tracking-wider uppercase ${isActive ? "text-white" : "text-white/70"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Actions at bottom */}
      <div className="mt-auto flex flex-col items-center gap-4 w-full px-2">
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 hover:text-red-100 flex flex-col items-center justify-center transition-colors text-white/90"
        >
          <LogOut className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold tracking-widest uppercase">Logout</span>
        </button>
        <div className="w-9 h-9 rounded-full bg-white/30 border-2 border-white/50 shadow-lg flex items-center justify-center text-white text-xs font-black">
          AW
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
