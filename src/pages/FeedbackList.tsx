import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

import {
  MessageSquarePlus,
  Search,
  Star,
  Bug,
  Lightbulb,
  Palette,
  Zap,
  HelpCircle,
  User,
  Mail,
  Clock,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  category: "general" | "bug" | "feature" | "design" | "performance" | "other";
  rating: number;
  message: string;
  created_at: string;
}

interface FeedbackStats {
  total: string;
  avg_rating: string;
  positive: string;
  bugs: string;
  features: string;
}

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  general:     { label: "General",     icon: MessageSquarePlus, color: "text-slate-600",  bg: "bg-slate-100 border-slate-300" },
  bug:         { label: "Bug",         icon: Bug,               color: "text-red-600",    bg: "bg-red-50 border-red-200" },
  feature:     { label: "Feature",     icon: Lightbulb,         color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  design:      { label: "Design",      icon: Palette,           color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  performance: { label: "Performance", icon: Zap,               color: "text-teal-600",   bg: "bg-teal-50 border-teal-200" },
  other:       { label: "Other",       icon: HelpCircle,        color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
};

const CATEGORIES = ["", "general", "bug", "feature", "design", "performance", "other"];
const RATINGS = ["", "1", "2", "3", "4", "5"];

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star
          key={n}
          size={12}
          className={n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

const FeedbackList = () => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FeedbackItem | null>(null);
  const limit = 20;

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (category) params.set("category", category);
  if (rating)   params.set("rating", rating);
  if (search)   params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["adminFeedback", page, category, rating, search],
    queryFn: () => fetchApi(`/feedback?${params}`),
  });

  const rows: FeedbackItem[] = data?.rows || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const stats: FeedbackStats | undefined = data?.stats;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (

      <div className="w-full">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="sub-label mb-1">User Feedback</p>
            <h1 className="section-header text-3xl">Feedback List</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Category filter */}
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c ? CATEGORY_META[c].label : "All Categories"}</option>
              ))}
            </select>
            {/* Rating filter */}
            <select
              value={rating}
              onChange={e => { setRating(e.target.value); setPage(1); }}
              className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              {RATINGS.map(r => (
                <option key={r} value={r}>{r ? `${r} ★` : "All Ratings"}</option>
              ))}
            </select>
            {/* Search */}
            <form onSubmit={handleSearch} className="relative w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name / email…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </form>
          </div>
        </header>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Total", value: stats.total, icon: MessageSquarePlus, color: "text-indigo-500" },
              { label: "Avg Rating", value: stats.avg_rating ? `${stats.avg_rating} ★` : "—", icon: Star, color: "text-amber-500" },
              { label: "Positive (4–5★)", value: stats.positive, icon: TrendingUp, color: "text-emerald-500" },
              { label: "Bug Reports", value: stats.bugs, icon: Bug, color: "text-red-500" },
              { label: "Feature Req.", value: stats.features, icon: Lightbulb, color: "text-violet-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass-card rounded-2xl p-4 border border-border flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color} shrink-0`} />
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
                  <p className="text-xl font-black text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Two-pane layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-1">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 border border-border animate-pulse h-24" />
              ))
            ) : rows.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border-2 border-dashed border-border flex flex-col items-center">
                <BarChart3 className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No feedback found</p>
              </div>
            ) : (
              rows.map((fb) => {
                const meta = CATEGORY_META[fb.category] || CATEGORY_META.other;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={fb.id}
                    layoutId={fb.id}
                    onClick={() => setSelected(fb)}
                    whileHover={{ scale: 1.01 }}
                    className={`glass-card p-4 rounded-2xl border transition-all cursor-pointer ${
                      selected?.id === fb.id
                        ? "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
                        : "border-border hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${meta.bg} ${meta.color}`}>
                        <Icon size={9} /> {meta.label}
                      </span>
                      <StarRow rating={fb.rating} />
                    </div>
                    <p className="text-sm font-bold text-foreground truncate">{fb.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{fb.email}</p>
                    <p className="text-xs text-muted-foreground/70 truncate mt-1">{fb.message}</p>
                    <p className="text-[9px] text-muted-foreground/50 mt-1.5 uppercase tracking-widest font-bold">
                      {format(new Date(fb.created_at), "MMM d, yyyy · HH:mm")}
                    </p>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Detail pane */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="glass-card rounded-[2rem] border border-border p-8 h-full"
                >
                  {/* Top meta */}
                  <div className="flex items-start justify-between mb-6 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        {(() => {
                          const m = CATEGORY_META[selected.category] || CATEGORY_META.other;
                          const Icon = m.icon;
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-black uppercase tracking-widest ${m.bg} ${m.color}`}>
                              <Icon size={12} /> {m.label}
                            </span>
                          );
                        })()}
                        <StarRow rating={selected.rating} />
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <User size={14} className="text-primary" />
                        <span className="font-bold text-foreground">{selected.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-1">
                        <Mail size={14} className="text-primary" />
                        <a href={`mailto:${selected.email}`} className="text-primary hover:underline font-mono">{selected.email}</a>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                        <Clock size={12} />
                        {format(new Date(selected.created_at), "PP · p")}
                      </div>
                    </div>
                  </div>

                  {/* Message body */}
                  <div className="bg-muted/30 rounded-2xl p-6 border border-border/50">
                    <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">{selected.message}</p>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 flex items-center gap-3">
                    <a
                      href={`mailto:${selected.email}?subject=Re: Your WishForMoment Feedback`}
                      className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm hover:opacity-90 transition flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Mail size={15} /> Reply via Email
                    </a>
                  </div>
                </motion.div>
              ) : (
                <div className="glass-card rounded-[2.5rem] p-20 flex flex-col items-center justify-center text-center opacity-40 border-2 border-dashed border-border h-full">
                  <div className="w-16 h-16 rounded-[2rem] bg-muted flex items-center justify-center text-3xl mb-4">💬</div>
                  <h3 className="section-header text-lg">Select a feedback</h3>
                  <p className="text-xs text-muted-foreground mt-2 max-w-xs font-medium uppercase tracking-[0.2em]">
                    Click any item from the list to read details
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-bold text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

  );
};

export default FeedbackList;
