import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  CreditCard,
  Search,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface PaymentRecord {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  amount_inr: number;
  status: "created" | "paid" | "failed" | "refunded";
  wish_id: string | null;
  razorpay_refund_id?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  refunded_at?: string | null;
  created_at: string;
  updated_at: string;
  user_email: string | null;
  user_display_name: string | null;
  template_name: string | null;
}

interface PaymentsResponse {
  rows: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: {
    total_revenue_inr: string;
    paid_count: string;
    failed_count: string;
    pending_count: string;
    refunded_count?: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmountDisplay(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

function formatInr(paise: number | string): string {
  const n = typeof paise === "string" ? parseFloat(paise) : paise;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n / 100);
}

const STATUS_META = {
  paid:     { label: "Paid",     bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", Icon: CheckCircle2 },
  failed:   { label: "Failed",   bg: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500",     Icon: XCircle },
  created:  { label: "Pending",  bg: "bg-amber-50 text-amber-700 border-amber-200",        dot: "bg-amber-500",   Icon: Clock },
  refunded: { label: "Refunded", bg: "bg-purple-50 text-purple-700 border-purple-200",    dot: "bg-purple-500",  Icon: RotateCcw },
} as const;

function StatusBadge({ status }: { status: "paid" | "failed" | "created" | "refunded" }) {
  const meta = STATUS_META[status] ?? STATUS_META.created;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copied!"));
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ["all", "paid", "refunded", "failed", "created"] as const;

const PaymentHistory = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
  const limit = 20;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status: statusFilter,
  });
  if (search.trim()) params.set("search", search.trim());

  const { data, isLoading, refetch, isFetching } = useQuery<PaymentsResponse>({
    queryKey: ["adminPayments", page, statusFilter, search],
    queryFn: () => fetchApi(`/payments?${params.toString()}`),
    placeholderData: (prev) => prev,
  });

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const stats = data?.stats;
  const rows = data?.rows ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="sub-label mb-1">Finance</p>
            <h1 className="section-header text-3xl">Payment History</h1>
            <p className="text-sm text-muted-foreground mt-1">
              All payment transactions across all users
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="self-start sm:self-auto flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={IndianRupee}
              label="Total Revenue (INR)"
              value={formatInr(stats.total_revenue_inr)}
              color="bg-emerald-100 text-emerald-700"
            />
            <StatCard
              icon={CheckCircle2}
              label="Successful"
              value={stats.paid_count}
              color="bg-violet-100 text-violet-700"
            />
            <StatCard
              icon={XCircle}
              label="Failed"
              value={stats.failed_count}
              color="bg-red-100 text-red-700"
            />
            <StatCard
              icon={Clock}
              label="Pending"
              value={stats.pending_count}
              color="bg-amber-100 text-amber-700"
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Search by email or order ID…"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleFilterChange(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition capitalize ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {s === "created" ? "Pending" : s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_100px] gap-4 px-5 py-3 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>User / Template</span>
            <span>Order ID</span>
            <span>Amount</span>
            <span>Currency</span>
            <span>Date</span>
            <span>Status</span>
          </div>

          {isLoading && (
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-5 py-4 grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_100px] gap-4 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-3 w-32 bg-muted rounded" />
                    <div className="h-2.5 w-24 bg-muted/70 rounded" />
                  </div>
                  <div className="h-3 w-36 bg-muted rounded self-center" />
                  <div className="h-3 w-20 bg-muted rounded self-center" />
                  <div className="h-3 w-10 bg-muted rounded self-center" />
                  <div className="h-3 w-24 bg-muted rounded self-center" />
                  <div className="h-5 w-16 bg-muted rounded-full self-center" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <CreditCard className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">No payments found</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Try adjusting your search or filters.
                </p>
              </div>
            </div>
          )}

          {!isLoading && rows.length > 0 && (
            <div className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {rows.map((row, idx) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: idx * 0.03 }}
                  >
                    {/* Row */}
                    <div
                      className="grid md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_100px] gap-4 px-5 py-4 cursor-pointer hover:bg-accent/40 transition-colors"
                      onClick={() => setSelected(selected?.id === row.id ? null : row)}
                    >
                      {/* User / Template */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {row.template_name ?? "Unknown Template"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {row.user_email ?? "—"}
                          </p>
                        </div>
                      </div>

                      {/* Order ID */}
                      <div className="flex items-center gap-1.5 self-center min-w-0">
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {row.razorpay_order_id}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(row.razorpay_order_id); }}
                          className="shrink-0 text-muted-foreground/60 hover:text-foreground transition"
                          title="Copy order ID"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Amount */}
                      <p className="self-center text-sm font-bold text-foreground">
                        {formatAmountDisplay(row.amount, row.currency)}
                      </p>

                      {/* Currency */}
                      <span className="self-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground w-fit">
                        {row.currency}
                      </span>

                      {/* Date */}
                      <p className="self-center text-xs text-muted-foreground">
                        {format(new Date(row.created_at), "dd MMM yyyy, HH:mm")}
                      </p>

                      {/* Status */}
                      <div className="self-center">
                        <StatusBadge status={row.status} />
                      </div>
                    </div>

                    {/* Expandable detail row */}
                    <AnimatePresence>
                      {selected?.id === row.id && (
                        <motion.div
                          key="detail"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-border bg-muted/30"
                        >
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 px-5 py-4 text-xs">
                            <div>
                              <p className="text-muted-foreground mb-0.5">Payment ID (Razorpay)</p>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-medium text-foreground break-all">
                                  {row.razorpay_payment_id ?? "—"}
                                </span>
                                {row.razorpay_payment_id && (
                                  <button
                                    onClick={() => copyToClipboard(row.razorpay_payment_id!)}
                                    className="shrink-0 text-muted-foreground hover:text-foreground"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-0.5">Amount (INR)</p>
                              <p className="font-semibold text-foreground">{formatInr(row.amount_inr)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-0.5">User</p>
                              <p className="font-semibold text-foreground">
                                {row.user_display_name ?? row.user_email ?? "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-0.5">Last Updated</p>
                              <p className="font-semibold text-foreground">
                                {format(new Date(row.updated_at), "dd MMM yyyy, HH:mm")}
                              </p>
                            </div>
                            {row.wish_id && (
                              <div>
                                <p className="text-muted-foreground mb-0.5">Wish</p>
                                <a
                                  href={`${import.meta.env.VITE_FRONTEND_URL ?? "https://wishformoment.com"}/wish/${row.wish_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                                >
                                  View Wish <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            )}
                            <div>
                              <p className="text-muted-foreground mb-0.5">Internal ID</p>
                              <span className="font-mono text-foreground break-all">{row.id}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-5">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} &middot; {data?.total} records
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm text-foreground transition hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-sm text-foreground transition hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PaymentHistory;
