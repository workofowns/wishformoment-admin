import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { API_BASE, fetchApi } from "@/lib/api";
import {
  Terminal, Search, Play, Pause, Download, Trash2, RefreshCw,
  Clock, ShieldAlert, CheckCircle2, AlertTriangle, Info,
  ChevronDown, ChevronRight, Copy, Check, Filter, Calendar, Server, Cpu
} from "lucide-react";
import { toast } from "sonner";

interface ServerLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  category: "http" | "system" | "error" | "scheduler" | "db";
  message: string;
  statusCode?: number;
  method?: string;
  url?: string;
  durationMs?: number;
  stream: "stdout" | "stderr";
  details?: Record<string, any> | string;
}

interface LogApiResponse {
  logs: ServerLogEntry[];
  total: number;
  availableStreams: { stdout: boolean; stderr: boolean };
  systemInfo: {
    environment: string;
    port: number;
    uptimeSeconds: number;
    memoryMb: number;
  };
}

type TimePreset = "live" | "15m" | "1h" | "6h" | "24h" | "custom";

const LogsPage = () => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [streamFilter, setStreamFilter] = useState<"all" | "stdout" | "stderr">("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "error" | "warn" | "info">("all");
  const [statusGroupFilter, setStatusGroupFilter] = useState<"all" | "2xx" | "3xx" | "4xx" | "5xx">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "http" | "error" | "system">("all");
  const [search, setSearch] = useState("");
  
  // Date & Time Range States
  const [timePreset, setTimePreset] = useState<TimePreset>("live");
  const [customStartTime, setCustomStartTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start?: string; end?: string }>({});

  // Real-time & Terminal Controls
  const [isLiveTail, setIsLiveTail] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [liveStreamLogs, setLiveStreamLogs] = useState<ServerLogEntry[]>([]);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute query time range based on preset or custom range
  const queryTimeRange = useMemo(() => {
    if (timePreset === "custom") {
      return appliedCustomRange;
    }
    if (timePreset === "live") {
      return {};
    }

    const now = new Date();
    let start: Date;
    switch (timePreset) {
      case "15m":
        start = new Date(now.getTime() - 15 * 60 * 1000);
        break;
      case "1h":
        start = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "6h":
        start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case "24h":
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      default:
        return {};
    }
    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  }, [timePreset, appliedCustomRange]);

  // Construct Query String
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (streamFilter !== "all") params.set("stream", streamFilter);
    if (levelFilter !== "all") params.set("level", levelFilter);
    if (categoryFilter !== "all") params.set("category", categoryFilter);
    if (statusGroupFilter !== "all") params.set("statusGroup", statusGroupFilter);
    if (search.trim()) params.set("search", search.trim());
    if (queryTimeRange.start) params.set("startTime", queryTimeRange.start);
    if (queryTimeRange.end) params.set("endTime", queryTimeRange.end);
    params.set("limit", "250");
    return params.toString();
  }, [streamFilter, levelFilter, categoryFilter, statusGroupFilter, search, queryTimeRange]);

  // Fetch initial/filtered historical logs from backend
  const { data: logData, isLoading, refetch, isRefetching } = useQuery<{ data: LogApiResponse }>({
    queryKey: ["serverLogs", queryString],
    queryFn: () => fetchApi(`/logs?${queryString}`),
    refetchInterval: isLiveTail && timePreset === "live" ? 5000 : false,
  });

  // Handle Socket.io real-time streaming
  useEffect(() => {
    if (!isLiveTail) return;

    const socket = io(API_BASE, {
      transports: ["websocket", "polling"],
    });

    socket.on("server_log", (newEntry: ServerLogEntry) => {
      // Exclude internal log-explorer requests
      if (newEntry.url?.includes("/admin/logs") || newEntry.message?.includes("/admin/logs")) {
        return;
      }

      setLiveStreamLogs((prev) => {
        // Prevent duplicates
        if (prev.some((p) => p.id === newEntry.id)) return prev;
        const next = [newEntry, ...prev];
        return next.slice(0, 500);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [isLiveTail]);

  // Merge historical logs from query with live incoming logs
  const displayLogs = useMemo(() => {
    const fetched = logData?.data?.logs || [];
    const seen = new Set<string>();
    const merged: ServerLogEntry[] = [];

    // Prioritize live stream entries when in live preset
    if (timePreset === "live") {
      liveStreamLogs.forEach((item) => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      });
    }

    fetched.forEach((item) => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    });

    // Re-apply in-memory search & filters
    return merged.filter((entry) => {
      // Exclude internal log-explorer requests
      if (entry.url?.includes("/admin/logs") || entry.message?.includes("/admin/logs")) {
        return false;
      }

      if (streamFilter !== "all" && entry.stream !== streamFilter) return false;
      if (levelFilter !== "all" && entry.level !== levelFilter) return false;
      if (categoryFilter !== "all" && entry.category !== categoryFilter) return false;

      if (statusGroupFilter !== "all" && entry.statusCode) {
        if (statusGroupFilter === "2xx" && (entry.statusCode < 200 || entry.statusCode >= 300)) return false;
        if (statusGroupFilter === "3xx" && (entry.statusCode < 300 || entry.statusCode >= 400)) return false;
        if (statusGroupFilter === "4xx" && (entry.statusCode < 400 || entry.statusCode >= 500)) return false;
        if (statusGroupFilter === "5xx" && entry.statusCode < 500) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const inMsg = entry.message.toLowerCase().includes(q);
        const inUrl = entry.url?.toLowerCase().includes(q);
        const inDetails = entry.details && JSON.stringify(entry.details).toLowerCase().includes(q);
        if (!inMsg && !inUrl && !inDetails) return false;
      }

      return true;
    });
  }, [logData, liveStreamLogs, timePreset, streamFilter, levelFilter, categoryFilter, statusGroupFilter, search]);

  // Auto-scroll to bottom if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayLogs, autoScroll]);

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyLogText = (entry: ServerLogEntry) => {
    const text = `${entry.timestamp} [${entry.level.toUpperCase()}] [${entry.category}] ${entry.message}\n${
      entry.details ? JSON.stringify(entry.details, null, 2) : ""
    }`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Log entry copied to clipboard");
  };

  const handleDownloadLogs = async () => {
    try {
      toast.info("Preparing server log export...");
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/admin/logs/download?stream=${streamFilter}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download logs");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `server-logs-${streamFilter}-${new Date().toISOString().slice(0, 10)}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Logs downloaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to download logs");
    }
  };

  const handleClearView = () => {
    setLiveStreamLogs([]);
    toast.info("Active console view buffer cleared");
  };

  const handleApplyCustomRange = () => {
    if (!customStartTime && !customEndTime) {
      toast.error("Please pick a start or end time");
      return;
    }
    setAppliedCustomRange({
      start: customStartTime ? new Date(customStartTime).toISOString() : undefined,
      end: customEndTime ? new Date(customEndTime).toISOString() : undefined,
    });
    setIsLiveTail(false); // Pause live tail when viewing historical time window
    toast.success("Applied custom time window filter");
  };

  const systemInfo = logData?.data?.systemInfo;

  return (
    <div className="w-full max-w-[1700px] mx-auto space-y-6 pb-20">
      {/* ── Page Header & System Observability Stats ──────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-6 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
            <span className="text-xs font-bold text-muted-foreground">•</span>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              DigitalOcean Droplet PM2 Stream
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <Terminal className="w-8 h-8 text-primary" />
            Server Log Explorer
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Real-time backend telemetry, HTTP traffic analysis, and error diagnostics
          </p>
        </div>

        {/* Server Telemetry Cards */}
        <div className="flex items-center gap-3 flex-wrap">
          {systemInfo && (
            <div className="flex items-center gap-3 bg-card border border-border/80 px-4 py-2.5 rounded-2xl shadow-xs text-xs font-bold text-foreground">
              <div className="flex items-center gap-2 pr-3 border-r border-border/60">
                <Server className="w-4 h-4 text-primary" />
                <span>Port {systemInfo.port}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                  {systemInfo.environment}
                </span>
              </div>
              <div className="flex items-center gap-2 pr-3 border-r border-border/60">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span>{systemInfo.memoryMb} MB RAM</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {Math.floor(systemInfo.uptimeSeconds / 3600)}h{" "}
                  {Math.floor((systemInfo.uptimeSeconds % 3600) / 60)}m up
                </span>
              </div>
            </div>
          )}

          {/* Quick Action Buttons */}
          <button
            onClick={() => setIsLiveTail(!isLiveTail)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs ${
              isLiveTail
                ? "bg-emerald-600 text-white shadow-emerald-600/20"
                : "bg-card border border-border/80 text-muted-foreground hover:bg-muted"
            }`}
          >
            {isLiveTail ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause Stream
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Resume Live
              </>
            )}
          </button>

          <button
            onClick={handleDownloadLogs}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-card border border-border/80 text-foreground text-xs font-bold hover:bg-muted transition-all active:scale-95 shadow-xs"
            title="Download full log file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="p-2.5 rounded-2xl bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95 disabled:opacity-50 shadow-xs"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Control & Filter Toolbar ─────────────────────────────────────── */}
      <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs space-y-4">
        {/* Row 1: Time Range Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mr-2">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Time Window:
            </span>

            {(["live", "15m", "1h", "6h", "24h", "custom"] as TimePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setTimePreset(preset);
                  if (preset === "live") setIsLiveTail(true);
                  else setIsLiveTail(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  timePreset === preset
                    ? "bg-primary text-white shadow-xs"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground"
                }`}
              >
                {preset === "live" && "🔴 Live Stream"}
                {preset === "15m" && "Last 15m"}
                {preset === "1h" && "Last 1 Hour"}
                {preset === "6h" && "Last 6 Hours"}
                {preset === "24h" && "Last 24 Hours"}
                {preset === "custom" && "Custom Window"}
              </button>
            ))}
          </div>

          {/* Auto-scroll Lock */}
          <div className="flex items-center gap-3 self-end lg:self-auto">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                autoScroll
                  ? "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span>Auto-scroll</span>
              <span className={`w-2 h-2 rounded-full ${autoScroll ? "bg-indigo-500" : "bg-muted-foreground"}`} />
            </button>
            <button
              onClick={handleClearView}
              className="p-2 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Clear visible logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Custom Date & Time Picker Bar (Visible when 'custom' is active) */}
        {timePreset === "custom" && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-muted/30 border border-border/80 rounded-2xl animate-in fade-in duration-200">
            <span className="text-xs font-bold text-foreground">Specify Exact Window:</span>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">From:</span>
                <input
                  type="datetime-local"
                  value={customStartTime}
                  onChange={(e) => setCustomStartTime(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-card border border-border text-xs font-semibold text-foreground outline-none focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">To:</span>
                <input
                  type="datetime-local"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-card border border-border text-xs font-semibold text-foreground outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={handleApplyCustomRange}
                className="px-4 py-1.5 rounded-xl btn-primary text-white text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Apply Range
              </button>
            </div>
          </div>
        )}

        {/* Row 2: Search, Streams & Severity Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search /payments, 502, error trace..."
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-background border border-border text-xs font-semibold outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Stream Filter */}
          <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground px-2">Stream:</span>
            {(["all", "stdout", "stderr"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStreamFilter(s)}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                  streamFilter === s ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : s === "stderr" ? "Errors" : "Output"}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground px-2">Level:</span>
            {(["all", "error", "warn", "info"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                  levelFilter === l
                    ? l === "error"
                      ? "bg-rose-600 text-white shadow-xs"
                      : l === "warn"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* HTTP Status Code Filter */}
          <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1">
            <span className="text-[10px] font-bold uppercase text-muted-foreground px-2">Status:</span>
            {(["all", "2xx", "4xx", "5xx"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusGroupFilter(st)}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusGroupFilter === st
                    ? st === "5xx"
                      ? "bg-rose-600 text-white"
                      : st === "4xx"
                      ? "bg-amber-500 text-white"
                      : "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Terminal Visualizer (AWS CloudWatch / Vercel style) ──────────── */}
      <div className="bg-slate-950 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs flex flex-col">
        {/* Terminal Title Bar */}
        <div className="bg-slate-900/90 px-5 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="text-slate-400 text-[11px] font-bold">
              console://wishformoment-api/{systemInfo?.environment || "droplet"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <span>Showing {displayLogs.length} entries</span>
            {isLiveTail && (
              <span className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                STREAMING
              </span>
            )}
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[700px] min-h-[450px] space-y-1.5 custom-scrollbar bg-slate-950">
          {isLoading && displayLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs uppercase tracking-widest font-bold">Streaming server logs...</p>
            </div>
          ) : displayLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-60" />
              <p className="text-sm font-bold text-slate-300">No log entries matched your filter parameters</p>
              <p className="text-[11px] text-slate-500">Try adjusting the search query, severity, or date range.</p>
            </div>
          ) : (
            displayLogs.map((entry) => {
              const isExpanded = expandedLogIds.has(entry.id);
              const hasDetails = Boolean(entry.details);

              // Level styling
              const isError = entry.level === "error" || (entry.statusCode && entry.statusCode >= 500);
              const isWarn = entry.level === "warn" || (entry.statusCode && entry.statusCode >= 400 && entry.statusCode < 500);
              const isHttp = entry.category === "http";

              return (
                <div
                  key={entry.id}
                  className={`group rounded-xl p-2.5 transition-all border ${
                    isError
                      ? "bg-rose-950/20 border-rose-900/40 text-rose-200 hover:bg-rose-950/30"
                      : isWarn
                      ? "bg-amber-950/20 border-amber-900/40 text-amber-200 hover:bg-amber-950/30"
                      : "bg-slate-900/40 border-slate-800/60 text-slate-300 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                    {/* Timestamp & Badges */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <span className="text-slate-500 text-[10px] select-none">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : "--:--:--"}
                      </span>

                      {/* Level Badge */}
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isError
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : isWarn
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : isHttp
                            ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}
                      >
                        {isHttp ? "HTTP" : entry.level}
                      </span>

                      {/* Status Code */}
                      {entry.statusCode && (
                        <span
                          className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            entry.statusCode >= 500
                              ? "bg-rose-600 text-white"
                              : entry.statusCode >= 400
                              ? "bg-amber-600 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {entry.statusCode}
                        </span>
                      )}

                      {/* Method */}
                      {entry.method && (
                        <span className="text-slate-400 font-bold text-[10px]">
                          {entry.method}
                        </span>
                      )}
                    </div>

                    {/* Message Body */}
                    <div className="flex-1 min-w-0 break-words leading-relaxed">
                      <span className="font-mono text-xs">{entry.message}</span>
                      {entry.durationMs !== undefined && (
                        <span className={`ml-2 text-[10px] font-bold ${
                          entry.durationMs > 500 ? "text-rose-400" : entry.durationMs > 150 ? "text-amber-400" : "text-slate-500"
                        }`}>
                          {entry.durationMs}ms
                        </span>
                      )}
                    </div>

                    {/* Quick Row Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyLogText(entry)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy log entry"
                      >
                        {copiedId === entry.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {hasDetails && (
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                          title="Toggle trace details"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Trace / Detail Block */}
                  {isExpanded && entry.details && (
                    <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Metadata & Error Trace:
                      </p>
                      <pre className="p-3 rounded-lg bg-black/60 border border-slate-800/80 overflow-x-auto text-[11px] text-rose-300 font-mono leading-relaxed whitespace-pre-wrap">
                        {typeof entry.details === "string"
                          ? entry.details
                          : JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};

export default LogsPage;

