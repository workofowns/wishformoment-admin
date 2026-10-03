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
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

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

const Wishes = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft" | "premium" | "free">("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: wishesRes, isLoading } = useQuery<WishesResponse | { data: Wish[] } | Wish[]>({
    queryKey: ["adminWishes", page],
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
      toast.success("Wish published successfully");
      if (selectedWish) {
        setSelectedWish({ ...selectedWish, is_published: true });
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
  const totalPages = (wishesRes as WishesResponse)?.totalPages ?? Math.ceil(totalCount / limit);

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

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(id);
    toast.success("Wish ID copied to clipboard");
  };

  return (
    <DashboardLayout>
      <div className="w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="sub-label mb-1">Content Management</p>
            <div className="flex items-center gap-3">
              <h1 className="section-header text-3xl">Wishes</h1>
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
                {totalCount} total
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center bg-card border border-border rounded-xl p-1 text-xs font-semibold">
              {(["all", "published", "draft", "premium", "free"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                    filterStatus === tab
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search wishes..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </header>

        {/* Wishes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Loading wishes...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center glass-card rounded-[2rem] border border-border">
              <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-bold">
                {search || filterStatus !== "all" ? "No matching wishes found" : "No wishes created yet"}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {search || filterStatus !== "all"
                  ? "Try changing your search term or filter status."
                  : "User interaction will show up here."}
              </p>
              {(search || filterStatus !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterStatus("all");
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            filtered.map((wish: Wish, i: number) => {
              const thumbnail = getWishThumbnail(wish);
              return (
                <motion.div
                  key={wish.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="glass-card rounded-[2rem] overflow-hidden group hover:border-primary/40 hover:shadow-xl transition-all border border-border flex flex-col"
                >
                  {/* Thumbnail / Header Area */}
                  <div className="h-40 bg-gradient-to-br from-primary/10 via-primary/5 to-muted relative overflow-hidden flex items-center justify-center">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={wish.template_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-primary/40">
                        <Sparkles className="w-10 h-10 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {wish.component || "Wish"}
                        </span>
                      </div>
                    )}

                    {/* Badges on top left */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-sm border ${
                          wish.is_published
                            ? "bg-emerald-500/90 text-white border-emerald-400/30"
                            : "bg-amber-500/90 text-white border-amber-400/30"
                        }`}
                      >
                        {wish.is_published ? "Published" : "Draft"}
                      </span>
                      {wish.is_premium && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600/90 text-white backdrop-blur-md shadow-sm border border-purple-400/30 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> Premium
                        </span>
                      )}
                    </div>

                    {/* Quick Action Buttons on hover on top right */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={() => setSelectedWish(wish)}
                        title="View Details"
                        className="p-2 rounded-xl bg-card/90 backdrop-blur-md text-foreground hover:bg-primary hover:text-white transition-all shadow-lg border border-border/50"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={getLiveWishUrl(wish.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open Live Wish"
                        className="p-2 rounded-xl bg-card/90 backdrop-blur-md text-foreground hover:bg-primary hover:text-white transition-all shadow-lg border border-border/50"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        className="font-bold text-base text-foreground tracking-tight line-clamp-1 capitalize"
                        title={wish.template_name}
                      >
                        {wish.template_name?.replace(/-/g, " ")}
                      </h3>
                      <p
                        className="text-xs text-muted-foreground truncate mt-1 flex items-center gap-1.5"
                        title={wish.user_email || "Guest User"}
                      >
                        <User className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                        <span className="truncate">{wish.user_email || "Guest User"}</span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1" title="Views">
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-bold text-muted-foreground">{wish.view_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Shares">
                          <Share2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="font-bold text-muted-foreground">{wish.share_count || 0}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                        {format(new Date(wish.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8 glass-card p-4 rounded-2xl border border-border text-xs">
            <span className="text-muted-foreground font-semibold">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} wishes
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold px-3">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Detail View */}
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
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg bg-card rounded-[2.5rem] shadow-2xl border border-border p-8 md:p-10 overflow-hidden relative my-8"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedWish(null)}
                  className="absolute top-6 right-6 p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Thumbnail Preview */}
                {getWishThumbnail(selectedWish) && (
                  <div className="w-full h-44 rounded-2xl overflow-hidden mb-6 border border-border">
                    <img
                      src={getWishThumbnail(selectedWish)!}
                      alt={selectedWish.template_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-col items-center text-center mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        selectedWish.is_published
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }`}
                    >
                      {selectedWish.is_published ? "● Published" : "○ Draft"}
                    </span>
                    {selectedWish.is_premium && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Premium
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black tracking-tight capitalize">
                    {selectedWish.template_name?.replace(/-/g, " ")}
                  </h2>
                  <button
                    onClick={() => handleCopyId(selectedWish.id)}
                    title="Click to copy Wish ID"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mt-1 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted transition-colors group"
                  >
                    <span>{selectedWish.id}</span>
                    <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <StatBox icon={Eye} label="Impressions" value={selectedWish.view_count || 0} color="text-blue-500" />
                  <StatBox icon={Share2} label="Engagements" value={selectedWish.share_count || 0} color="text-emerald-500" />
                </div>

                <div className="space-y-3 pt-6 border-t border-border/50 text-sm">
                  <DetailItem
                    icon={User}
                    label="User Identity"
                    value={selectedWish.user_email || (selectedWish.user_id ? "Authenticated User" : "Guest User")}
                  />
                  <DetailItem
                    icon={LayoutGrid}
                    label="Template Component"
                    value={selectedWish.component || selectedWish.template_name}
                  />
                  <DetailItem
                    icon={Calendar}
                    label="Created On"
                    value={format(new Date(selectedWish.created_at), "PPP p")}
                  />
                  {selectedWish.published_at && (
                    <DetailItem
                      icon={CheckCircle2}
                      label="Published On"
                      value={format(new Date(selectedWish.published_at), "PPP p")}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-8">
                  <button
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this wish permanently? This action cannot be undone.")) {
                        deleteMutation.mutate(selectedWish.id);
                      }
                    }}
                    className="flex-1 py-3 px-4 rounded-2xl bg-destructive/10 text-destructive font-bold text-sm hover:bg-destructive hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleteMutation.isPending ? "Deleting..." : "Delete Wish"}
                  </button>

                  {!selectedWish.is_published && (
                    <button
                      disabled={publishMutation.isPending}
                      onClick={() => publishMutation.mutate(selectedWish.id)}
                      className="py-3 px-5 rounded-2xl bg-emerald-500/10 text-emerald-600 font-bold text-sm hover:bg-emerald-500 hover:text-white disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {publishMutation.isPending ? "Publishing..." : "Publish"}
                    </button>
                  )}

                  <a
                    href={getLiveWishUrl(selectedWish.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-6 rounded-2xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                  >
                    <ExternalLink className="w-4 h-4" /> Live View
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

const StatBox = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: string }) => (
  <div className="glass-card p-4 rounded-2xl border border-border/50 flex flex-col items-center">
    <Icon className={`w-5 h-5 mb-2 ${color}`} />
    <p className="text-xl font-black">{value}</p>
    <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground mt-0.5">{label}</p>
  </div>
);

const DetailItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="text-xs font-semibold text-foreground truncate">{value}</p>
    </div>
  </div>
);

export default Wishes;
