import { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, uploadMedia, MEDIA_FOLDERS } from "@/lib/api";
import { GradientColorPicker } from "@/components/ui/GradientColorPicker";
import {
  Plus, Search, Edit2, Trash2, X, Check, Upload, Flame,
  Clock, ExternalLink, Sparkles, SlidersHorizontal, RefreshCw,
  LayoutGrid, ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TrendingTemplate {
  id: string;
  title: string;
  templateId: string;
  themeColor: string | null;
  tag: string | null;
  description: string | null;
  usedCount: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  templateName?: string | null;
  templateSlug?: string | null;
}

interface TemplateOption {
  id: string;
  name: string;
  template_name: string | null;
  slug: string;
  thumbnail_url?: string | null;
}

// ── Preset Gradients exactly matching frontend design ─────────────────────────
const PRESET_GRADIENTS = [
  {
    name: "Memory Violet",
    gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #4f46e5 100%)",
  },
  {
    name: "Friends Magenta",
    gradient: "linear-gradient(135deg, #ec4899 0%, #d946ef 50%, #a855f7 100%)",
  },
  {
    name: "Golden Sunset",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #d97706 100%)",
  },
  {
    name: "Romantic Rose",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #e11d48 100%)",
  },
  {
    name: "Ocean Breeze",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
  },
  {
    name: "Emerald Glow",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
];

const TrendingTemplates = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "wishes" | "title">("newest");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [themeColor, setThemeColor] = useState(PRESET_GRADIENTS[0].gradient);
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [usedCount, setUsedCount] = useState(20);
  const [imageUrl, setImageUrl] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  // Fetch all trending templates
  const { data: trendingData, isLoading: isTrendingLoading, refetch } = useQuery({
    queryKey: ["adminTrendingTemplates"],
    queryFn: () => fetchApi("/trending-templates?limit=100"),
  });

  // Fetch available original templates for the dropdown
  const { data: templatesRes } = useQuery({
    queryKey: ["adminTemplatesList"],
    queryFn: () => fetchApi("/templates?limit=500"),
  });

  const trendingTemplates: TrendingTemplate[] = trendingData?.rows || [];
  const availableTemplates: TemplateOption[] = templatesRes?.rows || [];

  // Extract all unique tags for filter tabs
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    trendingTemplates.forEach((t) => {
      if (t.tag) {
        t.tag.split(",").forEach((sub) => {
          const clean = sub.trim();
          if (clean) set.add(clean.toUpperCase());
        });
      }
    });
    return Array.from(set);
  }, [trendingTemplates]);

  // Filter & Sort
  const filtered = useMemo(() => {
    let list = trendingTemplates.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        item.title.toLowerCase().includes(q) ||
        (item.templateName && item.templateName.toLowerCase().includes(q)) ||
        (item.tag && item.tag.toLowerCase().includes(q));

      const matchTag =
        selectedTagFilter === "all" ||
        (item.tag && item.tag.toUpperCase().includes(selectedTagFilter));

      return matchSearch && matchTag;
    });

    if (sortBy === "wishes") {
      list.sort((a, b) => b.usedCount - a.usedCount);
    } else if (sortBy === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [trendingTemplates, search, selectedTagFilter, sortBy]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedExts.includes(ext) && !allowedMimes.includes(file.type.toLowerCase())) {
      toast.error("Please upload a JPG, PNG, WEBP, or GIF image.");
      e.target.value = "";
      return;
    }

    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    const preview = URL.createObjectURL(file);
    setPendingFile(file);
    setLocalPreviewUrl(preview);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setTemplateId("");
    setThemeColor(PRESET_GRADIENTS[0].gradient);
    setTag("");
    setDescription("");
    setUsedCount(20);
    setImageUrl("");
    setPendingFile(null);
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl("");
    setShowAddForm(false);
  };

  const handleTemplateSelect = (selectedId: string) => {
    setTemplateId(selectedId);
    const selectedTpl = availableTemplates.find((t) => t.id === selectedId);
    if (selectedTpl) {
      if (!title) {
        setTitle(selectedTpl.template_name || selectedTpl.name);
      }
      if (!imageUrl && selectedTpl.thumbnail_url) {
        setImageUrl(selectedTpl.thumbnail_url);
      }
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi("/admin/trending-templates", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTrendingTemplates"] });
      toast.success("Trending template curated successfully!");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create trending template"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      fetchApi(`/admin/trending-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTrendingTemplates"] });
      toast.success("Trending curation updated successfully!");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update trending template"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/admin/trending-templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTrendingTemplates"] });
      toast.success("Trending template removed successfully");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete trending template"),
  });

  const startEdit = (item: TrendingTemplate) => {
    setEditingId(item.id);
    setTitle(item.title);
    setTemplateId(item.templateId || "");
    setThemeColor(item.themeColor || PRESET_GRADIENTS[0].gradient);
    setTag(item.tag || "");
    setDescription(item.description || "");
    setUsedCount(item.usedCount || 0);
    setImageUrl(item.imageUrl || "");
    setPendingFile(null);
    setLocalPreviewUrl("");
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to remove this trending curation?")) {
      deleteMutation.mutate(id);
    }
  };

  const submitForm = async () => {
    if (!title.trim()) {
      toast.error("Curation title is required");
      return;
    }
    if (!templateId) {
      toast.error("Please select a target template");
      return;
    }

    let finalImageUrl = imageUrl;

    if (pendingFile) {
      setIsUploading(true);
      try {
        finalImageUrl = await uploadMedia(pendingFile, MEDIA_FOLDERS.TEMPLATES);
        setImageUrl(finalImageUrl);
        setPendingFile(null);
      } catch (err: any) {
        toast.error(err?.message || "Image upload failed");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const payload = {
      title: title.trim(),
      templateId,
      themeColor,
      tag: tag.trim() || null,
      description: description.trim() || null,
      usedCount: Number(usedCount) || 0,
      imageUrl: finalImageUrl || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="w-full max-w-[1700px] mx-auto space-y-8 pb-20">
      {/* ── Top Header Section ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-xs">
              <Flame className="w-3.5 h-3.5 text-primary fill-primary/20" /> Curation Hub
            </span>
            <span className="text-xs font-bold text-muted-foreground">•</span>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {trendingTemplates.length} Active Showcases
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Trending Templates
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            Handpicked favorites for every occasion
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-3 rounded-2xl bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95 shadow-xs"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl btn-primary text-white font-bold text-xs shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Trending Template</span>
          </button>
        </div>
      </div>

      {/* ── Controls & Filter Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, template or tag..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-card border border-border/80 text-xs font-semibold placeholder:text-muted-foreground/60 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tag Pills & Sort */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Quick Tag Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedTagFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedTagFilter === "all"
                  ? "bg-primary text-white shadow-xs"
                  : "bg-card border border-border/80 text-muted-foreground hover:bg-muted"
              }`}
            >
              All Tags
            </button>
            {availableTags.slice(0, 5).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTagFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedTagFilter === t
                    ? "bg-primary text-white shadow-xs"
                    : "bg-card border border-border/80 text-muted-foreground hover:bg-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1 bg-card border border-border/80 rounded-2xl p-1 shadow-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground ml-2" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-xs font-bold text-foreground py-1.5 px-2 outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="wishes">Most Wishes</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Curation Cards Grid (Matching Frontend Design) ───────────────── */}
      {isTrendingLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-52 rounded-3xl bg-card border border-border/60 animate-pulse p-6 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-20 h-5 bg-muted rounded-full" />
                <div className="w-40 h-7 bg-muted rounded-xl" />
              </div>
              <div className="flex justify-between items-center">
                <div className="w-24 h-4 bg-muted rounded-md" />
                <div className="w-24 h-24 bg-muted rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl border-2 border-dashed border-border bg-card/50">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <Flame className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">No trending templates match your criteria</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-6">
            Create or edit trending curations to highlight your favorite wish templates on the user homepage.
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="px-5 py-2.5 rounded-xl btn-primary text-white text-xs font-bold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add First Curation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              onClick={() => startEdit(item)}
              className="group relative h-48 md:h-56 rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-white/20 select-none cursor-pointer"
            >
              {/* Background Gradient with smooth scale on hover */}
              <div
                className="absolute inset-0 transition-transform duration-700 group-hover:scale-110"
                style={{
                  background: item.themeColor || PRESET_GRADIENTS[0].gradient,
                }}
              />

              {/* Decorative Pattern Overlay matching frontend */}
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />

              {/* Bottom ambient shade matching frontend */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 pointer-events-none" />

              {/* Floating Right Illustration matching frontend */}
              {item.imageUrl ? (
                <div className="absolute top-6 right-6 md:top-8 md:right-8 overflow-hidden transition-all duration-700 opacity-100 pointer-events-none group-hover:scale-105">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-[120px] w-[120px] md:h-[150px] md:w-[150px] object-contain drop-shadow-2xl"
                  />
                </div>
              ) : (
                <div className="absolute top-8 right-8 w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center text-white/50 pointer-events-none">
                  <Sparkles className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">No Image</span>
                </div>
              )}

              {/* Card Content Overlay matching frontend layout */}
              <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-between z-10 pointer-events-none">
                <div>
                  {item.tag ? (
                    <span className="px-3 py-1 md:px-4 md:py-1.5 bg-white/20 backdrop-blur-xl rounded-full text-[8px] md:text-[10px] font-black text-white tracking-widest border border-white/30 uppercase inline-block shadow-sm">
                      {item.tag}
                    </span>
                  ) : (
                    <span className="px-3 py-1 md:px-4 md:py-1.5 bg-white/10 backdrop-blur-xl rounded-full text-[8px] md:text-[10px] font-bold text-white/70 uppercase inline-block">
                      TRENDING
                    </span>
                  )}
                  <h3 className="text-base sm:text-lg md:text-2xl max-w-[170px] sm:max-w-[200px] font-black text-white mt-4 md:mt-5 leading-tight tracking-tight drop-shadow-md line-clamp-2">
                    {item.title}
                  </h3>
                  {item.templateName && (
                    <p className="text-[10px] md:text-[11px] font-semibold text-white/80 truncate mt-1.5 flex items-center gap-1 drop-shadow-xs max-w-[180px]">
                      <span className="opacity-75">Template:</span>
                      <span className="font-bold underline decoration-white/40">{item.templateName}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-white/95 text-[10px] md:text-[11px] font-black flex items-center gap-2 uppercase tracking-widest drop-shadow-xs">
                    <Clock className="w-3.5 h-3.5" strokeWidth={3} /> {item.usedCount || 0} WISHES
                  </p>

                  {item.templateSlug && (
                    <a
                      href={`https://wishformoment.com/templates/${item.templateSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pointer-events-auto flex items-center gap-1 text-[10px] font-black text-white/80 hover:text-white uppercase tracking-wider hover:underline transition-all bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-white/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Admin Action Buttons (Glassmorphic Overlay in Top Right on Hover) */}
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-white/25 rounded-2xl p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(item);
                  }}
                  className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-all active:scale-90"
                  title="Edit Curation"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  className="p-1.5 rounded-xl hover:bg-rose-500 text-white transition-all active:scale-90"
                  title="Delete Curation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Add & Edit Modal with Live WYSIWYG Preview ────────────────────── */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && resetForm()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-4xl max-h-[92vh] bg-card rounded-3xl shadow-2xl flex flex-col border border-border overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-7 py-5 border-b border-border bg-card flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-foreground">
                      {editingId ? "Edit Trending Template" : "New Trending Template"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Configure frontend showcase card, theme gradient, and target template.
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body with Live Preview */}
              <div className="overflow-y-auto custom-scrollbar p-7 space-y-6 flex-1 bg-muted/20">
                {/* ── Live Frontend Preview Box ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Card Preview (Frontend Replica)
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      How it renders on WishForMoment
                    </span>
                  </div>

                  <div className="max-w-md mx-auto">
                    <div
                      className="group relative h-48 md:h-56 rounded-3xl md:rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 select-none flex flex-col justify-between p-5 md:p-6"
                      style={{
                        background: themeColor || PRESET_GRADIENTS[0].gradient,
                      }}
                    >
                      {/* Decorative Pattern Overlay matching frontend */}
                      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />

                      {/* Bottom ambient shade matching frontend */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 pointer-events-none" />

                      {/* Floating Illustration matching frontend */}
                      {localPreviewUrl || imageUrl ? (
                        <div className="absolute top-6 right-6 md:top-8 md:right-8 overflow-hidden pointer-events-none">
                          <img
                            src={localPreviewUrl || imageUrl}
                            alt="Preview"
                            className="h-[120px] w-[120px] md:h-[150px] md:w-[150px] object-contain drop-shadow-2xl"
                          />
                        </div>
                      ) : (
                        <div className="absolute top-8 right-8 w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center text-white/50 pointer-events-none">
                          <Sparkles className="w-8 h-8 opacity-40 mb-1" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">No Image</span>
                        </div>
                      )}

                      {/* Top Tag & Title */}
                      <div className="relative z-10 pointer-events-none">
                        <span className="px-3 py-1 md:px-4 md:py-1.5 bg-white/20 backdrop-blur-xl rounded-full text-[8px] md:text-[10px] font-black text-white tracking-widest border border-white/30 uppercase inline-block shadow-sm">
                          {tag.trim() || "OCCASION, SPECIAL"}
                        </span>
                        <h3 className="text-base sm:text-lg md:text-2xl max-w-[170px] sm:max-w-[200px] font-black text-white mt-4 md:mt-5 leading-tight tracking-tight drop-shadow-md line-clamp-2">
                          {title.trim() || "Card Title Here"}
                        </h3>
                      </div>

                      {/* Bottom Wishes */}
                      <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/15 text-white pointer-events-none">
                        <p className="text-white/95 text-[10px] md:text-[11px] font-black flex items-center gap-2 uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5" strokeWidth={3} /> {usedCount || 0} WISHES
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Form Inputs ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Showcase Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Memory Challenge, Romantic Birthday"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>

                  {/* Target Template */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Target Template <span className="text-rose-500">*</span>
                    </label>
                    <Select value={templateId} onValueChange={handleTemplateSelect}>
                      <SelectTrigger className="w-full h-10 px-3.5 rounded-xl bg-card border-border text-xs font-semibold text-foreground outline-none">
                        <SelectValue placeholder="Select underlying template" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border shadow-xl max-h-60 overflow-y-auto">
                        {availableTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs font-medium">
                            {t.template_name || t.name} (/{t.slug})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* ── Preset Color Gradients ── */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Card Theme Color & Gradient</span>
                    <span className="text-[10px] font-medium text-muted-foreground">Click a preset or customize</span>
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {PRESET_GRADIENTS.map((p) => {
                      const isSelected = themeColor === p.gradient;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setThemeColor(p.gradient)}
                          className={`group h-12 rounded-xl p-1.5 flex flex-col justify-end text-left relative overflow-hidden transition-all border ${
                            isSelected
                              ? "ring-2 ring-primary border-transparent scale-[1.03] shadow-md"
                              : "border-border/60 hover:scale-[1.01]"
                          }`}
                          style={{ background: p.gradient }}
                        >
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="relative z-10 text-[9px] font-black text-white drop-shadow-xs truncate">
                            {p.name}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white text-primary flex items-center justify-center shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Advanced Custom Gradient Picker */}
                  <div className="pt-2">
                    <GradientColorPicker
                      value={themeColor}
                      onChange={setThemeColor}
                      className="w-full h-10 rounded-xl"
                    />
                  </div>
                </div>

                {/* Tag & Display Count */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Tag Badge (Uppercase Pill)
                    </label>
                    <input
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      placeholder="e.g. LOVE, BIRTHDAY or GAME, COUPLE"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all uppercase"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Shown inside the frosted glass pill on top of the card.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Display Wishes Count
                    </label>
                    <input
                      type="number"
                      value={usedCount}
                      onChange={(e) => setUsedCount(Number(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Rendered next to clock icon: "{usedCount || 0} WISHES".
                    </p>
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Floating Illustration / Cover Image (Transparent PNG or WEBP recommended)
                  </label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative cursor-pointer rounded-2xl overflow-hidden bg-card border-2 border-dashed border-border hover:border-primary/50 transition-all flex items-center justify-center h-36 shadow-xs"
                  >
                    {localPreviewUrl || imageUrl ? (
                      <>
                        <img
                          src={localPreviewUrl || imageUrl}
                          className="h-28 w-28 object-contain drop-shadow-md"
                          alt="Cover preview"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white backdrop-blur-xs">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-xs font-bold">Replace Floating Image</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                          <Upload className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-foreground">Click to upload cut-out / transparent image</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">PNG, WEBP with transparent background recommended</p>
                      </div>
                    )}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                    />
                  </div>
                </div>

                {/* Description (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Admin Notes / Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Internal curation notes..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-7 py-4 border-t border-border bg-card flex justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitForm}
                  disabled={isUploading || createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2.5 rounded-xl btn-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading Image...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingId ? "Save Changes" : "Deploy Curation"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrendingTemplates;
