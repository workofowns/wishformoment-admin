import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/lib/api";
import {
  Database,
  RefreshCw,
  Trash2,
  Eye,
  Search,
  Zap,
  Check,
  Copy,
  Layers,
  LayoutGrid,
  Coins,
  Music,
  Flame,
  Sparkles,
  AlertTriangle,
  Server,
  Filter,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CacheKeyInfo {
  key: string;
  fullKey: string;
  type: string;
  ttl: number;
  sizeBytes: number;
  value: any;
}

interface CacheDebugStatus {
  enabled: boolean;
  connected: boolean;
  db: number;
  prefix: string;
  totalKeys: number;
  usedMemoryHuman?: string;
  uptimeDays?: number;
  keys: CacheKeyInfo[];
}

const NAMESPACES = [
  { id: "all", label: "All Keys", icon: Database, pattern: "*" },
  { id: "cat", label: "Categories", prefix: "ew:cat:", pattern: "ew:cat:*", icon: Layers, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { id: "tpl", label: "Templates", prefix: "ew:tpl:", pattern: "ew:tpl:*", icon: LayoutGrid, color: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  { id: "curr", label: "Currency", prefix: "ew:curr:", pattern: "ew:curr:*", icon: Coins, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { id: "music", label: "Music", prefix: "ew:music:", pattern: "ew:music:*", icon: Music, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { id: "trending", label: "Trending", prefix: "ew:trending:", pattern: "ew:trending:*", icon: Flame, color: "text-rose-600 bg-rose-50 border-rose-200" },
  { id: "wish", label: "Wishes", prefix: "ew:wish:", pattern: "ew:wish:*", icon: Sparkles, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { id: "search", label: "Search", prefix: "ew:search:", pattern: "ew:search:*", icon: Search, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatTtl(ttl: number): string {
  if (ttl === -1) return "No Expiration";
  if (ttl === -2) return "Expired";
  if (ttl < 60) return `${ttl}s`;
  const mins = Math.floor(ttl / 60);
  const secs = ttl % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function getNamespaceBadge(key: string) {
  for (const ns of NAMESPACES) {
    if (ns.prefix && key.startsWith(ns.prefix)) {
      return ns;
    }
  }
  return { label: "Custom", color: "text-gray-600 bg-gray-50 border-gray-200", icon: Database };
}

const CacheManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNamespace, setSelectedNamespace] = useState("all");
  const [inspectingKey, setInspectingKey] = useState<CacheKeyInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [purgePatternInput, setPurgePatternInput] = useState("*");
  const [purgeTargetLabel, setPurgeTargetLabel] = useState("All Keys");

  // Fetch cache debug data
  const { data, isLoading, isFetching, refetch } = useQuery<CacheDebugStatus>({
    queryKey: ["adminCacheDebug"],
    queryFn: () => fetchApi("/cache"),
    refetchOnWindowFocus: true,
  });

  // Delete single key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: (key: string) =>
      fetchApi(`/cache/key?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      }),
    onSuccess: (_, key) => {
      queryClient.invalidateQueries({ queryKey: ["adminCacheDebug"] });
      toast.success(`Key "${key}" invalidated`);
      if (inspectingKey?.key === key) {
        setInspectingKey(null);
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to invalidate key"),
  });

  // Purge pattern mutation
  const purgeMutation = useMutation({
    mutationFn: (pattern: string) =>
      fetchApi("/cache/purge", {
        method: "POST",
        body: JSON.stringify({ pattern }),
      }),
    onSuccess: (_, pattern) => {
      queryClient.invalidateQueries({ queryKey: ["adminCacheDebug"] });
      toast.success(`Purged cache matching "${pattern}"`);
      setShowPurgeDialog(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to purge cache"),
  });

  const keys = data?.keys || [];

  // Filter keys based on search and namespace
  const filteredKeys = useMemo(() => {
    return keys.filter((item) => {
      const matchesSearch =
        item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.fullKey.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedNamespace === "all") return true;

      const ns = NAMESPACES.find((n) => n.id === selectedNamespace);
      if (ns?.prefix) {
        return item.key.startsWith(ns.prefix);
      }

      return true;
    });
  }, [keys, searchQuery, selectedNamespace]);

  const handleCopyJson = () => {
    if (!inspectingKey) return;
    const text = typeof inspectingKey.value === "object"
      ? JSON.stringify(inspectingKey.value, null, 2)
      : String(inspectingKey.value);
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPurge = (pattern: string, label: string) => {
    setPurgePatternInput(pattern);
    setPurgeTargetLabel(label);
    setShowPurgeDialog(true);
  };

  return (
    <div className="space-y-6 pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <Database className="w-7 h-7 text-primary" />
              Redis Cache Explorer
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Inspect active cache keys, TTL expiration, inspect raw JSON values, and perform instant invalidations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-primary" : ""}`} />
              <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              onClick={() => handleOpenPurge("*", "Entire Environment Cache")}
              className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium hover:bg-rose-100 flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Flush All Cache</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${data?.connected ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {data?.connected ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Redis Status</p>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                {data?.connected ? "Connected" : "Offline / Fallback"}
                <span className={`w-2 h-2 rounded-full ${data?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {data?.enabled ? "Redis engine active" : "Redis disabled in config"}
              </p>
            </div>
          </div>

          {/* Environment & Prefix */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Environment Scope</p>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                DB {data?.db ?? 0} · <code className="text-xs bg-indigo-100/70 text-indigo-800 px-1.5 py-0.5 rounded font-mono font-semibold">{data?.prefix || "prod:"}</code>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Isolated keyspace</p>
            </div>
          </div>

          {/* Total Keys */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cached Items</p>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                {keys.length} {keys.length === 1 ? "Key" : "Keys"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Active in environment</p>
            </div>
          </div>

          {/* Memory & Uptime */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Redis Memory</p>
              <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                {data?.usedMemoryHuman || "N/A"}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {data?.uptimeDays ? `Uptime: ${data.uptimeDays} days` : "128MB LRU cap"}
              </p>
            </div>
          </div>
        </div>

        {/* Namespace Pills Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {NAMESPACES.map((ns) => {
            const isSelected = selectedNamespace === ns.id;
            const Icon = ns.icon;
            const count = ns.id === "all"
              ? keys.length
              : keys.filter((k) => ns.prefix && k.key.startsWith(ns.prefix)).length;

            return (
              <button
                key={ns.id}
                onClick={() => setSelectedNamespace(ns.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap border ${
                  isSelected
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{ns.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    isSelected ? "bg-white/25 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Actions Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keys (e.g. ew:cat, slug, popular)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {selectedNamespace !== "all" && (
              <button
                onClick={() => {
                  const ns = NAMESPACES.find((n) => n.id === selectedNamespace);
                  if (ns) handleOpenPurge(ns.pattern, `${ns.label} (${ns.pattern})`);
                }}
                className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-rose-50 hover:text-rose-700 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purge {NAMESPACES.find((n) => n.id === selectedNamespace)?.label}</span>
              </button>
            )}

            <button
              onClick={() => handleOpenPurge("ew:cat:*", "Categories (ew:cat:*)")}
              className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Purge Categories</span>
            </button>

            <button
              onClick={() => handleOpenPurge("ew:tpl:*", "Templates (ew:tpl:*)")}
              className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Purge Templates</span>
            </button>
          </div>
        </div>

        {/* Keys Table Container */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
              <p className="text-sm font-medium text-gray-500">Connecting to Redis & fetching keys...</p>
            </div>
          ) : filteredKeys.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 mb-3">
                <Database className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900">No Cache Keys Found</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                {searchQuery
                  ? `No keys matched "${searchQuery}". Try a different filter.`
                  : "The cache is currently empty or Redis is warming up."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Namespace</th>
                    <th className="py-3.5 px-4">Key Name</th>
                    <th className="py-3.5 px-4">Expires in (TTL)</th>
                    <th className="py-3.5 px-4">Size</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs text-gray-700">
                  <AnimatePresence>
                    {filteredKeys.map((item) => {
                      const badge = getNamespaceBadge(item.key);
                      const BadgeIcon = badge.icon;
                      const isExpired = item.ttl === -2;
                      const isLowTtl = item.ttl > 0 && item.ttl < 120;

                      return (
                        <motion.tr
                          key={item.key}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50/60 transition-colors group"
                        >
                          {/* Namespace */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${badge.color}`}>
                              <BadgeIcon className="w-3 h-3" />
                              {badge.label}
                            </span>
                          </td>

                          {/* Key Name */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-xs font-bold text-gray-900 flex items-center gap-1.5">
                              <span>{item.key}</span>
                            </div>
                            <div className="font-mono text-[10px] text-gray-400 mt-0.5">
                              Full: {item.fullKey}
                            </div>
                          </td>

                          {/* TTL */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                                isExpired
                                  ? "bg-rose-50 text-rose-700"
                                  : isLowTtl
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {formatTtl(item.ttl)}
                            </span>
                          </td>

                          {/* Size */}
                          <td className="py-3.5 px-4 font-mono text-gray-500 font-medium">
                            {formatBytes(item.sizeBytes)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setInspectingKey(item)}
                                className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-700 font-semibold text-xs flex items-center gap-1 transition-all"
                                title="View Cached JSON Value"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect</span>
                              </button>

                              <button
                                onClick={() => deleteKeyMutation.mutate(item.key)}
                                disabled={deleteKeyMutation.isPending}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Invalidate Key"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* JSON Inspector Dialog */}
        <Dialog open={!!inspectingKey} onOpenChange={(open) => !open && setInspectingKey(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary" />
                    Cache Key Inspector
                  </DialogTitle>
                  <DialogDescription className="font-mono text-xs text-gray-500 mt-1">
                    {inspectingKey?.key}
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono font-bold">
                    TTL: {inspectingKey ? formatTtl(inspectingKey.ttl) : ""}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono font-bold">
                    {inspectingKey ? formatBytes(inspectingKey.sizeBytes) : ""}
                  </span>
                </div>
              </div>
            </DialogHeader>

            {/* JSON Code Viewer */}
            <div className="flex-1 overflow-y-auto my-4 bg-gray-950 rounded-xl p-4 border border-gray-800 text-gray-100 font-mono text-xs leading-relaxed max-h-[50vh] no-scrollbar">
              <pre className="whitespace-pre-wrap break-all">
                {inspectingKey?.value !== undefined
                  ? typeof inspectingKey.value === "object"
                    ? JSON.stringify(inspectingKey.value, null, 2)
                    : String(inspectingKey.value)
                  : "null"}
              </pre>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between sm:justify-between w-full">
              <button
                onClick={() => {
                  if (inspectingKey) deleteKeyMutation.mutate(inspectingKey.key);
                }}
                disabled={deleteKeyMutation.isPending}
                className="px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Invalidate Key</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy JSON"}</span>
                </button>

                <button
                  onClick={() => setInspectingKey(null)}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-all"
                >
                  Close
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Purge Confirmation Dialog */}
        <Dialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
          <DialogContent className="max-w-md p-6 rounded-2xl">
            <DialogHeader>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Purge Cache Confirmation
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-1">
                Are you sure you want to purge <strong className="text-gray-900">{purgeTargetLabel}</strong>? Next requests will re-fetch data fresh from PostgreSQL.
              </DialogDescription>
            </DialogHeader>

            <div className="my-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Redis Pattern Match
              </label>
              <input
                type="text"
                value={purgePatternInput}
                onChange={(e) => setPurgePatternInput(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. ew:cat:*"
              />
            </div>

            <DialogFooter className="flex gap-2">
              <button
                onClick={() => setShowPurgeDialog(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => purgeMutation.mutate(purgePatternInput)}
                disabled={purgeMutation.isPending}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{purgeMutation.isPending ? "Purging..." : "Confirm & Purge"}</span>
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default CacheManagement;
