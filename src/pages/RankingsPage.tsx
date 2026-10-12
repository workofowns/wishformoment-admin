import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trophy,
  Sparkles,
  Zap,
  Rocket,
  RefreshCw,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Edit2,
  ExternalLink,
  Layers,
  LayoutGrid,
  Crown,
  Medal,
  Award,
  Star,
  Eye,
  Heart,
  Check,
  X,
  ArrowUpDown,
  Flame,
  Info,
  Calendar,
  Clock,
  Calculator,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type TabType = "templates" | "categories" | "sub_categories";

interface TemplateRankingItem {
  id: string;
  rank: number;
  name: string;
  template_name: string | null;
  slug: string;
  type: "free" | "premium";
  price: number;
  thumbnail_url: string | null;
  is_active: boolean;
  created_at: string;
  used_count: number;
  view_count: number;
  featured_position: number | null;
  admin_boost: number;
  avg_rating: number;
  ratings_count: number;
  is_launch_bonus_active: boolean;
  launch_bonus_pts: number;
  recency_multiplier: number;
  base_score: number;
  popularity_score: number;
  categories: { id: string; name: string; slug: string }[];
  sub_categories: { id: string; name: string; slug: string }[];
}

interface CategoryRankingItem {
  id: string;
  rank: number;
  name: string;
  slug: string;
  title: string | null;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  theme_color: string | null;
  is_active: boolean;
  created_at: string;
  featured_position: number | null;
  admin_boost: number;
  template_count: number;
  wish_count_7d: number;
  wish_count_all: number;
  total_views: number;
  avg_rating: number;
  total_ratings: number;
  is_launch_bonus_active: boolean;
  launch_bonus_pts: number;
  popularity_score: number;
}

interface SubCategoryRankingItem {
  id: string;
  rank: number;
  name: string;
  slug: string;
  title: string | null;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  theme_color: string | null;
  is_active: boolean;
  created_at: string;
  featured_position: number | null;
  admin_boost: number;
  category_id: string;
  category_name: string;
  category_slug: string;
  template_count: number;
  wish_count_7d: number;
  wish_count_all: number;
  total_views: number;
  avg_rating: number;
  total_ratings: number;
  is_launch_bonus_active: boolean;
  launch_bonus_pts: number;
  popularity_score: number;
}

export default function RankingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("templates");

  // Search State with 350ms Debounce
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Quick Edit Modal State
  const [quickEditItem, setQuickEditItem] = useState<{
    entityType: TabType;
    id: string;
    name: string;
    featuredPosition: number | "";
    adminBoost: number;
  } | null>(null);

  // View Rank Details Modal State
  const [selectedDetailItem, setSelectedDetailItem] = useState<{
    item: any;
    entityType: TabType;
  } | null>(null);

  // Fetch Overview Stats
  const { data: overviewData } = useQuery({
    queryKey: ["adminRankingsOverview"],
    queryFn: () => fetchApi("/rankings/overview"),
  });

  // Fetch Categories for Filter Dropdown
  const { data: allCategoriesRes } = useQuery({
    queryKey: ["adminAllCategoriesList"],
    queryFn: () => fetchApi("/categories"),
  });
  const categoriesList = allCategoriesRes?.data || [];

  // Fetch Subcategories for Filter Dropdown
  const { data: allSubCategoriesRes } = useQuery({
    queryKey: ["adminAllSubCategoriesList"],
    queryFn: () => fetchApi("/sub-categories"),
  });
  const subCategoriesList = allSubCategoriesRes?.data || [];

  // Build query string
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(selectedCategory !== "all" && { categoryId: selectedCategory }),
    ...(selectedSubCategory !== "all" && { subCategoryId: selectedSubCategory }),
    ...(selectedType !== "all" && { type: selectedType }),
    ...(selectedStatus !== "all" && { status: selectedStatus }),
  });

  // Fetch active tab data
  const { data: tableData, isLoading } = useQuery({
    queryKey: ["adminRankingsList", activeTab, queryParams.toString()],
    queryFn: () => {
      const endpoint =
        activeTab === "templates"
          ? `/rankings/templates?${queryParams.toString()}`
          : activeTab === "categories"
          ? `/rankings/categories?${queryParams.toString()}`
          : `/rankings/sub-categories?${queryParams.toString()}`;
      return fetchApi(endpoint);
    },
  });

  // Recalculate mutation
  const recalculateMutation = useMutation({
    mutationFn: () => fetchApi("/rankings/recalculate", { method: "POST" }),
    onSuccess: (res: any) => {
      toast.success(res.message || "Rankings recalculated and cache warmed!");
      queryClient.invalidateQueries({ queryKey: ["adminRankingsList"] });
      queryClient.invalidateQueries({ queryKey: ["adminRankingsOverview"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Recalculation failed");
    },
  });

  // Quick update mutation
  const quickUpdateMutation = useMutation({
    mutationFn: (payload: {
      entityType: "template" | "category" | "sub_category";
      id: string;
      featuredPosition: number | null;
      adminBoost: number;
    }) =>
      fetchApi("/rankings/quick-update", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Ranking settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["adminRankingsList"] });
      queryClient.invalidateQueries({ queryKey: ["adminRankingsOverview"] });
      setQuickEditItem(null);
      setSelectedDetailItem(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update ranking");
    },
  });

  const handleSaveQuickEdit = () => {
    if (!quickEditItem) return;
    const entityType =
      quickEditItem.entityType === "templates"
        ? "template"
        : quickEditItem.entityType === "categories"
        ? "category"
        : "sub_category";

    quickUpdateMutation.mutate({
      entityType,
      id: quickEditItem.id,
      featuredPosition:
        quickEditItem.featuredPosition === ""
          ? null
          : Number(quickEditItem.featuredPosition),
      adminBoost: Number(quickEditItem.adminBoost) || 0,
    });
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedCategory("all");
    setSelectedSubCategory("all");
    setSelectedType("all");
    setSelectedStatus("all");
    setSortBy("default");
  };

  const items = tableData?.data || [];
  const total = tableData?.total || 0;
  const totalPages = tableData?.totalPages || 1;

  // Stats calculation
  const currentStats =
    activeTab === "templates"
      ? overviewData?.templates
      : activeTab === "categories"
      ? overviewData?.categories
      : overviewData?.subCategories;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* ════ HEADER SECTION ════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 font-bold text-xs flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Algorithmic Ranking Engine
              </span>
              <span className="text-xs text-muted-foreground font-medium">• Live Multi-tier Cache</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Popularity & Promotion Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mt-0.5">
              Inspect organic algorithmic scores, view detailed mathematical signal breakdowns, and adjust fixed position pins or custom weight boosts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  recalculateMutation.isPending ? "animate-spin" : ""
                }`}
              />
              {recalculateMutation.isPending
                ? "Recalculating..."
                : "Recalculate & Warm Cache"}
            </button>
          </div>
        </div>

        {/* ════ KPI STATS CARDS ════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Pinned Entities
              </p>
              <h3 className="text-xl font-black text-slate-900">
                {currentStats?.pinned_total || 0}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  of {currentStats?.total || 0}
                </span>
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Boosted Scores
              </p>
              <h3 className="text-xl font-black text-slate-900">
                {currentStats?.boosted_total || 0}
                <span className="text-xs font-normal text-slate-400 ml-1">active</span>
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                14-Day Launch Bonus
              </p>
              <h3 className="text-xl font-black text-slate-900">
                {currentStats?.launch_bonus_total || 0}
                <span className="text-xs font-semibold text-emerald-600 ml-1">+25 pts</span>
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Snapshot Computed
              </p>
              <h3 className="text-xs font-bold text-slate-700 truncate">
                {overviewData?.lastComputedAt
                  ? new Date(overviewData.lastComputedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "Live Sync"}
              </h3>
              <p className="text-[10px] text-slate-400">30m recursive cycle</p>
            </div>
          </div>
        </div>

        {/* ════ TAB NAVIGATION ════ */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => handleTabChange("templates")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "templates"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Templates Ranking
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "templates"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {overviewData?.templates?.total || 0}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("categories")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "categories"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Categories Ranking
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "categories"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {overviewData?.categories?.total || 0}
            </span>
          </button>

          <button
            onClick={() => handleTabChange("sub_categories")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "sub_categories"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Subcategories Ranking
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === "sub_categories"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {overviewData?.subCategories?.total || 0}
            </span>
          </button>
        </div>

        {/* ════ FILTERS & SEARCH CONTROLS ════ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Debounced Search Bar */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${activeTab.replace("_", " ")} by name, slug or keyword...`}
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-400"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter (for Templates & Subcategories) */}
            {(activeTab === "templates" || activeTab === "sub_categories") && (
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setSelectedSubCategory("all");
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[170px] h-9 text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 text-slate-700 focus:ring-primary/20">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 max-h-64">
                  <SelectItem value="all">📁 All Categories</SelectItem>
                  {categoriesList.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{cat.icon || "📁"}</span>
                        <span className="truncate">{cat.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* SubCategory Filter (for Templates) */}
            {activeTab === "templates" && (
              <Select
                value={selectedSubCategory}
                onValueChange={(val) => {
                  setSelectedSubCategory(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[175px] h-9 text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 text-slate-700 focus:ring-primary/20">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 max-h-64">
                  <SelectItem value="all">📑 All Subcategories</SelectItem>
                  {subCategoriesList
                    .filter((sc: any) =>
                      selectedCategory !== "all"
                        ? sc.category_id === selectedCategory
                        : true
                    )
                    .map((sc: any) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        <span className="truncate">{sc.name}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            {/* Type Filter (for Templates) */}
            {activeTab === "templates" && (
              <Select
                value={selectedType}
                onValueChange={(val) => {
                  setSelectedType(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px] h-9 text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 text-slate-700 focus:ring-primary/20">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free Only</SelectItem>
                  <SelectItem value="premium">👑 Premium Only</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Status Filter */}
            <Select
              value={selectedStatus}
              onValueChange={(val) => {
                setSelectedStatus(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[175px] h-9 text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 text-slate-700 focus:ring-primary/20">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pinned">📌 Pinned Only</SelectItem>
                <SelectItem value="boosted">⚡ Boosted Only</SelectItem>
                <SelectItem value="launch_bonus">🚀 14-Day Debut Active</SelectItem>
                <SelectItem value="active">Publicly Active</SelectItem>
                <SelectItem value="inactive">Hidden / Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Dropdown */}
            <Select
              value={sortBy}
              onValueChange={(val) => {
                setSortBy(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[190px] h-9 text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 text-slate-700 focus:ring-primary/20">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200">
                <SelectItem value="default">Ranked (Pin + Score)</SelectItem>
                <SelectItem value="score">Popularity Score</SelectItem>
                <SelectItem value="pin">Pin Position</SelectItem>
                <SelectItem value="boost">Admin Boost</SelectItem>
                <SelectItem value="wishes">Completed Wishes</SelectItem>
                <SelectItem value="rating">Star Rating</SelectItem>
                <SelectItem value="views">View Volume</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Order Button */}
            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
              title={`Toggle sort order (${sortOrder.toUpperCase()})`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ════ RANKING TABLE ════ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16 text-center">Rank</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Promotions</th>
                  <th className="py-3.5 px-4">Engagement Metrics</th>
                  <th className="py-3.5 px-4 text-center">Score Calculation</th>
                  <th className="py-3.5 px-4 text-right">Popularity Score</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading live ranking data...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No entities matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  items.map((item: any) => {
                    const isTop3 = item.rank <= 3 && !debouncedSearch && sortBy === "default";
                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          !item.is_active
                            ? "opacity-50 grayscale"
                            : isTop3 && item.rank === 1
                            ? "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]"
                            : isTop3 && item.rank === 2
                            ? "bg-slate-500/[0.03] hover:bg-slate-500/[0.06]"
                            : isTop3 && item.rank === 3
                            ? "bg-amber-700/[0.03] hover:bg-amber-700/[0.06]"
                            : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-4 px-4 text-center">
                          {isTop3 && item.rank === 1 ? (
                            <div className="inline-flex flex-col items-center justify-center">
                              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-300 text-amber-950 flex items-center justify-center shadow-md shadow-amber-500/25 border border-amber-300 ring-2 ring-amber-400/30 group-hover:scale-105 transition-transform">
                                <Crown className="w-4 h-4 fill-amber-950 stroke-none" />
                              </div>
                              <span className="text-[9px] font-black text-amber-700 uppercase tracking-tight mt-1">
                                #1 Gold
                              </span>
                            </div>
                          ) : isTop3 && item.rank === 2 ? (
                            <div className="inline-flex flex-col items-center justify-center">
                              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-200 via-slate-100 to-slate-300 text-slate-800 flex items-center justify-center shadow-md shadow-slate-400/20 border border-slate-300 ring-2 ring-slate-300/40 group-hover:scale-105 transition-transform">
                                <Medal className="w-4 h-4 text-slate-700 stroke-[2.2]" />
                              </div>
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight mt-1">
                                #2 Silver
                              </span>
                            </div>
                          ) : isTop3 && item.rank === 3 ? (
                            <div className="inline-flex flex-col items-center justify-center">
                              <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-700 to-orange-800 text-white flex items-center justify-center shadow-md shadow-amber-800/25 border border-amber-500/50 ring-2 ring-amber-700/30 group-hover:scale-105 transition-transform">
                                <Award className="w-4 h-4 text-amber-200 stroke-[2.2]" />
                              </div>
                              <span className="text-[9px] font-black text-amber-800 uppercase tracking-tight mt-1">
                                #3 Bronze
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg bg-slate-100/90 border border-slate-200 text-slate-600 font-mono font-bold text-xs">
                              #{item.rank}
                            </div>
                          )}
                        </td>

                        {/* Entity Info */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {activeTab === "templates" ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                {item.thumbnail_url ? (
                                  <img
                                    src={item.thumbnail_url}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border border-slate-200 shrink-0 shadow-inner"
                                style={
                                  item.theme_color && !item.theme_color.includes("gradient")
                                    ? { backgroundColor: item.theme_color + "20" }
                                    : { backgroundColor: "#f1f5f9" }
                                }
                              >
                                {item.image_url ? (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-5 h-5 object-cover"
                                  />
                                ) : (
                                  item.icon || "📁"
                                )}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4
                                  onClick={() => setSelectedDetailItem({ item, entityType: activeTab })}
                                  className="font-bold text-slate-900 truncate max-w-[200px] cursor-pointer hover:text-primary transition-colors"
                                >
                                  {item.template_name || item.name}
                                </h4>
                                {item.type === "premium" && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
                                    ₹{item.price ? item.price / 100 : 0}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                /{item.slug}
                              </p>
                              {activeTab === "templates" && item.categories?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                    {item.categories[0].name}
                                  </span>
                                </div>
                              )}
                              {activeTab === "sub_categories" && item.category_name && (
                                <p className="text-[9px] text-slate-500">
                                  Category: <span className="font-semibold">{item.category_name}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Promotion & Status Badges */}
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {item.featured_position && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-black uppercase shadow-xs">
                                <Sparkles className="w-2.5 h-2.5" /> Pin #{item.featured_position}
                              </span>
                            )}
                            {item.admin_boost > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase shadow-xs">
                                <Zap className="w-2.5 h-2.5" /> +{item.admin_boost} Boost
                              </span>
                            )}
                            {item.is_launch_bonus_active && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                <Rocket className="w-2.5 h-2.5" /> +25 Debut (14d)
                              </span>
                            )}
                            {!item.featured_position && item.admin_boost === 0 && !item.is_launch_bonus_active && (
                              <span className="text-[10px] text-slate-400 italic">Organic Score</span>
                            )}
                          </div>
                        </td>

                        {/* Engagement Metrics */}
                        <td className="py-3 px-4">
                          {activeTab === "templates" ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 font-bold text-slate-800" title="Completed Wishes Created">
                                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                                  <span>{Number(item.used_count || 0).toLocaleString()}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">wishes</span>
                                </span>
                                <span className="flex items-center gap-1 font-bold text-amber-700" title="Customer Rating & Reviews">
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />
                                  <span>{Number(item.avg_rating || 0).toFixed(1)}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">({item.ratings_count || 0})</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <Eye className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{Number(item.view_count || 0).toLocaleString()} views</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1 font-bold text-orange-700" title="Wishes created in last 7 days">
                                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                                  <span>{item.wish_count_7d || 0}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">7d ({item.wish_count_all || 0} all)</span>
                                </span>
                                <span className="flex items-center gap-1 font-bold text-slate-700" title="Total Active Templates">
                                  <LayoutGrid className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>{item.template_count || 0}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">designs</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="flex items-center gap-1 font-semibold text-amber-700">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />
                                  <span>{Number(item.avg_rating || 0).toFixed(1)}</span>
                                  <span className="text-slate-400">({item.total_ratings || 0})</span>
                                </span>
                                <span className="text-slate-300">•</span>
                                <span>{Number(item.total_views || 0).toLocaleString()} views</span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Score Calculation */}
                        <td className="py-3 px-4 text-center">
                          {activeTab === "templates" ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1 text-xs font-bold text-slate-800 font-mono">
                                <span>{Number(item.base_score || 0).toFixed(1)} base</span>
                                <span className="text-slate-400 font-normal">×</span>
                                <span className="text-primary font-black">{item.recency_multiplier}x</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                {item.recency_multiplier === 1.5 ? (
                                  <span className="text-emerald-600 font-semibold">New 30d (1.5x)</span>
                                ) : item.recency_multiplier === 1.25 ? (
                                  <span className="text-emerald-600 font-semibold">Recent 90d (1.25x)</span>
                                ) : (
                                  <span>Standard (1.0x)</span>
                                )}
                                {item.admin_boost > 0 && <span className="text-indigo-600 font-bold">• +{item.admin_boost}</span>}
                                {item.is_launch_bonus_active && <span className="text-emerald-600 font-bold">• +25 debut</span>}
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <div className="flex items-center gap-1 text-xs font-bold text-slate-800 font-mono">
                                <span className="text-orange-700">{(item.wish_count_7d || 0) * 10} 7d</span>
                                <span className="text-slate-300 font-normal">+</span>
                                <span className="text-amber-700">{Math.round((item.total_ratings || 0) * 3 + (item.avg_rating || 0) * 5)} ratings</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                <span>+{(item.template_count || 0) * (activeTab === "categories" ? 3 : 2)} catalog</span>
                                {item.admin_boost > 0 && <span className="text-indigo-600 font-bold">• +{item.admin_boost}</span>}
                                {item.is_launch_bonus_active && <span className="text-emerald-600 font-bold">• +25 debut</span>}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Final Popularity Score */}
                        <td className="py-4 px-4 text-right">
                          <span className="text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {Number(item.popularity_score || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                          </span>
                        </td>

                        {/* Quick Edit & Details Actions */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Inspect Details Button */}
                            <button
                              onClick={() => setSelectedDetailItem({ item, entityType: activeTab })}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                              title="Inspect Full Rank & Formula Breakdown"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>

                            {/* Quick Edit Pin & Boost Button */}
                            <button
                              onClick={() =>
                                setQuickEditItem({
                                  entityType: activeTab,
                                  id: item.id,
                                  name: item.template_name || item.name,
                                  featuredPosition: item.featured_position ?? "",
                                  adminBoost: item.admin_boost ?? 0,
                                })
                              }
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-primary hover:text-white text-slate-600 transition-colors"
                              title="Quick Edit Pin & Boost"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {activeTab === "templates" && (
                              <Link
                                to={`/templates/edit/${item.id}`}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                title="Full Template Editor"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ════ PAGINATION BAR ════ */}
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>
                Showing page <strong className="text-slate-800">{page}</strong> of{" "}
                <strong className="text-slate-800">{totalPages}</strong> ({total} items)
              </span>

              {/* Modern Page Size Dropdown */}
              <div className="ml-2">
                <Select
                  value={limit.toString()}
                  onValueChange={(val) => {
                    setLimit(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[105px] h-8 text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 text-slate-700">
                    <SelectValue placeholder="Page size" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-bold text-slate-800">
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ════ VIEW RANK DETAILS BREAKDOWN MODAL ════ */}
        <AnimatePresence>
          {selectedDetailItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto"
              >
                {/* Modal Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    {selectedDetailItem.entityType === "templates" ? (
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        {selectedDetailItem.item.thumbnail_url ? (
                          <img
                            src={selectedDetailItem.item.thumbnail_url}
                            alt={selectedDetailItem.item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Sparkles className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border border-slate-200 shrink-0 shadow-inner"
                        style={
                          selectedDetailItem.item.theme_color &&
                          !selectedDetailItem.item.theme_color.includes("gradient")
                            ? { backgroundColor: selectedDetailItem.item.theme_color + "25" }
                            : { backgroundColor: "#f1f5f9" }
                        }
                      >
                        {selectedDetailItem.item.image_url ? (
                          <img
                            src={selectedDetailItem.item.image_url}
                            alt={selectedDetailItem.item.name}
                            className="w-8 h-8 object-cover"
                          />
                        ) : (
                          selectedDetailItem.item.icon || "📁"
                        )}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 text-xs font-black uppercase">
                          Rank #{selectedDetailItem.item.rank}
                        </span>
                        <span className="text-xs text-slate-400 uppercase font-bold">
                          {selectedDetailItem.entityType.replace("_", " ")}
                        </span>
                      </div>
                      <h2 className="text-lg font-black text-slate-900 mt-0.5">
                        {selectedDetailItem.item.template_name || selectedDetailItem.item.name}
                      </h2>
                      <p className="text-xs font-mono text-slate-400">
                        /{selectedDetailItem.item.slug}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDetailItem(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score Summary Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-900 text-white shadow-sm space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Popularity Score
                    </span>
                    <h3 className="text-xl font-black text-amber-400">
                      {Number(selectedDetailItem.item.popularity_score || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </h3>
                  </div>

                  <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 text-purple-900 space-y-0.5">
                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">
                      Pin Position
                    </span>
                    <h3 className="text-sm font-black flex items-center gap-1 mt-1">
                      {selectedDetailItem.item.featured_position ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          Pinned #{selectedDetailItem.item.featured_position}
                        </>
                      ) : (
                        <span className="text-slate-500 font-semibold">Organic (None)</span>
                      )}
                    </h3>
                  </div>

                  <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-900 space-y-0.5">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                      Admin Boost
                    </span>
                    <h3 className="text-sm font-black flex items-center gap-1 mt-1">
                      {selectedDetailItem.item.admin_boost > 0 ? (
                        <>
                          <Zap className="w-3.5 h-3.5 text-indigo-600" />
                          +{selectedDetailItem.item.admin_boost} pts
                        </>
                      ) : (
                        <span className="text-slate-500 font-semibold">+0 pts</span>
                      )}
                    </h3>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      14d Debut Bonus
                    </span>
                    <h3 className="text-sm font-black flex items-center gap-1 mt-1">
                      {selectedDetailItem.item.is_launch_bonus_active ? (
                        <>
                          <Rocket className="w-3.5 h-3.5 text-emerald-600" />
                          +25 pts Active
                        </>
                      ) : (
                        <span className="text-slate-500 font-semibold">Expired (0 pts)</span>
                      )}
                    </h3>
                  </div>
                </div>

                {/* Mathematical Signal Breakdown Table */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Mathematical Signals & Weights
                    </h4>
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100/70">
                          <th className="py-2.5 px-4">Metric / Signal</th>
                          <th className="py-2.5 px-4 text-right">Raw Value</th>
                          <th className="py-2.5 px-4 text-right">Formula Weight</th>
                          <th className="py-2.5 px-4 text-right">Points Contributed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 font-medium">
                        {selectedDetailItem.entityType === "templates" ? (
                          <>
                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                                <span>Completed Wishes Created</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {selectedDetailItem.item.used_count || 0} wishes
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">× 5.0</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700">
                                +{((selectedDetailItem.item.used_count || 0) * 5).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                <span>Average Customer Star Rating</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {Number(selectedDetailItem.item.avg_rating || 0).toFixed(2)}★
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">× 4.0</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                                +{(Number(selectedDetailItem.item.avg_rating || 0) * 4).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Info className="w-3.5 h-3.5 text-amber-600" />
                                <span>Customer Feedback / Reviews Volume</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {selectedDetailItem.item.ratings_count || 0} reviews
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">× 3.0</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                                +{((selectedDetailItem.item.ratings_count || 0) * 3).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Catalog Impressions & Views</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {Number(selectedDetailItem.item.view_count || 0).toLocaleString()} views
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">× 0.2</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">
                                +{(Number(selectedDetailItem.item.view_count || 0) * 0.2).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Rocket className="w-3.5 h-3.5 text-emerald-600" />
                                <span>14-Day Launch Debut Bonus</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {selectedDetailItem.item.is_launch_bonus_active ? "Active (< 14d)" : "Expired"}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">Flat +25</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                                +{selectedDetailItem.item.launch_bonus_pts || 0}.0
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Admin Custom Boost Score</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                +{selectedDetailItem.item.admin_boost || 0} pts
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">Custom</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-700">
                                +{selectedDetailItem.item.admin_boost || 0}.0
                              </td>
                            </tr>
                          </>
                        ) : (
                          <>
                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                                <span>7-Day Recent Viral Wishes</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {selectedDetailItem.item.wish_count_7d || 0} wishes
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">× 10.0 (20x)</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-orange-700">
                                +{((selectedDetailItem.item.wish_count_7d || 0) * 10).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                                <span>Lifetime Evergreen Wishes</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {selectedDetailItem.item.wish_count_all || 0} wishes
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">× 0.5</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-700">
                                +{((selectedDetailItem.item.wish_count_all || 0) * 0.5).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                                <span>Average Customer Star Rating</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {Number(selectedDetailItem.item.avg_rating || 0).toFixed(2)}★
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">× 5.0</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                                +{(Number(selectedDetailItem.item.avg_rating || 0) * 5).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Info className="w-3.5 h-3.5 text-amber-600" />
                                <span>Total Ratings & Feedback</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {selectedDetailItem.item.total_ratings || 0} ratings
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">× 3.0</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                                +{((selectedDetailItem.item.total_ratings || 0) * 3).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Catalog Template Depth</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {selectedDetailItem.item.template_count || 0} designs
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">
                                × {selectedDetailItem.entityType === "categories" ? "3.0" : "2.0"}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-700">
                                +{(
                                  (selectedDetailItem.item.template_count || 0) *
                                  (selectedDetailItem.entityType === "categories" ? 3 : 2)
                                ).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Total Views</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {Number(selectedDetailItem.item.total_views || 0).toLocaleString()} views
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">× 0.1</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">
                                +{(Number(selectedDetailItem.item.total_views || 0) * 0.1).toFixed(1)}
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Rocket className="w-3.5 h-3.5 text-emerald-600" />
                                <span>14-Day Launch Debut Bonus</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                {selectedDetailItem.item.is_launch_bonus_active ? "Active (< 14d)" : "Expired"}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">Flat +25</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                                +{selectedDetailItem.item.launch_bonus_pts || 0}.0
                              </td>
                            </tr>

                            <tr>
                              <td className="py-2.5 px-4 flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Admin Custom Boost Score</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                                +{selectedDetailItem.item.admin_boost || 0} pts
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">Custom</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-700">
                                +{selectedDetailItem.item.admin_boost || 0}.0
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recency Time-Decay Step (for templates) */}
                {selectedDetailItem.entityType === "templates" && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                        <TrendingUp className="w-4 h-4 text-amber-700" />
                        <span>Recency Multiplier Calculation</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-xs font-mono">
                        {selectedDetailItem.item.recency_multiplier}x Multiplier
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Created on{" "}
                      <strong>
                        {new Date(selectedDetailItem.item.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </strong>{" "}
                      (
                      {Math.floor(
                        (Date.now() - new Date(selectedDetailItem.item.created_at).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days ago).{" "}
                      {selectedDetailItem.item.recency_multiplier === 1.5
                        ? "Currently in New & Trending tier (< 30 days) with a 1.50× boost."
                        : selectedDetailItem.item.recency_multiplier === 1.25
                        ? "Currently in Recent Traction tier (< 90 days) with a 1.25× boost."
                        : "Operating at lifetime baseline multiplier (1.00×)."}
                    </p>
                    <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs font-mono font-bold text-slate-900">
                      <span>Formula: {selectedDetailItem.item.base_score} base × {selectedDetailItem.item.recency_multiplier}x =</span>
                      <span className="text-sm font-black text-amber-900">{selectedDetailItem.item.popularity_score} pts</span>
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    ID: <code className="text-slate-600 font-mono text-[11px]">{selectedDetailItem.item.id}</code>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const itemToEdit = selectedDetailItem;
                        setSelectedDetailItem(null);
                        setQuickEditItem({
                          entityType: itemToEdit.entityType,
                          id: itemToEdit.item.id,
                          name: itemToEdit.item.template_name || itemToEdit.item.name,
                          featuredPosition: itemToEdit.item.featured_position ?? "",
                          adminBoost: itemToEdit.item.admin_boost ?? 0,
                        });
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Adjust Pin & Boost
                    </button>

                    {selectedDetailItem.entityType === "templates" && (
                      <Link
                        to={`/templates/edit/${selectedDetailItem.item.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Template Editor
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ════ QUICK EDIT PIN & BOOST MODAL ════ */}
        <AnimatePresence>
          {quickEditItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Adjust Ranking & Promotion</h3>
                      <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        {quickEditItem.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setQuickEditItem(null)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Fixed Pin Position */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        Fixed Pin Position
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quickEditItem.featuredPosition}
                      onChange={(e) =>
                        setQuickEditItem({
                          ...quickEditItem,
                          featuredPosition: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      placeholder="e.g. 1 (Top guaranteed slot)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-300"
                    />
                    <p className="text-[10px] text-slate-400">
                      Enter 1 to guarantee 1st place in catalog feeds. Leave blank for organic ranking.
                    </p>
                  </div>

                  {/* Admin Boost Score */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-indigo-600" />
                        Admin Boost Score
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Hybrid Score Weight</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={quickEditItem.adminBoost || ""}
                      onChange={(e) =>
                        setQuickEditItem({
                          ...quickEditItem,
                          adminBoost: Number(e.target.value),
                        })
                      }
                      placeholder="e.g. 50, 100, 200 pts"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-slate-300"
                    />
                    <p className="text-[10px] text-slate-400">
                      Extra points added directly to base score before recency calculations.
                    </p>
                  </div>
                </div>

                {/* Modal Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setQuickEditItem(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickEdit}
                    disabled={quickUpdateMutation.isPending}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {quickUpdateMutation.isPending ? "Saving..." : "Save Ranking"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
