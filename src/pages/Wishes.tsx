import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { 
  Sparkles, 
  Search, 
  Trash2, 
  Eye, 
  ExternalLink, 
  LayoutGrid, 
  User, 
  Calendar, 
  Share2, 
  X, 
  Crown, 
  Copy, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  RefreshCw, 
  Lock, 
  Globe, 
  FileText, 
  TrendingUp, 
  Code2, 
  Check,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Wish {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  template_id: string;
  template_name: string;
  template_slug?: string;
  component?: string;
  form_data?: Record<string, any>;
  is_premium?: boolean;
  is_published?: boolean;
  is_protected?: boolean;
  password_hash?: string | null;
  share_count: number;
  view_count: number;
  created_at: string;
  updated_at?: string;
  payment_id?: string | null;
  published_at?: string | null;
  template_thumbnail?: string;
}

interface WishesResponse {
  rows: Wish[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const getLiveWishUrl = (id: string) => {
  const envUrl = import.meta.env.VITE_FRONTEND_URL;
  if (envUrl) {
    return `${envUrl.replace(/\/+$/, "")}/wish/${id}`;
  }
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return `http://localhost:3000/wish/${id}`;
  }
  return `https://wishformoment.com/wish/${id}`;
};

const getWishThumbnail = (wish: Wish): string | null => {
  if (wish.template_thumbnail) return wish.template_thumbnail;
  const fd = wish.form_data;
  if (!fd) return null;
  if (typeof fd.heroPhoto1 === "string" && fd.heroPhoto1.startsWith("http")) return fd.heroPhoto1;
  if (typeof fd.memory1Image === "string" && fd.memory1Image.startsWith("http")) return fd.memory1Image;
  if (typeof fd.memory1Img === "string" && fd.memory1Img.startsWith("http")) return fd.memory1Img;
  if (typeof fd.memory2Img === "string" && fd.memory2Img.startsWith("http")) return fd.memory2Img;
  if (typeof fd.person1_photo === "string" && fd.person1_photo.startsWith("http")) return fd.person1_photo;
  if (typeof fd.person2_photo === "string" && fd.person2_photo.startsWith("http")) return fd.person2_photo;
  if (typeof fd.memoryPhoto1 === "string" && fd.memoryPhoto1.startsWith("http")) return fd.memoryPhoto1;
  if (typeof fd.heroImages === "string") {
    try {
      const parsed = JSON.parse(fd.heroImages);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string" && parsed[0].startsWith("http")) {
        return parsed[0];
      }
    } catch {
      // ignore JSON parse error
    }
  }
  if (typeof fd.memoryImages === "string") {
    try {
      const parsed = JSON.parse(fd.memoryImages);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "string" && parsed[0].startsWith("http")) {
        return parsed[0];
      }
    } catch {
      // ignore JSON parse error
    }
  }
  return null;
};

// ── Main Component ─────────────────────────────────────────────────────────────

const Wishes = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft" | "premium" | "free">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showJsonData, setShowJsonData] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: wishesRes, isLoading, isFetching, refetch } = useQuery<WishesResponse | { data: Wish[] } | Wish[]>({
    queryKey: ["adminWishes", page, limit],
    queryFn: () => fetchApi(`/wishes?page=${page}&limit=${limit}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/wishes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWishes"] });
      toast.success("Wish deleted successfully");
      setSelectedWish(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete wish")
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/wishes/${id}/publish`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminWishes"] });
      toast.success("Wish published successfully!");
      if (selectedWish) {
        setSelectedWish({ ...selectedWish, is_published: true, published_at: new Date().toISOString() });
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to publish wish")
  });

  // Extract wishes from paginated response ({ rows: [...] }) or fallback structures
  const wishes: Wish[] =
    (wishesRes as WishesResponse)?.rows ||
    (wishesRes as any)?.data?.rows ||
    (wishesRes as { data: Wish[] })?.data ||
    (Array.isArray(wishesRes) ? wishesRes : []);

  const totalCount = (wishesRes as WishesResponse)?.total ?? wishes.length;
  const totalPages = (wishesRes as WishesResponse)?.totalPages ?? Math.max(1, Math.ceil(totalCount / limit));

  // Quick stats
  const publishedCount = wishes.filter(w => w.is_published).length;
  const draftCount = wishes.filter(w => !w.is_published).length;
  const premiumCount = wishes.filter(w => w.is_premium).length;
  const totalViews = wishes.reduce((sum, w) => sum + (Number(w.view_count) || 0), 0);

  // Client-side search and filtering on current page
  const filtered = wishes.filter((w: Wish) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      w.template_name?.toLowerCase().includes(q) ||
      w.id?.toLowerCase().includes(q) ||
      w.user_email?.toLowerCase().includes(q) ||
      w.component?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterStatus === "published") return w.is_published;
    if (filterStatus === "draft") return !w.is_published;
    if (filterStatus === "premium") return w.is_premium;
    if (filterStatus === "free") return !w.is_premium;

    return true;
  });

  const handleCopy = (text: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="sub-label mb-1">Content Management</p>
            <div className="flex items-center gap-3">
              <h1 className="section-header text-3xl">Wishes</h1>
              <span className="text-xs font-bold text-muted-foreground bg-muted/80 px-3 py-1 rounded-full border border-border">
                {totalCount} Total
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-bold text-foreground transition-all shadow-sm disabled:opacity-50"
              title="Refresh list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Executive Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{totalCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Wishes</p>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{publishedCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Live Wishes</p>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{draftCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Drafts</p>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-black text-foreground">{totalViews}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Impressions</p>
            </div>
          </div>
        </div>

        {/* Control Bar: Filters & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-2 rounded-2xl border border-border">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1">
            {(
              [
                { id: "all", label: "All", count: totalCount },
                { id: "published", label: "Live", count: publishedCount },
                { id: "draft", label: "Drafts", count: draftCount },
                { id: "premium", label: "Premium", count: premiumCount },
                { id: "free", label: "Free", count: totalCount - premiumCount },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterStatus === tab.id
                    ? "bg-primary text-white shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    filterStatus === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Page Size */}
          <div className="flex items-center gap-2 px-1">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search wishes, templates, users..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-background border border-border text-xs outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-foreground outline-none cursor-pointer"
            >
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Premium Table Container */}
        <div className="rounded-[1.75rem] border border-border bg-card shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  <th className="py-4 px-5 min-w-[260px]">Wish / Template</th>
                  <th className="py-4 px-4 min-w-[190px]">Creator</th>
                  <th className="py-4 px-3 w-[100px]">Type</th>
                  <th className="py-4 px-3 w-[110px]">Status</th>
                  <th className="py-4 px-3 text-center w-[90px]">Views</th>
                  <th className="py-4 px-3 text-center w-[90px]">Shares</th>
                  <th className="py-4 px-4 min-w-[130px]">Created</th>
                  <th className="py-4 px-5 text-right min-w-[140px]">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-24 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="font-semibold text-sm">Loading wishes catalog...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
                          <Sparkles className="w-7 h-7 text-muted-foreground/40" />
                        </div>
                        <h4 className="text-base font-bold text-foreground mb-1">
                          {search || filterStatus !== "all" ? "No matching wishes found" : "No wishes created yet"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {search || filterStatus !== "all"
                            ? "Try refining your search keyword or clearing the status filter."
                            : "Wishes created by users on the platform will appear here."}
                        </p>
                        {(search || filterStatus !== "all") && (
                          <button
                            onClick={() => {
                              setSearch("");
                              setFilterStatus("all");
                            }}
                            className="mt-4 px-4 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((wish: Wish, idx: number) => {
                    const thumbnail = getWishThumbnail(wish);
                    return (
                      <motion.tr
                        key={wish.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setSelectedWish(wish)}
                        className="group hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        {/* 1. Wish & Template */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3.5">
                            {/* Thumbnail */}
                            <div className="w-11 h-11 rounded-xl overflow-hidden border border-border bg-muted/60 shrink-0 flex items-center justify-center relative shadow-sm">
                              {thumbnail ? (
                                <img
                                  src={thumbnail}
                                  alt={wish.template_name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Sparkles className="w-5 h-5 text-primary/40" />
                              )}
                            </div>

                            {/* Name & ID */}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-foreground truncate max-w-[220px] capitalize group-hover:text-primary transition-colors">
                                {wish.template_name?.replace(/-/g, " ")}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {wish.component && (
                                  <span className="text-[10px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.2 rounded-md truncate max-w-[120px]">
                                    {wish.component}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => handleCopy(wish.id, e)}
                                  className="text-[10px] font-mono text-muted-foreground/70 hover:text-foreground flex items-center gap-0.5 truncate"
                                  title="Copy Wish ID"
                                >
                                  <span>{wish.id.slice(0, 8)}...</span>
                                  {copiedId === wish.id ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 opacity-60" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Creator */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              {wish.user_email ? (
                                <p className="text-xs font-semibold text-foreground truncate max-w-[170px]" title={wish.user_email}>
                                  {wish.user_email}
                                </p>
                              ) : (
                                <span className="text-[10px] font-bold text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-full">
                                  Guest User
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Type */}
                        <td className="py-3.5 px-3">
                          {wish.is_premium ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                              <Crown className="w-3 h-3" /> Premium
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-600 border border-slate-500/20">
                              Free
                            </span>
                          )}
                        </td>

                        {/* 4. Status */}
                        <td className="py-3.5 px-3">
                          {wish.is_published ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Draft
                            </span>
                          )}
                        </td>

                        {/* 5. Impressions */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-foreground">
                            <Eye className="w-3 h-3 text-blue-500" />
                            {wish.view_count || 0}
                          </span>
                        </td>

                        {/* 6. Engagements */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-foreground">
                            <Share2 className="w-3 h-3 text-emerald-500" />
                            {wish.share_count || 0}
                          </span>
                        </td>

                        {/* 7. Created Date */}
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {format(new Date(wish.created_at), "MMM d, yyyy")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(wish.created_at), "hh:mm a")}
                            </p>
                          </div>
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Live View Link */}
                            <a
                              href={getLiveWishUrl(wish.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Live Wish"
                              className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* Inspect Detail Modal */}
                            <button
                              type="button"
                              onClick={() => setSelectedWish(wish)}
                              title="Inspect Wish Details"
                              className="p-2 rounded-xl bg-muted text-foreground hover:bg-muted-foreground/20 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Quick Publish if Draft */}
                            {!wish.is_published && (
                              <button
                                type="button"
                                onClick={() => publishMutation.mutate(wish.id)}
                                title="Publish Wish Live"
                                disabled={publishMutation.isPending}
                                className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("Permanently delete this wish? This cannot be undone.")) {
                                  deleteMutation.mutate(wish.id);
                                }
                              }}
                              title="Delete Wish"
                              disabled={deleteMutation.isPending}
                              className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="px-6 py-4 bg-muted/20 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground font-semibold">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} wishes
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-foreground transition-all shadow-sm"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="font-bold px-3 py-1 bg-muted/60 rounded-lg text-foreground">
                  {page} / {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-foreground transition-all shadow-sm"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Detail Inspection Drawer / View */}
        <AnimatePresence>
          {selectedWish && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4 overflow-y-auto"
              onClick={() => setSelectedWish(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                className="w-full max-w-xl bg-card rounded-[2.5rem] shadow-2xl border border-border p-6 sm:p-8 overflow-hidden relative my-6 max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedWish(null)}
                  className="absolute top-6 right-6 p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors z-20"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="overflow-y-auto custom-scrollbar pr-1 -mr-1 flex-1 space-y-6">
                  {/* Thumbnail / Header Banner */}
                  {getWishThumbnail(selectedWish) && (
                    <div className="w-full h-48 rounded-2xl overflow-hidden border border-border relative bg-muted/50">
                      <img
                        src={getWishThumbnail(selectedWish)!}
                        alt={selectedWish.template_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 flex gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md ${
                            selectedWish.is_published
                              ? "bg-emerald-500/90 text-white"
                              : "bg-amber-500/90 text-white"
                          }`}
                        >
                          {selectedWish.is_published ? "● Live" : "○ Draft"}
                        </span>
                        {selectedWish.is_premium && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/90 text-white backdrop-blur-md flex items-center gap-1">
                            <Crown className="w-3 h-3" /> Premium
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Title & Identity */}
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight capitalize">
                      {selectedWish.template_name?.replace(/-/g, " ")}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                        {selectedWish.component || selectedWish.template_name}
                      </span>
                      <button
                        onClick={(e) => handleCopy(selectedWish.id, e)}
                        className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground bg-muted/60 hover:bg-muted px-2.5 py-1 rounded-lg transition-colors"
                        title="Click to copy full ID"
                      >
                        <span>{selectedWish.id}</span>
                        <Copy className="w-3 h-3 opacity-60" />
                      </button>
                    </div>
                  </div>

                  {/* Stat Boxes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card p-4 rounded-2xl border border-border/50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <Eye className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-foreground">{selectedWish.view_count || 0}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Views</p>
                      </div>
                    </div>

                    <div className="glass-card p-4 rounded-2xl border border-border/50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <Share2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-foreground">{selectedWish.share_count || 0}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Shares</p>
                      </div>
                    </div>
                  </div>

                  {/* Meta Details */}
                  <div className="space-y-3 pt-4 border-t border-border/60 text-xs">
                    <DetailRow
                      icon={User}
                      label="Creator Account"
                      value={selectedWish.user_email || "Guest User (Unauthenticated)"}
                    />
                    {selectedWish.user_id && (
                      <DetailRow
                        icon={Lock}
                        label="User ID"
                        value={selectedWish.user_id}
                        isMono
                      />
                    )}
                    <DetailRow
                      icon={Calendar}
                      label="Created Timestamp"
                      value={format(new Date(selectedWish.created_at), "PPP p")}
                    />
                    {selectedWish.published_at && (
                      <DetailRow
                        icon={CheckCircle2}
                        label="Published On"
                        value={format(new Date(selectedWish.published_at), "PPP p")}
                      />
                    )}
                    {selectedWish.payment_id && (
                      <DetailRow
                        icon={CreditCard}
                        label="Payment Reference"
                        value={selectedWish.payment_id}
                        isMono
                      />
                    )}
                  </div>

                  {/* Form Data Inspection Accordion */}
                  {selectedWish.form_data && (
                    <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowJsonData(!showJsonData)}
                        className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-foreground hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-primary" />
                          <span>Submitted Form Data ({Object.keys(selectedWish.form_data).length} fields)</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {showJsonData ? "Collapse" : "Expand JSON"}
                        </span>
                      </button>

                      {showJsonData && (
                        <div className="p-4 border-t border-border bg-card/60">
                          <pre className="text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-56 custom-scrollbar p-3 rounded-xl bg-background border border-border">
                            {JSON.stringify(selectedWish.form_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-6 mt-4 border-t border-border/80">
                  <button
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this wish permanently? This action cannot be undone.")) {
                        deleteMutation.mutate(selectedWish.id);
                      }
                    }}
                    className="py-3 px-4 rounded-2xl bg-destructive/10 text-destructive font-bold text-xs hover:bg-destructive hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{deleteMutation.isPending ? "Deleting..." : "Delete Wish"}</span>
                  </button>

                  {!selectedWish.is_published && (
                    <button
                      disabled={publishMutation.isPending}
                      onClick={() => publishMutation.mutate(selectedWish.id)}
                      className="py-3 px-5 rounded-2xl bg-emerald-500/10 text-emerald-600 font-bold text-xs hover:bg-emerald-500 hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{publishMutation.isPending ? "Publishing..." : "Publish Live"}</span>
                    </button>
                  )}

                  <a
                    href={getLiveWishUrl(selectedWish.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto py-3 px-6 rounded-2xl bg-primary text-white font-bold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Live Wish</span>
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

// ── Detail Row Component ───────────────────────────────────────────────────────

const DetailRow = ({
  icon: Icon,
  label,
  value,
  isMono = false,
}: {
  icon: any;
  label: string;
  value: string;
  isMono?: boolean;
}) => (
  <div className="flex items-center gap-3 py-1">
    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-semibold text-foreground truncate ${isMono ? "font-mono" : ""}`}>{value}</p>
    </div>
  </div>
);

export default Wishes;
