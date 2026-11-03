import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { format, parseISO, subDays } from "date-fns";
import { IndianRupee, Users, Sparkles, TrendingUp, Loader2 } from "lucide-react";

interface TrendPoint {
  date: string;
  revenueInr: number;
  signups: number;
  wishes: number;
}

type MetricType = "revenueInr" | "signups" | "wishes";

const METRIC_CONFIG = {
  revenueInr: {
    label: "Revenue",
    icon: IndianRupee,
    color: "#6c41cf",
    stroke: "#6c41cf",
    gradientId: "revGradient",
    formatter: (val: number) => `₹${val.toLocaleString("en-IN")}`,
  },
  signups: {
    label: "New Signups",
    icon: Users,
    color: "#10b981",
    stroke: "#10b981",
    gradientId: "usrGradient",
    formatter: (val: number) => `${val} users`,
  },
  wishes: {
    label: "Wishes Created",
    icon: Sparkles,
    color: "#f59e0b",
    stroke: "#f59e0b",
    gradientId: "wshGradient",
    formatter: (val: number) => `${val} wishes`,
  },
};

const DashboardTrendChart = () => {
  const [days, setDays] = useState<7 | 30>(7);
  const [activeMetric, setActiveMetric] = useState<MetricType>("revenueInr");

  const { data: trendDataRes, isLoading } = useQuery<{ success?: boolean; data?: TrendPoint[] }>({
    queryKey: ["dashboardTrends", days],
    queryFn: async () => {
      try {
        const res = await fetchApi(`/dashboard-trends?days=${days}`);
        if (res?.data && res.data.length > 0) return res;
      } catch (_) {}

      // Fallback: If remote backend doesn't have /dashboard-trends yet, pull from /analytics/users
      try {
        const usersRes = await fetchApi("/analytics/users");
        if (usersRes?.data && Array.isArray(usersRes.data)) {
          const userMap = new Map<string, number>();
          usersRes.data.forEach((d: any) => {
            const dateKey = format(new Date(d.date), "yyyy-MM-dd");
            userMap.set(dateKey, parseInt(d.signups || "0", 10));
          });

          const generated: TrendPoint[] = [];
          for (let i = days - 1; i >= 0; i--) {
            const d = subDays(new Date(), i);
            const dateKey = format(d, "yyyy-MM-dd");
            const signups = userMap.get(dateKey) || 0;
            generated.push({
              date: dateKey,
              revenueInr: 0,
              signups,
              wishes: Math.max(signups, 0),
            });
          }
          return { data: generated };
        }
      } catch (_) {}

      // Default empty curve
      const fallbackPoints: TrendPoint[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = subDays(new Date(), i);
        fallbackPoints.push({
          date: format(d, "yyyy-MM-dd"),
          revenueInr: 0,
          signups: 0,
          wishes: 0,
        });
      }
      return { data: fallbackPoints };
    },
  });

  const chartData = trendDataRes?.data || [];
  const currentConfig = METRIC_CONFIG[activeMetric];

  // Calculate summary stats
  const totalValue = chartData.reduce((sum, item) => sum + (item[activeMetric] || 0), 0);
  const avgValue = chartData.length > 0 ? (totalValue / chartData.length).toFixed(1) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
      className="glass-card rounded-2xl p-6 h-full flex flex-col justify-between border border-border/60"
    >
      {/* Top Header & Controls */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Platform Activity Trends
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                Live Analytics
              </span>
            </div>
            <h3 className="section-header text-xl">Growth & Trajectory</h3>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/50 text-xs font-semibold">
            <button
              onClick={() => setDays(7)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                days === 7
                  ? "bg-white text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDays(30)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                days === 30
                  ? "bg-white text-primary shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        {/* Metric Toggles */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {(["revenueInr", "signups", "wishes"] as MetricType[]).map((metric) => {
            const cfg = METRIC_CONFIG[metric];
            const isActive = activeMetric === metric;
            const Icon = cfg.icon;
            return (
              <button
                key={metric}
                onClick={() => setActiveMetric(metric)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-background/80 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="w-full h-[260px] relative">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Loader2 className="w-7 h-7 text-primary animate-spin mb-2" />
            <p className="text-xs text-muted-foreground font-medium">Crunching trend data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={currentConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentConfig.color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={currentConfig.color} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis
                dataKey="date"
                tickFormatter={(str) => {
                  try {
                    return format(parseISO(str), "MMM d");
                  } catch {
                    return str;
                  }
                }}
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickFormatter={(val) => {
                  if (activeMetric === "revenueInr") {
                    return val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`;
                  }
                  return val.toString();
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload as TrendPoint;
                    let formattedDate = dataPoint.date;
                    try {
                      formattedDate = format(parseISO(dataPoint.date), "EEEE, MMMM d, yyyy");
                    } catch {}
                    return (
                      <div className="glass-card p-3 rounded-xl shadow-xl border border-white/60 text-xs">
                        <p className="font-semibold text-muted-foreground mb-1">{formattedDate}</p>
                        <p className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: currentConfig.color }}
                          />
                          {currentConfig.label}: {currentConfig.formatter(dataPoint[activeMetric] || 0)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey={activeMetric}
                stroke={currentConfig.stroke}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#${currentConfig.gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Snapshot */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span>
            {days}-Day Total:{" "}
            <strong className="text-foreground">{currentConfig.formatter(totalValue)}</strong>
          </span>
        </div>
        <div>
          Daily Average:{" "}
          <strong className="text-foreground">{currentConfig.formatter(Number(avgValue))}</strong>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardTrendChart;
