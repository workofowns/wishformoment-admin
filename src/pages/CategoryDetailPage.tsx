import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Edit2,
  Sparkles,
  Zap,
  Tag,
  Upload,
  Layers,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  FolderTree,
  Eye,
  X,
  Check,
  Globe,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { GradientColorPicker } from "@/components/ui/GradientColorPicker";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { fetchApi, uploadMedia, MEDIA_FOLDERS } from "@/lib/api";

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
  created_at?: string;
  updated_at?: string;
}

interface CategoryDetail {
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
  created_at?: string;
  updated_at?: string;
  subcategories?: SubCategory[];
  template_count?: number;
}

const COMMON_TAGS = [
  "Birthday", "Anniversary", "Love", "Wedding", "Romance", "Valentine",
  "Celebration", "Friendship", "Family", "Festival", "Greeting", "Special"
];

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const subFileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [icon, setIcon] = useState("📁");
  const [imageUrl, setImageUrl] = useState("");
  const [themeColor, setThemeColor] = useState("#6C41CF");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [featuredPosition, setFeaturedPosition] = useState<number | "">("");
  const [adminBoost, setAdminBoost] = useState<number>(0);

  // Subcategory modal state
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);
  const [subName, setSubName] = useState("");
  const [subSlug, setSubSlug] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [subDescription, setSubDescription] = useState("");
  const [subTags, setSubTags] = useState<string[]>([]);
  const [subTagInput, setSubTagInput] = useState("");
  const [subIcon, setSubIcon] = useState("📄");
  const [subImageUrl, setSubImageUrl] = useState("");
  const [subThemeColor, setSubThemeColor] = useState("#FF8BC4");
  const [subSortOrder, setSubSortOrder] = useState<number>(0);
  const [subIsActive, setSubIsActive] = useState<boolean>(true);
  const [subFeaturedPosition, setSubFeaturedPosition] = useState<number | "">("");
  const [subAdminBoost, setSubAdminBoost] = useState<number>(0);

  // Delete category confirmation dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Fetch Category Data
  const {
    data: category,
    isLoading,
    isError,
  } = useQuery<CategoryDetail>({
    queryKey: ["adminCategoryDetail", id],
    queryFn: () => fetchApi(`/categories/${id}`),
    enabled: !isNew,
  });

  // Populate form when data loads
  useEffect(() => {
    if (category) {
      setName(category.name || "");
      setSlug(category.slug || "");
      setTitle(category.title || "");
      setDescription(category.description || "");
      setTags(Array.isArray(category.tags) ? category.tags : []);
      setIcon(category.icon || "📁");
      setImageUrl(category.image_url || "");
      setThemeColor(category.theme_color || "#6C41CF");
      setSortOrder(category.sort_order ?? 0);
      setIsActive(category.is_active ?? true);
      setFeaturedPosition(category.featured_position ?? "");
      setAdminBoost(category.admin_boost ?? 0);
    }
  }, [category]);

  // Auto-slug generator
  const generateSlugFromName = (sourceName: string) => {
    return sourceName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (isNew || !slug) {
      setSlug(generateSlugFromName(val));
    }
  };

  // Tag helper
  const addTag = (newTag: string) => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Image Upload handler for Category
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedMimes.includes(file.type.toLowerCase())) {
      toast.error("Please upload a JPG, PNG, WEBP, GIF, or SVG image.");
      e.target.value = "";
      return;
    }

    const promise = uploadMedia(file, MEDIA_FOLDERS.CATEGORIES);
    toast.promise(promise, {
      loading: "Uploading category image...",
      success: (cdnUrl) => {
        setImageUrl(cdnUrl);
        return "Image uploaded successfully";
      },
      error: (err) => err?.message || "Image upload failed",
    });
  };

  // Image Upload handler for Subcategory
  const handleSubImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowedMimes.includes(file.type.toLowerCase())) {
      toast.error("Please upload a JPG, PNG, WEBP, GIF, or SVG image.");
      e.target.value = "";
      return;
    }

    const promise = uploadMedia(file, MEDIA_FOLDERS.SUB_CATEGORIES);
    toast.promise(promise, {
      loading: "Uploading subcategory image...",
      success: (cdnUrl) => {
        setSubImageUrl(cdnUrl);
        return "Subcategory image uploaded successfully";
      },
      error: (err) => err?.message || "Subcategory image upload failed",
    });
  };

  // Save Category Mutation (Create or Update)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Category Name is required");
      if (!slug.trim()) throw new Error("Category Slug is required");

      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        title: title.trim() || null,
        description: description.trim() || null,
        tags,
        icon: icon.trim() || null,
        imageUrl: imageUrl.trim() || null,
        themeColor: themeColor || null,
        sortOrder: Number(sortOrder) || 0,
        isActive,
        featuredPosition: featuredPosition === "" ? null : Number(featuredPosition),
        adminBoost: Number(adminBoost) || 0,
      };

      if (isNew) {
        return fetchApi("/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        return fetchApi(`/categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: (savedData) => {
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      queryClient.invalidateQueries({ queryKey: ["adminCategoryDetail", id] });
      toast.success(isNew ? "Category created successfully!" : "Category updated successfully!");
      if (isNew && savedData?.id) {
        navigate(`/categories/${savedData.id}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save category");
    },
  });

  // Delete Category Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      return fetchApi(`/categories/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      toast.success("Category deleted successfully");
      navigate("/categories");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete category");
    },
  });

  // Toggle Subcategory Active/Inactive
  const toggleSubActiveMutation = useMutation({
    mutationFn: async ({ subId, nextActive }: { subId: string; nextActive: boolean }) => {
      return fetchApi(`/sub-categories/${subId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCategoryDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["adminSubCategories"] });
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      toast.success("Subcategory status updated");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update subcategory status");
    },
  });

  // Delete Subcategory Mutation
  const deleteSubMutation = useMutation({
    mutationFn: async (subId: string) => {
      return fetchApi(`/sub-categories/${subId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCategoryDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["adminSubCategories"] });
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      toast.success("Subcategory deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete subcategory");
    },
  });

  // Open Subcategory Modal
  const openSubModal = (sub?: SubCategory) => {
    if (sub) {
      setEditingSub(sub);
      setSubName(sub.name || "");
      setSubSlug(sub.slug || "");
      setSubTitle(sub.title || "");
      setSubDescription(sub.description || "");
      setSubTags(Array.isArray(sub.tags) ? sub.tags : []);
      setSubIcon(sub.icon || "📄");
      setSubImageUrl(sub.image_url || "");
      setSubThemeColor(sub.theme_color || "#FF8BC4");
      setSubSortOrder(sub.sort_order ?? 0);
      setSubIsActive(sub.is_active ?? true);
      setSubFeaturedPosition(sub.featured_position ?? "");
      setSubAdminBoost(sub.admin_boost ?? 0);
    } else {
      setEditingSub(null);
      setSubName("");
      setSubSlug("");
      setSubTitle("");
      setSubDescription("");
      setSubTags([]);
      setSubIcon("📄");
      setSubImageUrl("");
      setSubThemeColor("#FF8BC4");
      setSubSortOrder(0);
      setSubIsActive(true);
      setSubFeaturedPosition("");
      setSubAdminBoost(0);
    }
    setSubModalOpen(true);
  };

  // Save Subcategory Mutation (Create or Edit)
  const saveSubMutation = useMutation({
    mutationFn: async () => {
      if (!subName.trim()) throw new Error("Subcategory name is required");
      if (!subSlug.trim()) throw new Error("Subcategory slug is required");
      if (!id) throw new Error("Category ID is missing");

      const payload = {
        categoryId: id,
        name: subName.trim(),
        slug: subSlug.trim(),
        title: subTitle.trim() || null,
        description: subDescription.trim() || null,
        tags: subTags,
        icon: subIcon.trim() || null,
        imageUrl: subImageUrl.trim() || null,
        themeColor: subThemeColor || null,
        sortOrder: Number(subSortOrder) || 0,
        isActive: subIsActive,
        featuredPosition: subFeaturedPosition === "" ? null : Number(subFeaturedPosition),
        adminBoost: Number(subAdminBoost) || 0,
      };

      if (editingSub) {
        return fetchApi(`/sub-categories/${editingSub.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        return fetchApi("/sub-categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCategoryDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["adminSubCategories"] });
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      toast.success(editingSub ? "Subcategory updated" : "Subcategory created");
      setSubModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save subcategory");
    },
  });

  if (!isNew && isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto py-20 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-semibold text-muted-foreground">Loading category details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!isNew && (isError || !category)) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-16 text-center glass-card rounded-3xl p-8 border border-border">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Category Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The requested category does not exist or has been removed.
          </p>
          <button
            onClick={() => navigate("/categories")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Categories
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const subcategoriesList = category?.subcategories || [];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">
        {/* Top Navigation & Breadcrumbs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/categories")}
              className="p-2.5 rounded-xl bg-card border border-border/80 hover:bg-muted text-foreground transition-all hover:scale-105 active:scale-95"
              title="Back to Categories"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Link to="/categories" className="hover:text-primary transition-colors">
                  Categories
                </Link>
                <span>/</span>
                <span className="text-foreground font-bold truncate max-w-[200px] sm:max-w-[320px]">
                  {name || (isNew ? "New Category" : "Category Overview")}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                {isNew ? "Create Category" : "Category Overview & Edit"}
                {!isNew && (
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isActive ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {isActive ? "Active" : "Inactive"}
              </span>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

            {!isNew && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate("/categories")}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-card border border-border hover:bg-muted text-foreground transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary text-white text-xs font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{isNew ? "Create Category" : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT / MAIN COLUMN (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Identity & Theming */}
            <div className="bg-card rounded-2xl border border-border/80 p-6 space-y-6 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Basic Identity & Theming</h2>
                    <p className="text-xs text-muted-foreground">Category name, slug, icon, and visual color palette</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Category Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Category Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={handleNameChange}
                    placeholder="e.g. Birthday"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>

                {/* Category Slug */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      URL Slug <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSlug(generateSlugFromName(name))}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Generate from Name
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-mono text-muted-foreground select-none">/</span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(generateSlugFromName(e.target.value))}
                      placeholder="birthday"
                      className="w-full pl-6 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-sm font-mono font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Icon, Image Upload, & Color */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* Icon (Emoji / Symbol) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Category Icon / Emoji
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-11 h-11 rounded-xl bg-muted/70 border border-border flex items-center justify-center text-xl shrink-0">
                      {icon || "📁"}
                    </div>
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      placeholder="e.g. 🎂 or 📁"
                      className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm font-medium outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Image / SVG Cover Upload */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Cover Image / Icon Asset (CDN)
                  </label>
                  <div className="flex items-center gap-3">
                    {imageUrl ? (
                      <div className="relative group w-11 h-11 rounded-xl overflow-hidden bg-slate-100 border border-border shrink-0">
                        <img src={imageUrl} alt="Category Asset" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-muted/50 border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0">
                        <FolderOpen className="w-4 h-4 opacity-50" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://cdn... or upload file"
                      className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium outline-none focus:border-primary/50"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Color Picker */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Theme Color & Brand Gradient
                    </label>
                    <p className="text-[11px] text-muted-foreground">Applied to category titles, accents, and card highlights</p>
                  </div>
                  <div
                    className="w-7 h-7 rounded-lg border border-border shadow-xs"
                    style={{ background: themeColor || "#6C41CF" }}
                  />
                </div>
                <div className="pt-1">
                  <GradientColorPicker value={themeColor} onChange={setThemeColor} />
                </div>
              </div>

              {/* Sort Order */}
              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Sort Order Sequence
                  </label>
                  <p className="text-[11px] text-muted-foreground">Lower numbers appear first in the catalog</p>
                </div>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                  className="w-24 px-3 py-1.5 rounded-xl bg-background border border-border text-xs font-bold text-center outline-none focus:border-primary/50"
                />
              </div>
            </div>

            {/* Card 2: SEO & Search Optimization */}
            <div className="bg-card rounded-2xl border border-border/80 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">SEO & Metadata</h2>
                    <p className="text-xs text-muted-foreground">Search engine meta titles, descriptions, and discovery keywords</p>
                  </div>
                </div>
              </div>

              {/* Meta Title */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Meta Title
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {title.length}/60 chars
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Birthday Wish Templates & Greetings — WishForMoment"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Category Description & Meta Description
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {description.length}/160 chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explore heartfelt and creative birthday wish templates for all ages and relationships..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm font-medium outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all resize-y"
                />
              </div>

              {/* Tags / Keywords */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Discovery Tags & Keywords
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-semibold text-slate-700 dark:text-slate-200 border border-border/80"
                    >
                      <Tag className="w-3 h-3 opacity-60" />
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="text-muted-foreground hover:text-rose-500 ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="Type tag and press Enter or comma..."
                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium outline-none focus:border-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => addTag(tagInput)}
                    className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-colors"
                  >
                    Add
                  </button>
                </div>

                {/* Common tag recommendations */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">Suggested:</span>
                  {COMMON_TAGS.filter((t) => !tags.includes(t)).slice(0, 6).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="text-[10px] font-bold text-muted-foreground hover:text-primary bg-muted/50 hover:bg-primary/10 px-2 py-0.5 rounded-md transition-colors"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 3: Ranking & Pinning Controls */}
            <div className="bg-card rounded-2xl border border-border/80 p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Discovery & Promotion</h2>
                    <p className="text-xs text-muted-foreground">Control pinning priority and algorithmic boost scores</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Fixed Pin Position */}
                <div className="space-y-1.5 bg-muted/30 p-4 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-600">
                    <Sparkles className="w-4 h-4" />
                    <span>Fixed Pin Position</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Pin this category to slot #1, #2, etc. (Leave empty for dynamic ranking)
                  </p>
                  <input
                    type="number"
                    min="1"
                    value={featuredPosition}
                    onChange={(e) => setFeaturedPosition(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="None (e.g. 1)"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* Admin Boost Score */}
                <div className="space-y-1.5 bg-muted/30 p-4 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                    <Zap className="w-4 h-4" />
                    <span>Admin Boost Score</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Adds bonus points to trending score (+50, +100, etc.)
                  </p>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={adminBoost || ""}
                    onChange={(e) => setAdminBoost(Number(e.target.value) || 0)}
                    placeholder="0 (e.g. 50)"
                    className="w-full px-3.5 py-2 rounded-xl bg-background border border-border text-sm font-semibold outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Subcategories Management */}
            {!isNew ? (
              <div className="bg-card rounded-2xl border border-border/80 p-6 space-y-6 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                      <FolderTree className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-foreground">Subcategories</h2>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary">
                          {subcategoriesList.length} Total
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Specific themes, relationships, and occasions within {name || "this category"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openSubModal()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Subcategory
                  </button>
                </div>

                {/* Subcategories List */}
                {subcategoriesList.length > 0 ? (
                  <div className="space-y-3">
                    {subcategoriesList.map((sub) => (
                      <div
                        key={sub.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                          sub.is_active
                            ? "bg-background border-border/70 hover:border-primary/40 hover:shadow-sm"
                            : "bg-muted/40 border-dashed border-border opacity-70"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Avatar icon or image */}
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-xs overflow-hidden shrink-0"
                            style={
                              sub.theme_color?.includes("gradient")
                                ? { background: sub.theme_color }
                                : { backgroundColor: (sub.theme_color || "#FF8BC4") + "20" }
                            }
                          >
                            {sub.image_url ? (
                              <img src={sub.image_url} alt={sub.name} className="w-full h-full object-cover" />
                            ) : (
                              <span>{sub.icon || "📄"}</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className="font-bold text-sm text-foreground truncate"
                                style={
                                  sub.theme_color && !sub.theme_color.includes("gradient")
                                    ? { color: sub.theme_color }
                                    : undefined
                                }
                              >
                                {sub.name}
                              </span>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                /{sub.slug}
                              </span>
                              {sub.featured_position && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 text-[9px] font-bold">
                                  #{sub.featured_position} Pin
                                </span>
                              )}
                              {sub.admin_boost ? (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 text-[9px] font-bold">
                                  +{sub.admin_boost}
                                </span>
                              ) : null}
                            </div>
                            {sub.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {sub.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Controls on Right */}
                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                          {/* Active / Inactive Switch */}
                          <div className="flex items-center gap-1.5 pr-2 border-r border-border/60">
                            <span className="text-[11px] font-bold text-muted-foreground">
                              {sub.is_active ? "Active" : "Inactive"}
                            </span>
                            <Switch
                              checked={sub.is_active}
                              onCheckedChange={(checked) =>
                                toggleSubActiveMutation.mutate({ subId: sub.id, nextActive: checked })
                              }
                            />
                          </div>

                          {/* Edit subcategory */}
                          <button
                            type="button"
                            onClick={() => openSubModal(sub)}
                            className="p-2 rounded-lg bg-card border border-border hover:bg-muted text-foreground transition-all"
                            title="Edit Subcategory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete subcategory */}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete subcategory "${sub.name}"?`)) {
                                deleteSubMutation.mutate(sub.id);
                              }
                            }}
                            className="p-2 rounded-lg bg-card border border-border hover:bg-rose-50 text-rose-600 transition-all"
                            title="Delete Subcategory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 border-2 border-dashed border-border rounded-xl bg-muted/20">
                    <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-bold text-foreground">No subcategories yet</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Break down {name || "this category"} into specific occasion categories.
                    </p>
                    <button
                      type="button"
                      onClick={() => openSubModal()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl btn-primary text-white text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add First Subcategory
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-2xl border border-dashed border-border p-6 text-center space-y-2">
                <FolderTree className="w-8 h-8 text-primary mx-auto mb-1 opacity-70" />
                <h3 className="text-sm font-bold text-foreground">Subcategories will be unlocked after creation</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Save this category first to create its ID, then you can easily attach and manage its subcategories.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT / SIDEBAR COLUMN (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Frontend Category Preview */}
            <div className="bg-card rounded-2xl border border-border/80 p-6 space-y-4 shadow-xs sticky top-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                    Live Catalog Preview
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Frontend View
                </span>
              </div>

              {/* Card visual mockup */}
              <div
                className="rounded-2xl p-5 border border-border/80 shadow-md relative overflow-hidden transition-all"
                style={{
                  background: themeColor?.includes("gradient")
                    ? themeColor
                    : themeColor
                    ? `linear-gradient(135deg, ${themeColor}15, ${themeColor}05)`
                    : "linear-gradient(135deg, rgba(108, 65, 207, 0.1), rgba(108, 65, 207, 0.02))",
                }}
              >
                {/* Visual Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm overflow-hidden"
                    style={{
                      background: themeColor?.includes("gradient")
                        ? "rgba(255,255,255,0.9)"
                        : (themeColor || "#6C41CF") + "25",
                    }}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <span>{icon || "📁"}</span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {featuredPosition && (
                      <span className="bg-purple-600 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center shadow-xs">
                        <Sparkles className="w-2.5 h-2.5 mr-1" /> Pin #{featuredPosition}
                      </span>
                    )}
                    {adminBoost > 0 && !featuredPosition && (
                      <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center shadow-xs">
                        <Zap className="w-2.5 h-2.5 mr-1" /> +{adminBoost} Boost
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        isActive ? "bg-emerald-500/20 text-emerald-700" : "bg-slate-500/20 text-slate-700"
                      }`}
                    >
                      {isActive ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>

                {/* Name & Slug */}
                <h4
                  className="text-lg font-black tracking-tight line-clamp-1 mb-0.5"
                  style={
                    themeColor && !themeColor.includes("gradient")
                      ? { color: themeColor }
                      : undefined
                  }
                >
                  {name || "Category Name"}
                </h4>
                <p className="text-xs font-mono text-muted-foreground font-medium mb-2">
                  /{slug || "slug"}
                </p>

                {/* Description */}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {description || "Explore handcrafted interactive greetings and celebration templates..."}
                </p>

                {/* Sample subcategories chips */}
                <div className="flex flex-wrap gap-1 pt-2 border-t border-border/40">
                  {subcategoriesList.length > 0 ? (
                    subcategoriesList.slice(0, 3).map((sub) => (
                      <span
                        key={sub.id}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/40 border border-border/60 text-foreground"
                      >
                        {sub.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-muted-foreground italic">No subcategories attached</span>
                  )}
                  {subcategoriesList.length > 3 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                      +{subcategoriesList.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata details */}
              {!isNew && category && (
                <div className="pt-3 border-t border-border/50 space-y-2.5 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Category ID</span>
                    <span
                      onClick={() => {
                        navigator.clipboard.writeText(category.id);
                        toast.success("Category ID copied!");
                      }}
                      className="font-mono text-[11px] text-foreground cursor-pointer hover:text-primary flex items-center gap-1"
                    >
                      {category.id.slice(0, 8)}... <Copy className="w-3 h-3" />
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Subcategories</span>
                    <span className="font-bold text-foreground">
                      {subcategoriesList.length} (Active: {subcategoriesList.filter((s) => s.is_active).length})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Associated Templates</span>
                    <span className="font-bold text-foreground">
                      {category.template_count ?? 0}
                    </span>
                  </div>

                  {category.created_at && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Created At</span>
                      <span>{new Date(category.created_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  <Link
                    to={`/templates`}
                    className="mt-3 block w-full py-2 text-center rounded-xl bg-muted/60 hover:bg-muted text-xs font-bold text-primary transition-colors"
                  >
                    View All Templates &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subcategory Create/Edit Modal */}
      <Dialog open={subModalOpen} onOpenChange={setSubModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">
              {editingSub ? "Edit Subcategory" : "Add Subcategory"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure occasion or relationship subcategory for {name || "this category"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Subcategory Name *</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => {
                    setSubName(e.target.value);
                    if (!editingSub || !subSlug) {
                      setSubSlug(generateSlugFromName(e.target.value));
                    }
                  }}
                  placeholder="e.g. For Her"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium outline-none focus:border-primary"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">URL Slug *</label>
                <input
                  type="text"
                  value={subSlug}
                  onChange={(e) => setSubSlug(generateSlugFromName(e.target.value))}
                  placeholder="for-her"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono font-medium outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Icon & Image upload */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Icon / Emoji</label>
                <input
                  type="text"
                  value={subIcon}
                  onChange={(e) => setSubIcon(e.target.value)}
                  placeholder="e.g. 💖"
                  className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium outline-none focus:border-primary text-center text-lg"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-foreground">Image Asset URL or Upload</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={subImageUrl}
                    onChange={(e) => setSubImageUrl(e.target.value)}
                    placeholder="https://cdn..."
                    className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium outline-none focus:border-primary"
                  />
                  <input
                    type="file"
                    ref={subFileInputRef}
                    onChange={handleSubImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => subFileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors shrink-0"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>

            {/* Theme color */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Theme Color</label>
              <GradientColorPicker value={subThemeColor} onChange={setSubThemeColor} />
            </div>

            {/* SEO Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Short Description</label>
              <textarea
                rows={2}
                value={subDescription}
                onChange={(e) => setSubDescription(e.target.value)}
                placeholder="Brief summary of wishes in this subcategory..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium outline-none focus:border-primary"
              />
            </div>

            {/* Pin position & Boost & Sort order */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Pin Position</label>
                <input
                  type="number"
                  min="1"
                  value={subFeaturedPosition}
                  onChange={(e) => setSubFeaturedPosition(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="None"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Admin Boost</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={subAdminBoost || ""}
                  onChange={(e) => setSubAdminBoost(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Sort Order</label>
                <input
                  type="number"
                  value={subSortOrder}
                  onChange={(e) => setSubSortOrder(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-background border border-border text-xs font-semibold"
                />
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
              <div>
                <span className="text-xs font-bold text-foreground">Active Status</span>
                <p className="text-[10px] text-muted-foreground">Visible on public frontend & navigation</p>
              </div>
              <Switch checked={subIsActive} onCheckedChange={setSubIsActive} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setSubModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-border bg-card hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saveSubMutation.isPending}
              onClick={() => saveSubMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl btn-primary text-white text-xs font-bold disabled:opacity-50"
            >
              {saveSubMutation.isPending && (
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>{editingSub ? "Save Subcategory" : "Create Subcategory"}</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Delete Category
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to permanently delete category <strong>"{name}"</strong>?
              This will remove all its subcategories and detach any templates assigned to it.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-border bg-card hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
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
