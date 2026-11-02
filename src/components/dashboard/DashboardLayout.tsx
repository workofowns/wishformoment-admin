import { ReactNode, useState, useEffect } from "react";
import DashboardSidebar from "./DashboardSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

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
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
