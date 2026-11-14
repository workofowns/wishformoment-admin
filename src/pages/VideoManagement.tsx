import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Video,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  ExternalLink,
  Search,
  Filter,
  Layers,
  Sparkles,
  Smartphone,
  Square,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";

interface VideoStatsResponse {
  db: {
    total: number;
    pending: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    avgDurationSec: number;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
}

interface RenditionItem {
  id: string;
  aspectRatio: "9:16" | "1:1" | "16:9";
  resolution: string;
  cdnUrl: string;
  fileSizeBytes: number;
  format: string;
}

interface VideoJobItem {
  id: string;
  wish_id: string;
  user_id: string | null;
  status: "pending" | "queued" | "processing" | "completed" | "failed";
  progress: number;
  stage: string;
  duration_sec: number | null;
  error_message: string | null;
  attempts: number;
  max_attempts: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  template_name: string;
  template_slug: string;
  template_component: string;
  user_email: string | null;
  user_name: string | null;
  renditions: RenditionItem[] | null;
}

interface VideoJobsResponse {
  data: VideoJobItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function VideoManagement() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // 1. Fetch Stats
  const { data: statsData, isFetching: isStatsFetching } = useQuery<VideoStatsResponse>({
    queryKey: ["admin", "videos", "stats"],
    queryFn: () => fetchApi("/videos/stats"),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // 2. Fetch Jobs List
  const { data: jobsData, isLoading: isJobsLoading, refetch: refetchJobs } = useQuery<VideoJobsResponse>({
    queryKey: ["admin", "videos", "jobs", currentPage, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", "20");
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      return fetchApi(`/videos/jobs?${params.toString()}`);
    },
    refetchInterval: autoRefresh ? 5000 : false,
  });

  // 3. Retry Mutation
  const retryMutation = useMutation({
    mutationFn: (jobId: string) => fetchApi(`/videos/jobs/${jobId}/retry`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Video job re-enqueued for rendering!");
      queryClient.invalidateQueries({ queryKey: ["admin", "videos"] });
    },
    onError: (err: any) => {
      toast.error(`Retry failed: ${err.message}`);
    },
  });

  const filteredJobs = (jobsData?.data || []).filter((job) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      job.template_name?.toLowerCase().includes(q) ||
      job.template_slug?.toLowerCase().includes(q) ||
      job.wish_id?.toLowerCase().includes(q) ||
      job.user_email?.toLowerCase().includes(q)
    );
  });

  const db = statsData?.db || {
    total: 0,
    pending: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    avgDurationSec: 0,
  };

  const queue = statsData?.queue || {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            Video Generation Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated background video rendering jobs, multi-aspect ratio renditions & BullMQ health
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground cursor-pointer bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-primary focus:ring-0"
            />
            Auto-refresh (5s)
          </label>

          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["admin", "videos"] });
              toast.info("Refreshed video stats & jobs");
            }}
            disabled={isStatsFetching}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card hover:bg-muted text-xs font-bold border border-border transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isStatsFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Rendered */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Videos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{db.completed.toLocaleString()}</div>
          <span className="text-[11px] text-muted-foreground">Successfully rendered & uploaded</span>
        </div>

        {/* In-Flight (Processing / Queued) */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">In-Flight Queue</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {(db.processing + db.queued + db.pending).toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {db.processing} active • {db.queued} queued in Redis
          </span>
        </div>

        {/* Avg Duration */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Render Time</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {db.avgDurationSec > 0 ? `${db.avgDurationSec}s` : "N/A"}
          </div>
          <span className="text-[11px] text-muted-foreground">Per full 3-format multi-aspect suite</span>
        </div>

        {/* Failed */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Failed Jobs</span>
            <AlertCircle className={`w-4 h-4 ${db.failed > 0 ? "text-red-500" : "text-muted-foreground"}`} />
          </div>
          <div className={`text-2xl font-black ${db.failed > 0 ? "text-red-600" : "text-foreground"}`}>
            {db.failed.toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground">Available for 1-click retry</span>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Jobs", count: db.total },
            { id: "completed", label: "Completed", count: db.completed },
            { id: "processing", label: "Processing", count: db.processing },
            { id: "queued", label: "Queued", count: db.queued },
            { id: "failed", label: "Failed", count: db.failed },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {tab.label} <span className="text-[10px] opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search template, user, wish ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* ── Video Jobs Table ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Template / Wish</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Progress / Stage</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Renditions</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isJobsLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    Loading video rendering jobs...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    No video jobs found matching current filter.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                    {/* Template / Wish */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">{job.template_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{job.wish_id.slice(0, 13)}…</div>
                    </td>

                    {/* User */}
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {job.user_email || "Guest User"}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {job.status === "completed" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {job.status === "processing" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 animate-pulse">
                          <Clock className="w-3 h-3" /> Processing
                        </span>
                      )}
                      {job.status === "queued" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="w-3 h-3" /> Queued
                        </span>
                      )}
                      {job.status === "failed" && (
                        <span
                          title={job.error_message || "Render failed"}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 cursor-help"
                        >
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>

                    {/* Progress / Stage */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground mb-1">
                        <span className="truncate">{job.stage || "Idle"}</span>
                        <span>{job.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            job.status === "failed"
                              ? "bg-red-500"
                              : job.status === "completed"
                              ? "bg-emerald-500"
                              : "bg-primary"
                          }`}
                          style={{ width: `${Math.max(4, job.progress)}%` }}
                        />
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4 text-foreground font-mono">
                      {job.duration_sec ? `${job.duration_sec}s` : "—"}
                    </td>

                    {/* Renditions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {job.renditions && job.renditions.length > 0 ? (
                          job.renditions.map((r) => (
                            <a
                              key={r.id}
                              href={r.cdnUrl}
                              target="_blank"
                              rel="noreferrer"
                              title={`Open ${r.aspectRatio} (${r.resolution})`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-primary/20 text-[10px] font-bold text-foreground transition-colors"
                            >
                              {r.aspectRatio === "9:16" ? (
                                <Smartphone className="w-2.5 h-2.5" />
                              ) : r.aspectRatio === "1:1" ? (
                                <Square className="w-2.5 h-2.5" />
                              ) : (
                                <Monitor className="w-2.5 h-2.5" />
                              )}
                              <span>{r.aspectRatio}</span>
                              <ExternalLink className="w-2 h-2 opacity-50" />
                            </a>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-[10px]">None</span>
                        )}
                      </div>
                    </td>

                    {/* Attempts */}
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {job.attempts} / {job.max_attempts}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => retryMutation.mutate(job.id)}
                        disabled={retryMutation.isPending}
                        title="Force re-enqueue video render"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border text-[11px] font-bold text-foreground transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3 text-primary" />
                        <span>Retry</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {jobsData && jobsData.pagination.totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Page {jobsData.pagination.page} of {jobsData.pagination.totalPages} ({jobsData.pagination.total} jobs)
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= jobsData.pagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

