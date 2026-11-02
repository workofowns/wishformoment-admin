import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export interface StatTrend {
  value: number | string;
  isPositive: boolean;
  label?: string;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  glowColor: "primary" | "accent" | "secondary" | "emerald" | "amber" | "sky";
  trend?: StatTrend;
  to?: string;
  badge?: string;
  delay?: number;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  glowColor,
  trend,
  to,
  badge,
  delay = 0,
}: StatCardProps) => {
  const glowMap = {
    primary: "glow-orb-primary",
    accent: "glow-orb-accent",
    secondary: "glow-orb-secondary",
    emerald: "bg-emerald-500/20",
    amber: "bg-amber-500/20",
    sky: "bg-sky-500/20",
  };

  const iconColorMap = {
    primary: "text-primary bg-primary/10",
    accent: "text-accent bg-accent/10",
    secondary: "text-secondary bg-secondary/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    sky: "text-sky-600 bg-sky-500/10",
  };

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={to ? { y: -3, transition: { duration: 0.2 } } : {}}
      className={`glass-card rounded-2xl p-5 relative overflow-hidden group transition-all duration-300 border border-border/60 ${
        to ? "cursor-pointer hover:shadow-xl hover:border-primary/40 hover:bg-white/80" : ""
      }`}
    >
      {/* Background ambient glow */}
      <div
        className={`glow-orb ${glowMap[glowColor] || "glow-orb-primary"} w-40 h-40 -top-14 -right-14 opacity-50 pointer-events-none`}
      />

      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                {title}
              </span>
              {badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                  {badge}
                </span>
              )}
            </div>
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-200 ${
                iconColorMap[glowColor] || "text-primary bg-primary/10"
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
          </div>

          {/* Primary Value */}
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
              {value}
            </p>
            {to && (
              <span className="text-xs font-semibold text-primary/70 group-hover:text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                View
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            )}
          </div>
        </div>

        {/* Subtitle & Trend */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/50 text-xs">
          <p className="text-muted-foreground font-medium truncate min-w-0" title={subtitle}>
            {subtitle}
          </p>

          {trend && (
            <div
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ${
                trend.isPositive
                  ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60"
                  : "text-rose-700 bg-rose-50 border border-rose-200/60"
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3 stroke-[2.5]" />
              ) : (
                <TrendingDown className="w-3 h-3 stroke-[2.5]" />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (to) {
    return (
      <Link to={to} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
};

export default StatCard;
