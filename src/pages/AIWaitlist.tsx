import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Search,
  Mail,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Calendar,
  Layers,
  Inbox,
  Copy,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";

interface WaitlistItem {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface WaitlistStats {
  total: string;
  last_24h: string;
  last_7d: string;
  last_30d: string;
}

const AIWaitlist = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const limit = 20;

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);

  const { data, isLoading } = useQuery({
    queryKey: ["adminAIWaitlist", page, search],
    queryFn: () => fetchApi(`/ai-waitlist?${params}`),
  });

  const rows: WaitlistItem[] = data?.rows || [];
  const total: number = data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const stats: WaitlistStats | undefined = data?.stats;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="sub-label mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" /> Early Access Waitlist
            </p>
            <h1 className="section-header text-3xl">AI Waitlist</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search email address…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </form>
          </div>
        </header>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Signups", value: stats.total, icon: Layers, color: "text-indigo-500" },
              { label: "Last 24 Hours", value: stats.last_24h, icon: Sparkles, color: "text-amber-500" },
              { label: "Last 7 Days", value: stats.last_7d, icon: TrendingUp, color: "text-emerald-500" },
              { label: "Last 30 Days", value: stats.last_30d, icon: Calendar, color: "text-violet-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass-card rounded-2xl p-5 border border-border flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-card/60 border border-border shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
                  <p className="text-2xl font-black text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main List */}
        <div className="glass-card rounded-[2rem] border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20">
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-widest pl-8">Email Address</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Signed Up Date</th>
                  <th className="p-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right pr-8">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border animate-pulse h-16">
                      <td className="p-4 pl-8"><div className="h-4 bg-muted rounded w-2/3" /></td>
                      <td className="p-4"><div className="h-4 bg-muted rounded w-1/3" /></td>
                      <td className="p-4 pr-8 text-right"><div className="h-8 bg-muted rounded w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center opacity-60">
                        <Inbox className="w-12 h-12 text-muted-foreground mb-3" />
                        <h3 className="text-lg font-bold text-foreground mb-1">No signups found</h3>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          {search ? "Try adjusting your search criteria" : "Nobody has joined the waitlist yet"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => (
                    <tr key={item.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                      <td className="p-4 pl-8 font-mono text-sm font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-primary shrink-0" />
                          <span>{item.email}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground/60" />
                          <span>{format(new Date(item.created_at), "PPP 'at' p")}</span>
                        </div>
                      </td>
                      <td className="p-4 pr-8 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyToClipboard(item.id, item.email)}
                            className="p-2 rounded-lg bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy Email"
                          >
                            {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={`mailto:${item.email}?subject=WishForMoment AI Waitlist Update`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition shadow-sm"
                          >
                            <Mail className="w-3 h-3" /> Reach Out
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

export default AIWaitlist;
