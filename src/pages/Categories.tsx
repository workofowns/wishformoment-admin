import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  FolderOpen,
  FolderTree,
  Sparkles,
  Zap,
  Tag,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { fetchApi } from "@/lib/api";

interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  icon?: string | null;
  image_url?: string | null;
  theme_color?: string | null;
  sort_order: number;
  is_active: boolean;
  featured_position?: number | null;
  admin_boost?: number;
  template_count?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  title?: string | null;
  description?: string | null;
  tags?: string[];
  icon?: string | null;
  image_url?: string | null;
  theme_color?: string | null;
  sort_order: number;
  is_active: boolean;
  featured_position?: number | null;
  admin_boost?: number;
  subcategory_count?: number;
  template_count?: number;
  subcategories?: SubCategory[];
}

export default function Categories() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [expandedCatIds, setExpandedCatIds] = useState<Record<string, boolean>>({});
  const [deleteCategoryItem, setDeleteCategoryItem] = useState<Category | null>(null);

  // Queries
  const { data: catsRes, isLoading: isCatsLoading } = useQuery<{ data: Category[] }>({
    queryKey: ["adminCategories"],
    queryFn: () => fetchApi("/categories"),
  });

  const { data: subsRes, isLoading: isSubsLoading } = useQuery<{ data: SubCategory[] }>({
    queryKey: ["adminSubCategories"],
    queryFn: () => fetchApi("/sub-categories"),
  });

  const catsData = catsRes?.data || [];
  const subsData = subsRes?.data || [];

  // Group subcategories under their categories
  const categories: Category[] = useMemo(() => {
    return catsData.map((c) => ({
      ...c,
      subcategories: subsData.filter((sc) => sc.category_id === c.id),
    }));
  }, [catsData, subsData]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      // Status filter
      if (statusFilter === "active" && !cat.is_active) return false;
      if (statusFilter === "inactive" && cat.is_active) return false;

      // Search filter
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const matchName = cat.name?.toLowerCase().includes(q);
      const matchSlug = cat.slug?.toLowerCase().includes(q);
      const matchTitle = cat.title?.toLowerCase().includes(q);
      const matchDesc = cat.description?.toLowerCase().includes(q);
      const matchTags = Array.isArray(cat.tags) && cat.tags.some((t) => t.toLowerCase().includes(q));
      const matchSubs = cat.subcategories?.some((s) => s.name?.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q));

      return matchName || matchSlug || matchTitle || matchDesc || matchTags || matchSubs;
    });
  }, [categories, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.is_active).length;
    const inactive = total - active;
    const totalSubs = subsData.length;
    const pinned = categories.filter((c) => c.featured_position).length;
    return { total, active, inactive, totalSubs, pinned };
  }, [categories, subsData]);

  // Toggle Category Active Status Mutation
  const toggleCatActiveMutation = useMutation({
    mutationFn: async ({ id, nextActive }: { id: string; nextActive: boolean }) => {
      return fetchApi(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextActive }),
      });
    },
    onSuccess: (_, { nextActive }) => {
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      toast.success(nextActive ? "Category activated" : "Category deactivated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  // Toggle Subcategory Active Status Mutation
  const toggleSubActiveMutation = useMutation({
    mutationFn: async ({ subId, nextActive }: { subId: string; nextActive: boolean }) => {
      return fetchApi(`/sub-categories/${subId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextActive }),
      });
    },
    onSuccess: (_, { nextActive }) => {
      queryClient.invalidateQueries({ queryKey: ["adminSubCategories"] });
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      toast.success(nextActive ? "Subcategory activated" : "Subcategory deactivated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update subcategory status");
    },
  });

  // Delete Category Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return fetchApi(`/categories/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      queryClient.invalidateQueries({ queryKey: ["adminSubCategories"] });
      toast.success("Category deleted successfully");
      setDeleteCategoryItem(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete category");
    },
  });

  const toggleExpand = (catId: string) => {
    setExpandedCatIds((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const isLoading = isCatsLoading || isSubsLoading;

  return (
    <DashboardLayout>
      <div className="w-full max-w-7xl mx-auto space-y-8 pb-16">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shadow-xs">
              <FolderTree className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">
                Taxonomy & Discovery
              </p>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Categories & Collections
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage occasion categories, subcategories, discovery rankings, and active visibility
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/categories/new")}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl btn-primary text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Total Categories</p>
              <p className="text-xl font-black text-foreground">{stats.total}</p>
            </div>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Active Categories</p>
              <p className="text-xl font-black text-emerald-600">{stats.active}</p>
            </div>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-500/10 text-slate-600 flex items-center justify-center font-bold">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Subcategories</p>
              <p className="text-xl font-black text-foreground">{stats.totalSubs}</p>
            </div>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Pinned Collections</p>
              <p className="text-xl font-black text-amber-600">{stats.pinned}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories by name, slug, tag, or subcategory..."
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-card border border-border text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all shadow-xs"
            />
          </div>

          <div className="flex bg-card p-1 rounded-2xl border border-border shadow-xs self-start sm:self-auto">
            {(["all", "active", "inactive"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === st
                  ? "bg-primary text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Category Cards List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs font-bold text-muted-foreground">Loading categories and taxonomy...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-16 text-center bg-card rounded-2xl border border-dashed border-border p-8">
            <FolderTree className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-bold text-foreground">No categories found</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {search || statusFilter !== "all"
                ? "Try clearing your search or filters to see all categories."
                : "Get started by adding your first occasion category."}
            </p>
            {search || statusFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-bold hover:bg-muted/80"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => navigate("/categories/new")}
                className="px-4 py-2 rounded-xl btn-primary text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCategories.map((cat, index) => {
              const isExpanded = Boolean(expandedCatIds[cat.id]);
              const subs = cat.subcategories || [];

              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`bg-card rounded-2xl border transition-all duration-200 overflow-hidden ${cat.is_active
                    ? "border-border hover:border-primary/40 hover:shadow-md"
                    : "border-dashed border-border/80 bg-muted/20 opacity-75"
                    }`}
                >
                  {/* Category Card Header Row */}
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left: Visual Avatar & Information */}
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Avatar Icon / Image */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-2xl shadow-sm overflow-hidden shrink-0"
                        style={
                          cat.theme_color?.includes("gradient")
                            ? { background: cat.theme_color }
                            : { backgroundColor: (cat.theme_color || "#6C41CF") + "18" }
                        }
                      >
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="w-[50%] h-[50%] object-cover" />
                        ) : (
                          <span>{cat.icon || "📁"}</span>
                        )}
                      </div>

                      {/* Name, Slug, & Metadata */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3
                            className="font-black text-lg text-foreground tracking-tight truncate"
                            style={
                              cat.theme_color && !cat.theme_color.includes("gradient")
                                ? { color: cat.theme_color }
                                : undefined
                            }
                          >
                            {cat.name}
                          </h3>
                          <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                            /{cat.slug}
                          </span>

                          {/* Pin & Boost Badges */}
                          {cat.featured_position && (
                            <span className="bg-purple-600 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center shadow-xs">
                              <Sparkles className="w-2.5 h-2.5 mr-1" /> Pin #{cat.featured_position}
                            </span>
                          )}
                          {cat.admin_boost ? (
                            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center shadow-xs">
                              <Zap className="w-2.5 h-2.5 mr-1" /> +{cat.admin_boost} Boost
                            </span>
                          ) : null}

                          {/* Visibility badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${cat.is_active
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                              }`}
                          >
                            {cat.is_active ? "Active" : "Hidden"}
                          </span>
                        </div>

                        {/* Title or Description */}
                        {cat.title ? (
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                            {cat.title}
                          </p>
                        ) : cat.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {cat.description}
                          </p>
                        ) : null}

                        {/* Tags Preview */}
                        {cat.tags && cat.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {cat.tags.slice(0, 5).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground"
                              >
                                <Tag className="w-2.5 h-2.5 opacity-60" /> {tag}
                              </span>
                            ))}
                            {cat.tags.length > 5 && (
                              <span className="text-[10px] text-muted-foreground font-semibold px-1">
                                +{cat.tags.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Metrics & Actions */}
                    <div className="flex items-center gap-3 self-end md:self-auto shrink-0 flex-wrap">
                      {/* Counter Badges */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                        <span className="px-2.5 py-1 rounded-xl bg-muted/80 border border-border/60">
                          {subs.length} Subcategories
                        </span>
                        {cat.template_count !== undefined && (
                          <span className="px-2.5 py-1 rounded-xl bg-muted/80 border border-border/60">
                            {cat.template_count} Templates
                          </span>
                        )}
                      </div>

                      {/* Active / Inactive Switch */}
                      <div className="flex items-center gap-2 pl-2 border-l border-border/60">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {cat.is_active ? "Active" : "Inactive"}
                        </span>
                        <Switch
                          checked={cat.is_active}
                          onCheckedChange={(checked) =>
                            toggleCatActiveMutation.mutate({ id: cat.id, nextActive: checked })
                          }
                        />
                      </div>

                      {/* Manage & Edit CTA Button */}
                      <button
                        onClick={() => navigate(`/categories/${cat.id}`)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl btn-primary text-white text-xs font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Manage & Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteCategoryItem(cat)}
                        className="p-2 rounded-xl bg-card border border-border text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Subcategories toggle expand */}
                      <button
                        onClick={() => toggleExpand(cat.id)}
                        className={`p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-transform ${isExpanded ? "rotate-180 bg-muted" : ""
                          }`}
                        title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories Dropdown Panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-border/50 bg-muted/15"
                      >
                        <div className="p-5 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <FolderTree className="w-3.5 h-3.5 text-primary" /> Subcategories in {cat.name} ({subs.length})
                            </span>
                            <button
                              onClick={() => navigate(`/categories/${cat.id}`)}
                              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                              Add or Edit in Detail Page &rarr;
                            </button>
                          </div>

                          {subs.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {subs.map((sub) => (
                                <div
                                  key={sub.id}
                                  className={`p-3 rounded-xl border bg-card flex items-center justify-between gap-3 shadow-2xs transition-all ${sub.is_active
                                    ? "border-border/80"
                                    : "border-dashed border-border opacity-70 bg-muted/40"
                                    }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden"
                                      style={{
                                        background: sub.theme_color || "#FF8BC4" + "20",
                                      }}
                                    >
                                      {sub.image_url ? (
                                        <img src={sub.image_url} alt={sub.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span>{sub.icon || "📄"}</span>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-foreground truncate">
                                        {sub.name}
                                      </p>
                                      <p className="text-[10px] font-mono text-muted-foreground truncate">
                                        /{sub.slug}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <Switch
                                      className="scale-80 origin-right"
                                      checked={sub.is_active}
                                      onCheckedChange={(checked) =>
                                        toggleSubActiveMutation.mutate({ subId: sub.id, nextActive: checked })
                                      }
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-2">
                              No subcategories added yet. Click "Manage & Edit" to add subcategories.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={Boolean(deleteCategoryItem)} onOpenChange={() => setDeleteCategoryItem(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete Category
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to permanently delete category{" "}
              <strong>"{deleteCategoryItem?.name}"</strong>?
              This will remove all subcategories under it and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <button
              type="button"
              onClick={() => setDeleteCategoryItem(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-border bg-card hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteCategoryItem && deleteMutation.mutate(deleteCategoryItem.id)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
            >
              {deleteMutation.isPending ? "Deleting..." : "Yes, Delete Permanently"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
