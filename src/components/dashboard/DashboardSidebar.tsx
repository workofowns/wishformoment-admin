import { useState, useEffect } from "react";
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
  Receipt,
  Database,
  Trophy,
  Terminal,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavGroup {
  label: string;
  items: {
    icon: LucideIcon;
    label: string;
    path: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { icon: Home, label: "Home", path: "/" },
      { icon: BarChart, label: "Analytics", path: "/analytics" },
      { icon: Trophy, label: "Rankings", path: "/rankings" },
    ],
  },
  {
    label: "Catalog & Wishes",
    items: [
      { icon: LayoutGrid, label: "Templates", path: "/templates" },
      { icon: Layers, label: "Categories", path: "/categories" },
      { icon: Flame, label: "Trending", path: "/trending-templates" },
      { icon: Sparkles, label: "Wishes", path: "/wishes" },
      { icon: Image, label: "Media (S3)", path: "/media" },
    ],
  },
  {
    label: "Operations & Finance",
    items: [
      { icon: CreditCard, label: "Payments", path: "/payments" },
      { icon: Coins, label: "Currency Rates", path: "/currency-rates" },
      { icon: Receipt, label: "Cloud Costs", path: "/costs" },
      { icon: Database, label: "Redis Cache", path: "/cache" },
      { icon: Terminal, label: "Server Logs", path: "/logs" },
    ],
  },
  {
    label: "Support & Users",
    items: [
      { icon: Users, label: "Users", path: "/users" },
      { icon: MessageSquare, label: "Inquiries", path: "/contact" },
      { icon: MessageSquarePlus, label: "Feedback", path: "/feedback" },
      { icon: Mail, label: "Waitlist", path: "/ai-waitlist" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ],
  },
];

interface DashboardSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

const DashboardSidebar = ({
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}: DashboardSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof controlledCollapsed === "boolean") return controlledCollapsed;
    return localStorage.getItem("admin_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    if (typeof controlledCollapsed === "boolean") {
      setIsCollapsed(controlledCollapsed);
    }
  }, [controlledCollapsed]);

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("admin_sidebar_collapsed", String(nextState));
    if (onToggleCollapse) onToggleCollapse(nextState);
    window.dispatchEvent(new CustomEvent("sidebar_toggle", { detail: nextState }));
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/login";
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen btn-primary shadow-2xl flex flex-col items-center py-5 z-50 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[76px]" : "w-[220px]"
      }`}
    >
      {/* ── Top Logo & Toggle ────────────────────────────────────────────────── */}
      <div className="w-full px-4 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/images/smallLogo.webp"
            alt="WishForMoment"
            loading="eager"
            className="w-9 h-9 flex-shrink-0"
          />
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-extrabold text-white text-sm tracking-tight block truncate">
                WishForMoment
              </span>
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest block">
                Admin Console
              </span>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-1 rounded-lg bg-white/10 hover:bg-white/25 text-white/80 hover:text-white transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* ── Grouped Navigation ──────────────────────────────────────────────── */}
      <nav className="flex-1 w-full px-3 overflow-y-auto no-scrollbar space-y-4">
        {navGroups.map((group, gi) => (
          <div key={group.label} className="w-full">
            {/* Group Label */}
            {!isCollapsed ? (
              <div className="px-2 mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">
                  {group.label}
                </span>
              </div>
            ) : gi > 0 ? (
              <div className="w-8 h-[1px] bg-white/15 mx-auto my-2" />
            ) : null}

            {/* Group Items */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path);

                const buttonElement = (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full rounded-xl flex items-center gap-3 transition-all duration-200 ${
                      isCollapsed
                        ? "py-2.5 px-0 justify-center flex-col gap-1"
                        : "py-2 px-3 justify-start"
                    } ${
                      isActive
                        ? "bg-white text-primary font-bold shadow-md"
                        : "text-white/80 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? "text-primary stroke-[2.5]" : "text-white/90"
                      }`}
                    />
                    {!isCollapsed ? (
                      <span className="text-xs font-semibold truncate tracking-tight">
                        {item.label}
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold tracking-tight uppercase line-clamp-1 max-w-[64px] text-center">
                        {item.label.split(" ")[0]}
                      </span>
                    )}
                  </button>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.path} delayDuration={150}>
                      <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
                      <TooltipContent side="right" className="font-bold text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return buttonElement;
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Bottom Actions (Logout & User Badge) ────────────────────────────── */}
      <div className="mt-auto w-full px-3 pt-3 border-t border-white/15 space-y-2">
        <button
          onClick={handleLogout}
          className={`w-full py-2 rounded-xl bg-white/10 hover:bg-rose-500 hover:text-white flex items-center transition-colors text-white/90 ${
            isCollapsed ? "justify-center" : "px-3 gap-2.5"
          }`}
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="text-xs font-bold tracking-tight">Sign Out</span>}
        </button>

        {!isCollapsed && (
          <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-white/10">
            <div className="w-7 h-7 rounded-lg bg-white/30 border border-white/40 flex items-center justify-center text-white text-[10px] font-black">
              AW
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate leading-tight">Admin Console</p>
              <p className="text-[9px] text-white/60 truncate font-mono">workofowns</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;
