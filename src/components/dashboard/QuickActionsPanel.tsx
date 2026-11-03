import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  Layers,
  CreditCard,
  MessageSquare,
  Database,
  Coins,
  ArrowRight,
  Server,
  Zap,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

interface QuickActionsPanelProps {
  system?: {
    database: string;
    dbLatencyMs: number;
    redis: string;
    uptime: number;
  };
  conversion?: {
    total: number;
    paid: number;
    rate: number;
  };
}

const actions = [
  {
    label: "Add New Template",
    desc: "Create and publish a wish template",
    to: "/templates/new",
    icon: LayoutGrid,
    color: "text-primary bg-primary/10 group-hover:bg-primary group-hover:text-white",
  },
  {
    label: "Manage Categories",
    desc: "Organize taxonomy & hierarchy",
    to: "/categories",
    icon: Layers,
    color: "text-amber-600 bg-amber-500/10 group-hover:bg-amber-600 group-hover:text-white",
  },
  {
    label: "Payment & Refunds",
    desc: "Track orders and process refunds",
    to: "/payments",
    icon: CreditCard,
    color: "text-emerald-600 bg-emerald-500/10 group-hover:bg-emerald-600 group-hover:text-white",
  },
  {
    label: "Support Messages",
    desc: "Review customer inquiries",
    to: "/contact",
    icon: MessageSquare,
    color: "text-violet-600 bg-violet-500/10 group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    label: "Cache Management",
    desc: "Inspect & purge Redis keys",
    to: "/cache",
    icon: Database,
    color: "text-sky-600 bg-sky-500/10 group-hover:bg-sky-600 group-hover:text-white",
  },
  {
    label: "Currency Exchange Rates",
    desc: "Update dynamic global rates",
    to: "/currency-rates",
    icon: Coins,
    color: "text-rose-600 bg-rose-500/10 group-hover:bg-rose-600 group-hover:text-white",
  },
];

const QuickActionsPanel = ({ system, conversion }: QuickActionsPanelProps) => {
  const formatUptime = (sec: number) => {
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${Math.floor((sec % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick Actions Console */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="sub-label font-bold text-xs uppercase tracking-wider text-muted-foreground">
              Direct Controls
            </span>
            <h3 className="section-header text-lg">Quick Actions</h3>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Shortcuts
          </span>
        </div>

        <div className="space-y-2">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.to}
                to={act.to}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-primary/15 hover:bg-primary/5 transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${act.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {act.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{act.desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* 2. Platform Health & Conversion Widget */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.35 }}
        className="glass-card rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-sm text-foreground">Infrastructure & Health</h4>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {/* DB Health */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-muted-foreground">PostgreSQL Database</span>
            </div>
            <span className="font-bold text-foreground">
              {system?.dbLatencyMs !== undefined ? `${system.dbLatencyMs}ms` : "OK"}
            </span>
          </div>

          {/* Redis Health */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-muted-foreground">Redis Cache Engine</span>
            </div>
            <span className="font-bold text-emerald-600 capitalize">
              {system?.redis || "Connected"}
            </span>
          </div>

          {/* Server Uptime */}
          {system?.uptime ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-muted/40">
              <span className="text-muted-foreground">API Server Uptime</span>
              <span className="font-bold text-foreground">{formatUptime(system.uptime)}</span>
            </div>
          ) : null}

          {/* Conversion Ratio */}
          {conversion && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-muted-foreground font-medium">Paid Wish Conversion</span>
                <span className="font-extrabold text-primary">{conversion.rate}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(Math.max(conversion.rate, 3), 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                <span>{conversion.paid} paid</span>
                <span>{conversion.total} created</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default QuickActionsPanel;

