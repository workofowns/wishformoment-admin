import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  UserCheck,
  BadgeCheck,
  Shield,
  ShieldAlert,
  Trash2,
  Mail,
  Calendar,
  Clock,
  Sparkles,
  CreditCard,
  Eye,
  Share2,
  Copy,
  ExternalLink,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  FileText,
  Activity,
  History,
  CheckCircle2,
  XCircle,
  FolderHeart,
  Crown,
  Key,
  Globe,
  DollarSign,
  User as UserIcon,
  ShieldCheck,
  Lock,
  Send,
  RotateCcw,
} from "lucide-react";

import { fetchApi } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Types ────────────────────────────────────────────────────────────────────

interface UserDetails {
  id: string;
  email: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  deletion_scheduled_at: string | null;
  deletion_reason: string | null;
}

interface UserStats {
  total_wishes: number;
  published_wishes: number;
  draft_wishes: number;
  total_views: number;
  total_shares: number;
  total_payments: number;
  paid_payments: number;
  failed_payments: number;
  pending_payments: number;
  refunded_payments?: number;
  total_spent_inr: number;
}

interface UserResponse {
  user: UserDetails;
  stats: UserStats;
}

interface PaymentItem {
  id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  amount_inr: number;
  status: "created" | "paid" | "failed" | "refunded";
  wish_id: string | null;
  created_at: string;
  updated_at: string;
  template_id: string | null;
  template_name: string | null;
  template_slug: string | null;
  template_thumbnail: string | null;
  razorpay_refund_id?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  refunded_at?: string | null;
}

interface PaymentsResponse {
  rows: PaymentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface WishItem {
  id: string;
  user_id: string;
  template_id: string;
  is_premium: boolean;
  is_published: boolean;
  share_count: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  template_name: string;
  template_slug: string;
  template_thumbnail: string | null;
  template_price: number;
  category_name: string | null;
  payment_status: "paid" | "created" | "failed" | null;
  payment_amount: number | null;
  payment_currency: string | null;
}

interface WishesResponse {
  rows: WishItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface LogItem {
  id: string;
  actor_type: "admin" | "user" | "system";
  actor_name: string;
  action: string;
  details: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

interface LogsResponse {
  rows: LogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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

function copyToClipboard(text: string, label = "Copied to clipboard!") {
  navigator.clipboard.writeText(text).then(() => toast.success(label));
}

// ── Main Component ────────────────────────────────────────────────────────────

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Sub-resource pagination & filter states
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsStatus, setPaymentsStatus] = useState("all");
  const [paymentsSearch, setPaymentsSearch] = useState("");

  // Refund modal state
  const [refundModalPayment, setRefundModalPayment] = useState<PaymentItem | null>(null);
  const [refundReason, setRefundReason] = useState("");

  const [wishesPage, setWishesPage] = useState(1);
  const [wishesFilter, setWishesFilter] = useState("all");
  const [wishesSearch, setWishesSearch] = useState("");

  const [logsPage, setLogsPage] = useState(1);
  const [logsActorType, setLogsActorType] = useState("all");

  // 1. Fetch User Details & Stats
  const {
    data: userData,
    isLoading: isUserLoading,
    error: userError,
    refetch: refetchUser,
  } = useQuery<UserResponse>({
    queryKey: ["adminUserDetail", id],
    queryFn: () => fetchApi(`/users/${id}`),
    enabled: !!id,
  });

  // 2. Fetch User Payments (Limit 10)
  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
    refetch: refetchPayments,
  } = useQuery<PaymentsResponse>({
    queryKey: ["adminUserPayments", id, paymentsPage, paymentsStatus, paymentsSearch],
    queryFn: () =>
      fetchApi(
        `/users/${id}/payments?page=${paymentsPage}&limit=10&status=${paymentsStatus}&search=${encodeURIComponent(
          paymentsSearch
        )}`
      ),
    enabled: !!id,
  });

  // 3. Fetch User Wishes (Limit 10)
  const {
    data: wishesData,
    isLoading: isWishesLoading,
    refetch: refetchWishes,
  } = useQuery<WishesResponse>({
    queryKey: ["adminUserWishes", id, wishesPage, wishesFilter, wishesSearch],
    queryFn: () =>
      fetchApi(
        `/users/${id}/wishes?page=${wishesPage}&limit=10&filter=${wishesFilter}&search=${encodeURIComponent(
          wishesSearch
        )}`
      ),
    enabled: !!id,
  });

  // 4. Fetch Admin/User Audit Logs (Limit 10)
  const {
    data: logsData,
    isLoading: isLogsLoading,
    refetch: refetchLogs,
  } = useQuery<LogsResponse>({
    queryKey: ["adminUserLogs", id, logsPage, logsActorType],
    queryFn: () =>
      fetchApi(
        `/users/${id}/logs?page=${logsPage}&limit=10&actor_type=${logsActorType}`
      ),
    enabled: !!id,
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["adminUserLogs", id] });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("User updated successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update user"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => fetchApi(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      toast.success("User account deleted permanently");
      navigate("/users");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete user"),
  });

  const publishWishMutation = useMutation({
    mutationFn: (wishId: string) =>
      fetchApi(`/wishes/${wishId}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserWishes", id] });
      queryClient.invalidateQueries({ queryKey: ["adminUserDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["adminUserLogs", id] });
      toast.success("Wish published successfully by admin!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to publish wish"),
  });

  const deleteWishMutation = useMutation({
    mutationFn: (wishId: string) => fetchApi(`/wishes/${wishId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserWishes", id] });
      queryClient.invalidateQueries({ queryKey: ["adminUserDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["adminUserLogs", id] });
      toast.success("Wish deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete wish"),
  });

  const refundPaymentMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason?: string }) =>
      fetchApi(`/payments/${paymentId}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUserPayments", id] });
      queryClient.invalidateQueries({ queryKey: ["adminUserDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["adminUserLogs", id] });
      queryClient.invalidateQueries({ queryKey: ["adminPayments"] });
      toast.success("Payment refunded successfully via Razorpay");
      setRefundModalPayment(null);
      setRefundReason("");
    },
    onError: (err: any) => toast.error(err.message || "Failed to process refund"),
  });

  const refreshAll = () => {
    refetchUser();
    refetchPayments();
    refetchWishes();
    refetchLogs();
    toast.success("Refreshed user data");
  };

  if (isUserLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto py-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading user profile & history...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (userError || !userData?.user) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-16 text-center glass-card rounded-3xl p-8 border border-border">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">User Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The requested user account does not exist or has been permanently removed.
          </p>
          <Link
            to="/users"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const user = userData.user;
  const stats = userData.stats;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        {/* ── Top Navigation & Breadcrumbs ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/users")}
              className="p-2.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground transition-all hover:scale-105 active:scale-95"
              title="Back to Users"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Link to="/users" className="hover:text-primary transition-colors">
                  Users
                </Link>
                <span>/</span>
                <span className="text-foreground font-bold truncate max-w-[200px] sm:max-w-[300px]">
                  {user.display_name || user.email}
                </span>
              </div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">User Overview</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-card border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm("Hard delete this user permanently? All associated wishes and session data will be removed.")) {
                  deleteUserMutation.mutate();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete User</span>
            </button>
          </div>
        </div>

        {/* ── Account Deletion Warning Banner ── */}
        {user.deletion_scheduled_at && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-xs">
                <strong className="font-bold text-amber-700 dark:text-amber-400 block">
                  Account Deletion Scheduled
                </strong>
                <span className="text-muted-foreground">
                  User requested deletion on {format(new Date(user.deletion_scheduled_at), "PPP")}. Permanently purges on{" "}
                  {user.deletion_due_at ? format(new Date(user.deletion_due_at), "PPP") : "schedule"}.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 1: USER BASIC DETAIL BOX & STAT TILES
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="glass-card rounded-[2rem] p-6 sm:p-8 border border-border/60 shadow-md space-y-6">
          {/* Main User Profile Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border/40">
            {/* Avatar & Identifiers */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl btn-primary text-white font-black text-xl sm:text-2xl flex items-center justify-center shadow-md shrink-0">
                {(user.display_name || user.email)
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate max-w-[280px] sm:max-w-[400px]">
                    {user.display_name || "No Display Name"}
                  </h2>

                  {/* Verification Badge */}
                  {user.is_verified ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                      <BadgeCheck className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                      Unverified
                    </span>
                  )}

                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${user.role === "admin"
                      ? "bg-purple-100 text-purple-700 border border-purple-300"
                      : "bg-muted text-foreground/80 border border-border"
                      }`}
                  >
                    <Shield className="w-3 h-3" /> {user.role}
                  </span>
                </div>

                {/* Email with copy */}
                <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono truncate">{user.email}</span>
                  <button
                    onClick={() => copyToClipboard(user.email, "Email copied!")}
                    title="Copy Email"
                    className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>

                {/* User ID with copy */}
                <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono text-[10px] truncate select-all">{user.id}</span>
                  <button
                    onClick={() => copyToClipboard(user.id, "User ID copied!")}
                    title="Copy User ID"
                    className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Management Buttons */}
            <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
              <button
                onClick={() =>
                  updateUserMutation.mutate({ isVerified: !user.is_verified })
                }
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${user.is_verified
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                  }`}
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>{user.is_verified ? "Revoke Verification" : "Verify Account"}</span>
              </button>

              <button
                onClick={() => {
                  const nextRole = user.role === "admin" ? "user" : "admin";
                  if (
                    window.confirm(
                      `Change role for ${user.email} to '${nextRole.toUpperCase()}'?`
                    )
                  ) {
                    updateUserMutation.mutate({ role: nextRole });
                  }
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Make {user.role === "admin" ? "User" : "Admin"}</span>
              </button>
            </div>
          </div>

          {/* User Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/40">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                Auth Provider
              </span>
              <span className="text-xs font-bold text-foreground capitalize flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-primary" /> {user.provider || "Email"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                Joined Date
              </span>
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-emerald-500" />
                {format(new Date(user.created_at), "MMM d, yyyy")}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                Last Login
              </span>
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-blue-500" />
                {user.last_login_at ? format(new Date(user.last_login_at), "MMM d, yyyy p") : "Never"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-0.5">
                Last Updated
              </span>
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <History className="w-3 h-3 text-purple-500" />
                {format(new Date(user.updated_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          {/* 4 Summary Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {/* Total Wishes */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-purple-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-muted-foreground">Total Wishes</span>
                <div className="p-1.5 rounded-xl bg-purple-500/10 text-purple-600">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground">{stats.total_wishes}</p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                {stats.published_wishes} Live · {stats.draft_wishes} Drafts
              </p>
            </div>

            {/* Total Engagement */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-blue-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-muted-foreground">Engagement</span>
                <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600">
                  <Eye className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground">{stats.total_views}</p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                {stats.total_shares} Total Shares
              </p>
            </div>

            {/* Total Spent */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-emerald-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-muted-foreground">Total Spend</span>
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <DollarSign className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground">{formatInr(stats.total_spent_inr)}</p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                {stats.paid_payments} Successful Orders
              </p>
            </div>

            {/* Payments Count */}
            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-amber-200/60 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-muted-foreground">Transactions</span>
                <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              </div>
              <p className="text-2xl font-black text-foreground">{stats.total_payments}</p>
              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                {stats.paid_payments} Paid · {stats.refunded_payments ? `${stats.refunded_payments} Refunded · ` : ""}{stats.failed_payments} Failed
              </p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 2: USER PAYMENT HISTORY TABLE (Paginated)
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="glass-card rounded-[2rem] p-6 sm:p-8 border border-border/60 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black text-foreground tracking-tight">Payment History</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {paymentsData?.total ?? 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                All checkout orders and Razorpay transactions for this account
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={paymentsSearch}
                  onChange={(e) => {
                    setPaymentsSearch(e.target.value);
                    setPaymentsPage(1);
                  }}
                  placeholder="Search order / template..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-card border border-border text-foreground outline-none focus:ring-2 focus:ring-primary/30 w-44"
                />
              </div>

              <select
                value={paymentsStatus}
                onChange={(e) => {
                  setPaymentsStatus(e.target.value);
                  setPaymentsPage(1);
                }}
                className="py-1.5 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-semibold outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
                <option value="created">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Template / Wish</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Payment ID</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isPaymentsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          <span>Loading payments...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !paymentsData?.rows || paymentsData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="font-semibold">No payment records found for this user.</p>
                      </td>
                    </tr>
                  ) : (
                    paymentsData.rows.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        {/* Order ID */}
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{p.razorpay_order_id}</span>
                            <button
                              onClick={() => copyToClipboard(p.razorpay_order_id)}
                              className="text-muted-foreground hover:text-foreground"
                              title="Copy Order ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>

                        {/* Template */}
                        <td className="py-3 px-4 font-medium text-foreground">
                          <span className="font-bold">{p.template_name || "Custom Template"}</span>
                          {p.wish_id && (
                            <a
                              href={`/wish/${p.wish_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary flex items-center gap-0.5 hover:underline mt-0.5"
                            >
                              <span>View Wish</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 font-bold text-foreground">
                          <div>{formatAmountDisplay(p.amount, p.currency)}</div>
                          {p.currency !== "INR" && (
                            <span className="text-[10px] font-normal text-muted-foreground">
                              ({formatInr(p.amount_inr)})
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${p.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : p.status === "refunded"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : p.status === "failed"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${p.status === "paid"
                                  ? "bg-emerald-500"
                                  : p.status === "refunded"
                                    ? "bg-purple-500"
                                    : p.status === "failed"
                                      ? "bg-rose-500"
                                      : "bg-amber-500"
                                }`}
                            />
                            {p.status}
                          </span>
                        </td>

                        {/* Payment ID */}
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                          {p.razorpay_payment_id ? (
                            <div className="flex items-center gap-1">
                              <span>{p.razorpay_payment_id}</span>
                              <button
                                onClick={() => copyToClipboard(p.razorpay_payment_id!)}
                                className="hover:text-foreground"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-muted-foreground font-medium">
                          {format(new Date(p.created_at), "MMM d, yyyy p")}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {p.status === "paid" ? (
                            <button
                              onClick={() => {
                                setRefundModalPayment(p);
                                setRefundReason("");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl bg-rose-50 text-rose-600 border border-rose-200/80 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-xs cursor-pointer active:scale-95"
                              title="Issue refund to user"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Refund</span>
                            </button>
                          ) : p.status === "refunded" ? (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50/60 px-2 py-0.5 rounded-lg border border-rose-100"
                              title={p.razorpay_refund_id ? `Refund ID: ${p.razorpay_refund_id}` : "Refunded"}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Refunded
                            </span>
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (If > 10 records or multiple pages) */}
            {paymentsData && paymentsData.total > 10 && (
              <div className="px-4 py-3 bg-muted/20 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Showing {(paymentsPage - 1) * 10 + 1} to{" "}
                  {Math.min(paymentsPage * 10, paymentsData.total)} of {paymentsData.total} payments
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={paymentsPage <= 1}
                    onClick={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold px-2">
                    {paymentsPage} / {paymentsData.totalPages || 1}
                  </span>
                  <button
                    disabled={paymentsPage >= (paymentsData.totalPages || 1)}
                    onClick={() => setPaymentsPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 3: USER CREATED WISHES TABLE (Paginated)
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="glass-card rounded-[2rem] p-6 sm:p-8 border border-border/60 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FolderHeart className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-black text-foreground tracking-tight">Created Wishes</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {wishesData?.total ?? 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                All personalized virtual wishes created by this user
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={wishesSearch}
                  onChange={(e) => {
                    setWishesSearch(e.target.value);
                    setWishesPage(1);
                  }}
                  placeholder="Search wish title..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-card border border-border text-foreground outline-none focus:ring-2 focus:ring-primary/30 w-44"
                />
              </div>

              <select
                value={wishesFilter}
                onChange={(e) => {
                  setWishesFilter(e.target.value);
                  setWishesPage(1);
                }}
                className="py-1.5 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-semibold outline-none cursor-pointer"
              >
                <option value="all">All Wishes</option>
                <option value="published">Published (Live)</option>
                <option value="draft">Drafts</option>
                <option value="premium">Premium</option>
                <option value="free">Free</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <th className="py-3.5 px-4">Wish / Template</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">License Type</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Views / Shares</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isWishesLoading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          <span>Loading user wishes...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !wishesData?.rows || wishesData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="font-semibold">No wishes found for this user.</p>
                      </td>
                    </tr>
                  ) : (
                    wishesData.rows.map((w) => (
                      <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                        {/* Title & Thumbnail */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {w.template_thumbnail ? (
                              <img
                                src={w.template_thumbnail}
                                alt={w.template_name}
                                className="w-10 h-10 rounded-xl object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shrink-0 font-bold">
                                🎁
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate max-w-[160px] sm:max-w-[200px]">
                                {w.template_name}
                              </p>
                              <span className="font-mono text-[9px] text-muted-foreground block">
                                ID: {w.id.substring(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 font-medium text-muted-foreground">
                          {w.category_name || "General"}
                        </td>

                        {/* License Type */}
                        <td className="py-3 px-4">
                          {w.is_premium ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                              <Crown className="w-3 h-3 text-amber-500" /> Premium
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                              Free
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {w.is_published ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                              Draft
                            </span>
                          )}
                        </td>

                        {/* Views / Shares */}
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              <Eye className="w-3 h-3 text-blue-500" /> {w.view_count || 0}
                            </span>
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                              <Share2 className="w-3 h-3 text-purple-500" /> {w.share_count || 0}
                            </span>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="py-3 px-4 font-medium text-muted-foreground">
                          {format(new Date(w.created_at), "MMM d, yyyy")}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Publish button for drafts */}
                            {!w.is_published && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Publish this draft wish ("${w.template_name}") manually for the user?`
                                    )
                                  ) {
                                    publishWishMutation.mutate(w.id);
                                  }
                                }}
                                title="Manually Publish Wish"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                <span>Publish</span>
                              </button>
                            )}

                            {w.is_published && (
                              <a
                                href={`/wish/${w.id}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Open Live Wish"
                                className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm("Permanently delete this wish?")) {
                                  deleteWishMutation.mutate(w.id);
                                }
                              }}
                              title="Delete Wish"
                              className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (If > 10 records or multiple pages) */}
            {wishesData && wishesData.total > 10 && (
              <div className="px-4 py-3 bg-muted/20 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Showing {(wishesPage - 1) * 10 + 1} to{" "}
                  {Math.min(wishesPage * 10, wishesData.total)} of {wishesData.total} wishes
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={wishesPage <= 1}
                    onClick={() => setWishesPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold px-2">
                    {wishesPage} / {wishesData.totalPages || 1}
                  </span>
                  <button
                    disabled={wishesPage >= (wishesData.totalPages || 1)}
                    onClick={() => setWishesPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 4: ADMIN & ACTIVITY AUDIT LOGS TABLE (Paginated)
        ════════════════════════════════════════════════════════════════════════ */}
        <div className="glass-card rounded-[2rem] p-6 sm:p-8 border border-border/60 shadow-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-black text-foreground tracking-tight">Admin & Activity Logs</h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {logsData?.total ?? 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit trail of admin interventions and lifecycle activity for this user
              </p>
            </div>

            {/* Filter by Actor */}
            <div className="flex items-center gap-2">
              <select
                value={logsActorType}
                onChange={(e) => {
                  setLogsActorType(e.target.value);
                  setLogsPage(1);
                }}
                className="py-1.5 px-3 text-xs rounded-xl bg-card border border-border text-foreground font-semibold outline-none cursor-pointer"
              >
                <option value="all">All Logs</option>
                <option value="admin">Admin Actions Only</option>
                <option value="user">User Activities Only</option>
                <option value="system">System / Payments Only</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-border/60 overflow-hidden bg-card/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Actor</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Details / Metadata</th>
                    <th className="py-3.5 px-4 text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {isLogsLoading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          <span>Loading audit logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !logsData?.rows || logsData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                        <p className="font-semibold">No audit logs recorded for this user yet.</p>
                      </td>
                    </tr>
                  ) : (
                    logsData.rows.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, yyyy p")}
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.actor_type === "admin"
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : log.actor_type === "system"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                          >
                            <span className="font-black">{log.actor_type}:</span> {log.actor_name}
                          </span>
                        </td>

                        {/* Action Badge */}
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          <span className="px-2 py-0.5 rounded-md bg-muted text-[11px]">
                            {log.action}
                          </span>
                        </td>

                        {/* Details */}
                        <td className="py-3 px-4 font-mono text-[10px] text-muted-foreground max-w-xs truncate">
                          {log.details ? (
                            <span title={JSON.stringify(log.details, null, 2)}>
                              {JSON.stringify(log.details)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="py-3 px-4 text-right font-mono text-[10px] text-muted-foreground">
                          {log.ip_address || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls (If > 10 records or multiple pages) */}
            {logsData && logsData.total > 10 && (
              <div className="px-4 py-3 bg-muted/20 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Showing {(logsPage - 1) * 10 + 1} to{" "}
                  {Math.min(logsPage * 10, logsData.total)} of {logsData.total} logs
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={logsPage <= 1}
                    onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold px-2">
                    {logsPage} / {logsData.totalPages || 1}
                  </span>
                  <button
                    disabled={logsPage >= (logsData.totalPages || 1)}
                    onClick={() => setLogsPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Refund Confirmation Modal ── */}
        <Dialog
          open={!!refundModalPayment}
          onOpenChange={(open) => {
            if (!open) {
              setRefundModalPayment(null);
              setRefundReason("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md bg-card border-border/80">
            <DialogHeader>
              <div className="flex items-center gap-2.5 text-rose-600">
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <DialogTitle className="text-lg font-black text-foreground">
                  Refund Payment
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                Issue a refund to the customer via Razorpay. This will process immediately.
              </DialogDescription>
            </DialogHeader>

            {refundModalPayment && (
              <div className="space-y-4 py-2">
                {/* Summary card */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">User:</span>
                    <span className="font-bold text-foreground">{userData?.user?.display_name || userData?.user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="font-mono font-medium text-foreground">{refundModalPayment.razorpay_order_id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment ID:</span>
                    <span className="font-mono font-medium text-foreground">{refundModalPayment.razorpay_payment_id || "—"}</span>
                  </div>
                  {refundModalPayment.template_name && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Template:</span>
                      <span className="font-bold text-foreground">{refundModalPayment.template_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-border/40 text-sm">
                    <span className="font-bold text-foreground">Refund Amount:</span>
                    <span className="font-black text-rose-600 text-base">
                      {formatAmountDisplay(refundModalPayment.amount, refundModalPayment.currency)}
                      {refundModalPayment.currency !== "INR" && (
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({formatInr(refundModalPayment.amount_inr)})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Warning alert */}
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Important Notice</p>
                    <p className="text-[11px] leading-relaxed text-rose-700">
                      The payment will be refunded to the customer&apos;s original payment method via Razorpay. Any associated published wish will be unpublished and template usage count will be adjusted.
                    </p>
                  </div>
                </div>

                {/* Reason input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Reason for Refund (Optional)
                  </label>
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="e.g. Customer requested cancellation, accidental charge"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-card border border-border text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => {
                  setRefundModalPayment(null);
                  setRefundReason("");
                }}
                disabled={refundPaymentMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (refundModalPayment) {
                    refundPaymentMutation.mutate({
                      paymentId: refundModalPayment.id,
                      reason: refundReason.trim() || undefined,
                    });
                  }
                }}
                disabled={refundPaymentMutation.isPending}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refundPaymentMutation.isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Refund…</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Refund</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserDetailPage;
