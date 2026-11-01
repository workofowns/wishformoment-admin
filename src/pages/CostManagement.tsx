import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fetchApi } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Receipt,
  RefreshCw,
  CreditCard,
  User,
  Calendar,
  DollarSign,
  TrendingUp,
  Server,
  Globe,
  Layers,
  Cloud,
  CheckCircle2,
  Zap,
  Clock,
  AlertCircle,
  Key,
  ShieldAlert,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// ── Types ───────────────────────────────────────────────────────────────────

interface ItemizedBreakdown {
  name: string;
  description: string;
  cost: number;
  unit?: string;
}

interface PlatformBillingItem {
  id: string;
  platformName: string;
  serviceName: string;
  category: string;
  payerName: string;
  payerEmail: string;
  paymentMethod: string;
  billingCycle: string;
  renewalDate: string;
  monthlyCost: number;
  currency: string;
  status: string;
  autoRenew: boolean;
  notes: string;
  apiEnabled: boolean;
  apiStatus: "connected" | "error" | "unconfigured";
  apiError: string | null;
  lastSyncedAt: string | null;
  itemizedBreakdown: ItemizedBreakdown[];
  accountDetails?: {
    organization?: string;
    planType?: string;
    serverRegion?: string;
    accountReference?: string;
  };
}

interface MonthOption {
  key: string;       // 'YYYY-MM'
  label: string;     // 'November 2026'
  isCurrent: boolean;
}

interface CostSummaryData {
  overview: {
    selectedMonth: string;
    totalMonthlyCost: number;
    projectedMonthlyCost: number;
    lastMonthCost: number;
    momChangePercent: number;
    activePlatformsCount: number;
    connectedApiCount: number;
    currency: string;
    lastUpdated: string;
  };
  availableMonths: MonthOption[];
  payerDistribution: Array<{
    payerName: string;
    totalAmount: number;
    percentage: number;
    platformsCount: number;
    platforms: string[];
  }>;
  platformDistribution: Array<{
    name: string;
    id: string;
    cost: number;
    percentage: number;
    category: string;
    color: string;
  }>;
  historicalTrend: Array<{
    month: string;
    monthKey: string;
    aws: number;
    digitalocean: number;
    vercel: number;
    hostinger: number;
    total: number;
  }>;
  platforms: PlatformBillingItem[];
}

const PLATFORM_ICONS: Record<string, any> = {
  hostinger: Globe,
  vercel: Zap,
  digitalocean: Server,
  aws: Cloud,
};

const PLATFORM_BADGE_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  hostinger: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", bar: "#673AB7" },
  vercel: { bg: "bg-slate-100", text: "text-slate-900", border: "border-slate-300", bar: "#0f172a" },
  digitalocean: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", bar: "#0080FF" },
  aws: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", bar: "#FF9900" },
};

const USD_TO_INR_RATE = 86.5;

export default function CostManagement() {
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedPlatformTab, setSelectedPlatformTab] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch summary from dynamic backend service with month filter
  const { data, isLoading, isRefetching, refetch } = useQuery<{ success: boolean; data: CostSummaryData }>({
    queryKey: ["costsSummary", selectedMonth],
    queryFn: () =>
      fetchApi(`/costs/summary${selectedMonth ? `?month=${selectedMonth}` : ""}`),
    staleTime: 5 * 60 * 1000,
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetchApi(`/costs/sync${selectedMonth ? `?month=${selectedMonth}` : ""}`, {
        method: "POST",
      });
      await refetch();
      toast.success("Live official APIs queried and refreshed successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to synchronize official API costs");
    } finally {
      setIsSyncing(false);
    }
  };

  const costData = data?.data;

  // Active month label
  const activeMonthLabel = useMemo(() => {
    if (!costData) return "";
    const active = costData.availableMonths?.find(
      (m) => m.key === (selectedMonth || costData.overview.selectedMonth)
    );
    return active ? active.label : selectedMonth;
  }, [costData, selectedMonth]);

  const isViewingCurrentMonth = useMemo(() => {
    if (!costData) return true;
    const active = costData.availableMonths?.find(
      (m) => m.key === (selectedMonth || costData.overview.selectedMonth)
    );
    return active ? active.isCurrent : true;
  }, [costData, selectedMonth]);

  // Format currency helper
  const formatCost = (valInUsd: number) => {
    if (currency === "INR") {
      const inr = Math.round(valInUsd * USD_TO_INR_RATE);
      return `₹${inr.toLocaleString("en-IN")}`;
    }
    return `$${valInUsd.toFixed(2)}`;
  };

  const filteredPlatforms = useMemo(() => {
    if (!costData?.platforms) return [];
    if (selectedPlatformTab === "all") return costData.platforms;
    return costData.platforms.filter((p) => p.id === selectedPlatformTab);
  }, [costData, selectedPlatformTab]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* ── Top Header with Month Filter ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-indigo-300">
                <Receipt className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Cost & Billing Analytics
              </h1>
            </div>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              100% Dynamic official API data for{" "}
              <span className="font-semibold text-white">Hostinger</span>,{" "}
              <span className="font-semibold text-white">Vercel</span>,{" "}
              <span className="font-semibold text-white">DigitalOcean</span>, and{" "}
              <span className="font-semibold text-white">AWS Cost Explorer</span>.
            </p>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3">
            {/* Month-Wise Filter Dropdown (Requested Feature) */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white shadow-inner">
              <Calendar className="w-4 h-4 text-indigo-300 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-indigo-300 leading-none">
                  Billing Month
                </span>
                <select
                  value={selectedMonth || costData?.overview.selectedMonth || ""}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-white font-bold outline-none cursor-pointer pr-1 text-xs"
                >
                  {costData?.availableMonths?.map((m) => (
                    <option key={m.key} value={m.key} className="text-slate-900 bg-white">
                      {m.label} {m.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-1 text-xs font-semibold">
              <button
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1.5 rounded-lg transition-all ${currency === "USD"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-white/80 hover:text-white"
                  }`}
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency("INR")}
                className={`px-3 py-1.5 rounded-lg transition-all ${currency === "INR"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-white/80 hover:text-white"
                  }`}
              >
                INR (₹)
              </button>
            </div>

            {/* Sync Button */}
            <Button
              onClick={handleSync}
              disabled={isSyncing || isRefetching}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 text-xs font-bold px-4 py-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncing || isRefetching ? "animate-spin" : ""}`}
              />
              <span>{isSyncing ? "Querying APIs..." : "Sync Live APIs"}</span>
            </Button>
          </div>
        </div>

        {/* ── Active Month Banner Indicator ────────────────────────────────────── */}
        {!isViewingCurrentMonth && (
          <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-2 font-medium">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>
                Viewing historical billing records for{" "}
                <strong className="font-bold underline">{activeMonthLabel}</strong>.
              </span>
            </div>
            <button
              onClick={() => setSelectedMonth("")}
              className="font-bold text-indigo-700 hover:text-indigo-900 underline"
            >
              Reset to Current Month
            </button>
          </div>
        )}

        {/* ── KPI Metric Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Selected Month Total */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isViewingCurrentMonth ? "Month-to-Date (Live)" : `${activeMonthLabel} Total`}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {isLoading ? "..." : formatCost(costData?.overview.totalMonthlyCost || 0)}
              </span>
              <span className="text-xs text-slate-400 font-medium">/mo</span>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium">
              Dynamic total for {activeMonthLabel}
            </div>
          </motion.div>

          {/* Card 2: Projected Month-End */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Forecasted Month-End
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {isLoading ? "..." : formatCost(costData?.overview.projectedMonthlyCost || 0)}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              AWS ML Forecast & run-rate projection
            </p>
          </motion.div>

          {/* Card 3: Previous Month Total */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Last Month Closed Cost
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {isLoading ? "..." : formatCost(costData?.overview.lastMonthCost || 0)}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Historical closed billing invoices</p>
          </motion.div>

          {/* Card 4: Connected APIs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official API Status
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">
                {costData?.overview.connectedApiCount || 0} / 4 Connected
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span
                className={`inline-block w-2 h-2 rounded-full ${(costData?.overview.connectedApiCount || 0) > 0 ? "bg-emerald-500" : "bg-amber-500"
                  }`}
              />
              <span>Live official API integration health</span>
            </div>
          </motion.div>
        </div>

        {/* ── Bill Payers & Responsibility Table ───────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Bill Ownership & Payment Responsibility ({activeMonthLabel})
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Tracks the verified individual who pays each bill, payment method, renewal dates, and API status.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/60 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-6">Platform & Service</th>
                  <th className="py-3.5 px-6">Paid By (Payer Name)</th>
                  <th className="py-3.5 px-6">Payment Method</th>
                  <th className="py-3.5 px-6">Renewal Cycle</th>
                  <th className="py-3.5 px-6">API Status</th>
                  <th className="py-3.5 px-6 text-right">Cost ({activeMonthLabel})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {costData?.platforms.map((p) => {
                  const Icon = PLATFORM_ICONS[p.id] || Server;
                  const theme = PLATFORM_BADGE_COLORS[p.id] || PLATFORM_BADGE_COLORS.digitalocean;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Platform & Service */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${theme.bg} ${theme.text} border ${theme.border}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {p.platformName}
                            </div>
                            <div className="text-xs text-slate-500 max-w-xs truncate">
                              {p.serviceName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Paid By */}
                      <td className="py-4 px-6">
                        {p.payerName !== "Not Found" ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shadow-inner">
                              {p.payerName.slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800">{p.payerName}</div>
                              <div className="text-[11px] text-slate-400">
                                {p.payerEmail !== "Not Found" ? p.payerEmail : "Email Not Found"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-slate-400 bg-slate-100">
                            Not Found
                          </span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-4 px-6">
                        {p.paymentMethod !== "Not Found" ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.paymentMethod}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not Found</span>
                        )}
                      </td>

                      {/* Renewal Date & Cycle */}
                      <td className="py-4 px-6">
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                            {p.billingCycle !== "Not Found" ? p.billingCycle : "Not Found"}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{p.renewalDate !== "Not Found" ? p.renewalDate : "Not Found"}</span>
                          </div>
                        </div>
                      </td>

                      {/* API Connection Status */}
                      <td className="py-4 px-6">
                        {p.apiStatus === "connected" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Live API Connected
                          </span>
                        ) : p.apiStatus === "error" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5" />
                            API Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <Key className="w-3.5 h-3.5" />
                            Token Not Set
                          </span>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="py-4 px-6 text-right">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {formatCost(p.monthlyCost)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Visual Analytics Section: Charts ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Donut Chart: Cost Breakdown by Platform */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-900 text-base">Cost Distribution</h3>
                <span className="text-xs text-slate-400 font-medium">{activeMonthLabel}</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Proportion of expenditure reported by active official APIs
              </p>
            </div>

            <div className="h-56 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costData?.platformDistribution || []}
                    dataKey="cost"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {costData?.platformDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: any) => [formatCost(Number(value)), "Cost"]}
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "8px",
                      color: "#fff",
                      border: "none",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                <span className="text-lg font-black text-slate-900">
                  {formatCost(costData?.overview.totalMonthlyCost || 0)}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {costData?.platformDistribution.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="truncate">
                    <span className="font-semibold text-slate-800">{entry.name}</span>
                    <span className="text-slate-400 ml-1">({entry.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Area Chart: 6-Month Expenditure Trend with Click-to-Filter */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-900 text-base">Monthly Spending Trend</h3>
                <span className="text-xs text-slate-400 font-medium">Past 6 Months (Official APIs)</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Click any month point on the chart to inspect that specific month&apos;s itemized bills
              </p>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={costData?.historicalTrend || []}
                  onClick={(e) => {
                    if (e && e.activePayload && e.activePayload[0]?.payload?.monthKey) {
                      setSelectedMonth(e.activePayload[0].payload.monthKey);
                    }
                  }}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <RechartsTooltip
                    formatter={(val: any) => [`$${Number(val).toFixed(2)}`, ""]}
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "8px",
                      color: "#fff",
                      border: "none",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
                  <Area
                    type="monotone"
                    dataKey="aws"
                    name="AWS"
                    stroke="#FF9900"
                    fill="#FF9900"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="digitalocean"
                    name="DigitalOcean"
                    stroke="#0080FF"
                    fill="#0080FF"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="vercel"
                    name="Vercel"
                    stroke="#0f172a"
                    fill="#0f172a"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="hostinger"
                    name="Hostinger"
                    stroke="#673AB7"
                    fill="#673AB7"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Platform Itemized Cards Grid ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Official API Itemized Breakdown ({activeMonthLabel})
              </h2>
              <p className="text-xs text-slate-500">
                Direct dynamic consumption metrics returned by each platform&apos;s billing API for {activeMonthLabel}.
              </p>
            </div>

            {/* Platform Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setSelectedPlatformTab("all")}
                className={`px-3 py-1.5 rounded-lg transition-all ${selectedPlatformTab === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                All Platforms
              </button>
              {costData?.platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatformTab(p.id)}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${selectedPlatformTab === p.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  {p.platformName}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPlatforms.map((p) => {
              const Icon = PLATFORM_ICONS[p.id] || Server;
              const theme = PLATFORM_BADGE_COLORS[p.id] || PLATFORM_BADGE_COLORS.digitalocean;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className={`p-3 rounded-2xl ${theme.bg} ${theme.text} border ${theme.border}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-base">{p.platformName}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                            {p.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{p.serviceName}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-extrabold text-slate-900">
                        {p.apiStatus === "connected" ? formatCost(p.monthlyCost) : "$0.00"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {p.billingCycle !== "Not Found" ? p.billingCycle : "Cycle Not Set"}
                      </div>
                    </div>
                  </div>

                  {/* Payer & Ownership Badge */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-500">Paid by:</span>
                      {p.payerName !== "Not Found" ? (
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          {p.payerName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not Found</span>
                      )}
                      {p.paymentMethod !== "Not Found" && (
                        <span className="text-slate-400">({p.paymentMethod})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Renewal:{" "}
                        {p.renewalDate !== "Not Found" ? p.renewalDate : "Not Found"}
                      </span>
                    </div>
                  </div>

                  {/* Itemized Line Items or Setup Callout */}
                  <div className="p-5 flex-1">
                    {p.apiError && (
                      <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-950">
                          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Official API Notice:</span>
                        </div>
                        <p className="text-amber-800 text-[11px] pl-5">{p.apiError}</p>
                      </div>
                    )}

                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Dynamic API Line Items ({activeMonthLabel})
                    </div>

                    {p.itemizedBreakdown.length > 0 ? (
                      <div className="space-y-2.5">
                        {p.itemizedBreakdown.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">{item.name}</div>
                              <div className="text-[11px] text-slate-400">{item.description}</div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-slate-900">{formatCost(item.cost)}</span>
                              {item.unit && (
                                <div className="text-[10px] text-slate-400 font-medium">{item.unit}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        No active charges reported by official API for {activeMonthLabel}.
                      </div>
                    )}
                  </div>

                  {/* Card Footer: API Status */}
                  <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">API Status:</span>
                    <strong
                      className={`text-[11px] font-semibold ${
                        p.apiStatus === "connected"
                          ? "text-emerald-600"
                          : p.apiStatus === "error"
                          ? "text-amber-600"
                          : "text-slate-500"
                      }`}
                    >
                      {p.status}
                    </strong>
                    {p.lastSyncedAt && (
                      <span className="ml-auto text-[10px] text-slate-400">
                        Last synced: {new Date(p.lastSyncedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>
    </DashboardLayout>
  );
}
