import { ReactNode, useState, useEffect, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import DashboardSidebar from "./DashboardSidebar";

interface DashboardLayoutProps {
  children?: ReactNode;
}

const RouteContentFallback = () => (
  <div className="w-full min-h-[50vh] flex flex-col items-center justify-center">
    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
      <Loader2 className="w-5 h-5 text-primary animate-spin" />
    </div>
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
      Loading view...
    </p>
  </div>
);

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("admin_sidebar_collapsed") === "true";
  });

  useEffect(() => {
    const handleToggle = (e: any) => {
      setIsCollapsed(Boolean(e.detail));
    };
    window.addEventListener("sidebar_toggle", handleToggle);
    return () => window.removeEventListener("sidebar_toggle", handleToggle);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar isCollapsed={isCollapsed} onToggleCollapse={setIsCollapsed} />
      <main
        className={`min-h-screen p-6 sm:p-8 transition-all duration-300 ease-in-out ${
          isCollapsed ? "ml-[76px]" : "ml-[220px]"
        }`}
      >
        <Suspense fallback={<RouteContentFallback />}>
          {children || <Outlet />}
        </Suspense>
      </main>
    </div>
  );
};

export default DashboardLayout;
