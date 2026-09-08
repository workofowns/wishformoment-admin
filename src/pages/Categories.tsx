import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, uploadMedia, MEDIA_FOLDERS } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { GradientColorPicker } from "@/components/ui/GradientColorPicker";
import { Plus, ChevronRight, Edit2, Trash2, FolderOpen, X, Check, Upload, Tag, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  title?: string;
  description?: string;
  tags?: string[];
  icon: string;
  image_url?: string;
  theme_color?: string;
  sort_order: number;
  featured_position?: number | null;
  admin_boost?: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  title?: string;
  description?: string;
  tags?: string[];
  icon: string;
  image_url?: string;
  theme_color?: string;
  sort_order: number;
  featured_position?: number | null;
  admin_boost?: number;
}

const Categories = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expandedId, setExpandedId] = useState<string | null>("1");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatTitle, setNewCatTitle] = useState("");
  const [newCatDescription, setNewCatDescription] = useState("");
  const [newCatTags, setNewCatTags] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📁");
  const [newCatImageUrl, setNewCatImageUrl] = useState("");
  const [newCatColor, setNewCatColor] = useState("#6C41CF");
  const [newCatFeaturedPosition, setNewCatFeaturedPosition] = useState<number | "">("");
  const [newCatAdminBoost, setNewCatAdminBoost] = useState<number>(0);

  const [addingSubTo, setAddingSubTo] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [newSubSlug, setNewSubSlug] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [newSubTitle, setNewSubTitle] = useState("");
  const [newSubDescription, setNewSubDescription] = useState("");
  const [newSubTags, setNewSubTags] = useState("");
  const [newSubIcon, setNewSubIcon] = useState("📄");
  const [newSubImageUrl, setNewSubImageUrl] = useState("");
  const [newSubColor, setNewSubColor] = useState("#FF8BC4");
  const [newSubFeaturedPosition, setNewSubFeaturedPosition] = useState<number | "">("");
  const [newSubAdminBoost, setNewSubAdminBoost] = useState<number>(0);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  const [editCatData, setEditCatData] = useState<{
    name: string;
    slug: string;
    title: string;
    description: string;
    tags: string;
    icon: string;
    imageUrl: string;
    themeColor: string;
    featuredPosition: number | "";
    adminBoost: number;
  }>({
    name: "",
    slug: "",
    title: "",
    description: "",
    tags: "",
    icon: "",
    imageUrl: "",
    themeColor: "",
    featuredPosition: "",
    adminBoost: 0,
  });

  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubData, setEditSubData] = useState<{
    name: string;
    slug: string;
    title: string;
    description: string;
    tags: string;
    icon: string;
    imageUrl: string;
    themeColor: string;
    featuredPosition: number | "";
    adminBoost: number;
  }>({
    name: "",
    slug: "",
    title: "",
    description: "",
    tags: "",
    icon: "",
    imageUrl: "",
    themeColor: "",
    featuredPosition: "",
    adminBoost: 0,
  });

  const { data: catsRes } = useQuery({ queryKey: ["adminCategories"], queryFn: () => fetchApi("/categories") });
  const { data: subsRes } = useQuery({ queryKey: ["adminSubCategories"], queryFn: () => fetchApi("/sub-categories") });

  const catsData = catsRes?.data || [];
  const subsData = subsRes?.data || [];

  const categories = catsData.map((c: Category) => ({
    ...c,
    color: c.theme_color || "#A37FF6",
    subcategories: subsData.filter((sc: SubCategory) => sc.category_id === c.id).map((sc: SubCategory) => ({
      ...sc,
      color: sc.theme_color || "#FF8BC4"
    }))
  }));

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'newCat' | 'editCat' | 'newSub' | 'editSub'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Route to the correct S3 folder based on what's being uploaded
    const folder = type === 'newSub' || type === 'editSub'
      ? MEDIA_FOLDERS.SUB_CATEGORIES
      : MEDIA_FOLDERS.CATEGORIES;

    const promise = uploadMedia(file, folder);

    toast.promise(promise, {
      loading: "Uploading to CDN...",
      success: (cdnUrl) => {
        if (type === 'newCat') setNewCatImageUrl(cdnUrl);
        if (type === 'editCat') setEditCatData(prev => ({ ...prev, imageUrl: cdnUrl }));
        if (type === 'newSub') setNewSubImageUrl(cdnUrl);
        if (type === 'editSub') setEditSubData(prev => ({ ...prev, imageUrl: cdnUrl }));
        return "Image uploaded successfully";
      },
      error: (err) => err?.message || "Upload failed"
    });
  };

  const createCatMutation = useMutation({
    mutationFn: (payload: any) => fetchApi("/categories", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      toast.success("Category added");
      setNewCatName(""); setNewCatSlug(""); setNewCatTitle(""); setNewCatDescription(""); setNewCatTags(""); setNewCatIcon("📁"); setNewCatImageUrl(""); setNewCatColor("#6C41CF");
      setNewCatFeaturedPosition(""); setNewCatAdminBoost(0);
      setShowAddCategory(false);
    }
  });

  const createSubCatMutation = useMutation({
    mutationFn: (payload: any) => fetchApi("/sub-categories", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSubCategories"] });
      toast.success("Subcategory added");
      setNewSubName(""); setNewSubSlug(""); setNewSubTitle(""); setNewSubDescription(""); setNewSubTags(""); setNewSubIcon("📄"); setNewSubImageUrl(""); setNewSubColor("#FF8BC4");
      setNewSubFeaturedPosition(""); setNewSubAdminBoost(0);
      setAddingSubTo(null);
    }
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => fetchApi(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCategories"] });
      toast.success("Category updated");
      setEditingCatId(null);
    }
  });

  const updateSubCatMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => fetchApi(`/sub-categories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSubCategories"] });
      toast.success("Subcategory updated");
      setEditingSubId(null);
    }
  });

  const delCatMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminCategories"] })
  });

  const delSubCatMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/sub-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminSubCategories"] })
  });

  const addCategory = () => {
    if (!newCatName.trim()) return;
    createCatMutation.mutate({
      name: newCatName,
      slug: newCatSlug || newCatName.toLowerCase().replace(/\s+/g, "-"),
      title: newCatTitle.trim() || null,
      description: newCatDescription.trim() || null,
      tags: newCatTags.split(',').map(s => s.trim()).filter(Boolean),
      icon: newCatIcon,
      imageUrl: newCatImageUrl,
      themeColor: newCatColor,
      featuredPosition: newCatFeaturedPosition === "" ? null : Number(newCatFeaturedPosition),
      adminBoost: Number(newCatAdminBoost) || 0,
    });
  };

  const addSubcategory = (catId: string) => {
    if (!newSubName.trim()) return;
    createSubCatMutation.mutate({
      categoryId: catId,
      name: newSubName,
      slug: newSubSlug || newSubName.toLowerCase().replace(/\s+/g, "-"),
      title: newSubTitle.trim() || null,
      description: newSubDescription.trim() || null,
      tags: newSubTags.split(',').map(s => s.trim()).filter(Boolean),
      icon: newSubIcon,
      imageUrl: newSubImageUrl,
      themeColor: newSubColor,
      featuredPosition: newSubFeaturedPosition === "" ? null : Number(newSubFeaturedPosition),
      adminBoost: Number(newSubAdminBoost) || 0,
    });
  };

  const startEditCategory = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setEditCatData({
      name: cat.name,
      slug: cat.slug,
      title: cat.title || "",
      description: cat.description || "",
      tags: (cat.tags || []).join(", "),
      icon: cat.icon || "📁",
      imageUrl: cat.image_url || "",
      themeColor: cat.theme_color || "#A37FF6",
      featuredPosition: cat.featured_position ?? "",
      adminBoost: cat.admin_boost ?? 0,
    });
    setEditingCatId(cat.id);
  };

  const saveEditCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editCatData.name.trim()) return;
    updateCatMutation.mutate({
      id,
      data: {
        ...editCatData,
        title: editCatData.title.trim() || null,
        description: editCatData.description.trim() || null,
        tags: editCatData.tags.split(',').map(s => s.trim()).filter(Boolean),
        featuredPosition: editCatData.featuredPosition === "" ? null : Number(editCatData.featuredPosition),
        adminBoost: Number(editCatData.adminBoost) || 0,
      }
    });
  };

  const startEditSubcategory = (e: React.MouseEvent, sub: SubCategory) => {
    e.stopPropagation();
    setEditSubData({
      name: sub.name,
      slug: sub.slug,
      title: sub.title || "",
      description: sub.description || "",
      tags: (sub.tags || []).join(", "),
      icon: sub.icon || "📄",
      imageUrl: sub.image_url || "",
      themeColor: sub.theme_color || "#FF8BC4",
      featuredPosition: sub.featured_position ?? "",
      adminBoost: sub.admin_boost ?? 0,
    });
    setEditingSubId(sub.id);
  };

  const saveEditSubcategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editSubData.name.trim()) return;
    updateSubCatMutation.mutate({
      id,
      data: {
        ...editSubData,
        title: editSubData.title.trim() || null,
        description: editSubData.description.trim() || null,
        tags: editSubData.tags.split(',').map(s => s.trim()).filter(Boolean),
        featuredPosition: editSubData.featuredPosition === "" ? null : Number(editSubData.featuredPosition),
        adminBoost: Number(editSubData.adminBoost) || 0,
      }
    });
  };

  const deleteCategory = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure?")) delCatMutation.mutate(id);
  }
  const deleteSubcategory = (e: React.MouseEvent, subId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure?")) delSubCatMutation.mutate(subId);
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="sub-label mb-1">Content Management</p>
            <h1 className="section-header text-3xl">Categories</h1>
          </div>
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        {/* Add Category Form */}
        <AnimatePresence>
          {showAddCategory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card rounded-2xl p-5 mb-5 overflow-hidden space-y-3"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)} title="Icon" className="w-12 h-12 text-center text-2xl rounded-xl bg-muted border-0 focus:ring-2 focus:ring-primary/30" placeholder="📁" />

                    <div className="relative group w-12 h-12 flex items-center justify-center rounded-xl bg-muted border border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden">
                      {newCatImageUrl ? (
                        <img src={newCatImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                      <input type="file" onChange={(e) => handleFileChange(e, 'newCat')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>

                    {/* Modern Gradient/Color Picker */}
                    <div className="relative w-12 h-12">
                      <GradientColorPicker
                        value={newCatColor}
                        onChange={setNewCatColor}
                      />
                    </div>
                  </div>

                  <div className="flex-1 flex gap-3 min-w-[300px]">
                    <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name" className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-sm font-medium focus:ring-2 focus:ring-primary/30 outline-none" />
                    <input value={newCatSlug} onChange={e => setNewCatSlug(e.target.value)} placeholder="slug (auto)" className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-xs text-muted-foreground focus:ring-2 focus:ring-primary/30 outline-none" />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={addCategory} className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"><Check className="w-5 h-5" /></button>
                    <button onClick={() => setShowAddCategory(false)} className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                </div>
                <input
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  placeholder="Category description (e.g. Discover personalized greetings for every special milestone)"
                  className="w-full px-4 py-2 rounded-xl bg-muted text-xs text-foreground focus:ring-2 focus:ring-primary/30 outline-none"
                />
                {/* Title (Meta Title), Description & Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border/40">
                  <input
                    value={newCatTitle}
                    onChange={e => setNewCatTitle(e.target.value)}
                    placeholder="Meta Title (e.g. Birthday Wish Templates — WishForMoment)"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted text-xs font-medium focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                  <input
                    value={newCatDescription}
                    onChange={e => setNewCatDescription(e.target.value)}
                    placeholder="Description / Meta Description for SEO"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted text-xs font-medium focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                  <input
                    value={newCatTags}
                    onChange={e => setNewCatTags(e.target.value)}
                    placeholder="Tags / Keywords (comma-separated)"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted text-xs font-medium focus:ring-2 focus:ring-primary/30 outline-none"
                  />
                </div>

                {/* Ranking & Promotion */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
                  <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                    <input
                      type="number"
                      min="1"
                      value={newCatFeaturedPosition}
                      onChange={e => setNewCatFeaturedPosition(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Fixed Pin Position (e.g. 1)"
                      className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl">
                    <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={newCatAdminBoost || ""}
                      onChange={e => setNewCatAdminBoost(Number(e.target.value))}
                      placeholder="Admin Boost Score (e.g. 50)"
                      className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category List */}
        <div className="space-y-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-[1.3rem] overflow-hidden border border-border/50"
              style={cat?.theme_color && !cat.theme_color.includes("gradient") ? { backgroundColor: cat.theme_color + "10" } : undefined}
            >
              {/* Category Header */}
              <div
                className="flex items-center gap-4 p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
              >
                {editingCatId === cat.id ? (
                  <div className="flex-1 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <input value={editCatData.icon} onChange={e => setEditCatData({ ...editCatData, icon: e.target.value })} className="w-11 h-11 text-center text-xl rounded-xl bg-muted border-0 focus:ring-2 focus:ring-primary/30" />
                        <div className="relative group w-11 h-11 flex items-center justify-center rounded-xl bg-muted border border-dashed border-muted-foreground/30 hover:border-primary/50 cursor-pointer overflow-hidden">
                          {editCatData.imageUrl ? (
                            <img src={editCatData.imageUrl} alt="Edit" className="w-5 h-5 object-cover" />
                          ) : (
                            <Upload className="w-4 h-4 text-muted-foreground" />
                          )}
                          <input type="file" onChange={(e) => handleFileChange(e, 'editCat')} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>
                        <div className="relative w-11 h-11">
                          <GradientColorPicker
                            value={editCatData.themeColor}
                            onChange={val => setEditCatData({ ...editCatData, themeColor: val })}
                          />
                        </div>
                      </div>
                      <div className="flex-1 flex gap-3 min-w-[200px]">
                        <input value={editCatData.name} onChange={e => setEditCatData({ ...editCatData, name: e.target.value })} placeholder="Name" className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-sm font-medium outline-none" />
                        <input value={editCatData.slug} onChange={e => setEditCatData({ ...editCatData, slug: e.target.value })} placeholder="Slug" className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-xs outline-none" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => saveEditCategory(e, cat.id)} className="p-2.5 rounded-xl bg-primary text-primary-foreground"><Check className="w-5 h-5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingCatId(null); }} className="p-2.5 rounded-xl bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <input
                      value={editCatData.description}
                      onChange={e => setEditCatData({ ...editCatData, description: e.target.value })}
                      placeholder="Category description"
                      className="w-full px-4 py-2 rounded-xl bg-muted text-xs outline-none"
                    />

                    {/* Meta Title, Description & Tags in Edit */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border/40">
                      <input
                        value={editCatData.title}
                        onChange={e => setEditCatData({ ...editCatData, title: e.target.value })}
                        placeholder="Meta Title"
                        className="w-full px-4 py-2 rounded-xl bg-muted text-xs font-medium outline-none"
                      />
                      <input
                        value={editCatData.description}
                        onChange={e => setEditCatData({ ...editCatData, description: e.target.value })}
                        placeholder="Description / Meta Description"
                        className="w-full px-4 py-2 rounded-xl bg-muted text-xs font-medium outline-none"
                      />
                      <input
                        value={editCatData.tags}
                        onChange={e => setEditCatData({ ...editCatData, tags: e.target.value })}
                        placeholder="Tags / Keywords (comma-separated)"
                        className="w-full px-4 py-2 rounded-xl bg-muted text-xs font-medium outline-none"
                      />
                    </div>

                    {/* Ranking & Promotion in Edit */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/40">
                      <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl">
                        <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                        <input
                          type="number"
                          min="1"
                          value={editCatData.featuredPosition}
                          onChange={e => setEditCatData({ ...editCatData, featuredPosition: e.target.value === "" ? "" : Number(e.target.value) })}
                          placeholder="Fixed Pin Position (e.g. 1)"
                          className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-xl">
                        <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={editCatData.adminBoost || ""}
                          onChange={e => setEditCatData({ ...editCatData, adminBoost: Number(e.target.value) })}
                          placeholder="Admin Boost Score (e.g. 50)"
                          className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner overflow-hidden"
                        style={cat.color.includes("gradient") ? { background: cat.color } : { backgroundColor: cat.color + "15" }}
                      >
                        {cat.image_url ? (
                          <img src={cat.image_url} alt={cat.name} className="w-5 h-5 object-cover" />
                        ) : (
                          <span className="relative z-10">{cat.icon}</span>
                        )}
                      </div>
                      {cat.image_url && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border border-border flex items-center justify-center text-[10px] shadow-sm z-20">
                          {cat.icon}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className="font-black text-lg truncate"
                          style={
                            cat?.theme_color
                              ? cat.theme_color.includes("gradient")
                                ? { background: cat.theme_color, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", width: "fit-content" }
                                : { color: cat.theme_color }
                              : { color: '#080821' }
                          }
                        >
                          {cat.name}
                        </p>
                        {cat.featured_position && (
                          <div className="bg-purple-600 text-white px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center shadow-xs">
                            <Sparkles className="w-2.5 h-2.5 mr-1" /> Pin #{cat.featured_position}
                          </div>
                        )}
                        {cat.admin_boost !== undefined && cat.admin_boost > 0 && !cat.featured_position && (
                          <div className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase flex items-center shadow-xs">
                            <Zap className="w-2.5 h-2.5 mr-1" /> +{cat.admin_boost} Boost
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-bold tracking-widest truncate">/{cat.slug}</p>
                      {cat.title && (
                        <p className="text-[11px] text-primary/80 font-medium truncate mt-0.5">Meta Title: {cat.title}</p>
                      )}
                      {cat.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{cat.description}</p>
                      )}
                      {cat.tags && cat.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {cat.tags.map((tag, idx) => (
                            <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                              <Tag className="w-2.5 h-2.5 opacity-60" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-muted/50 border border-border flex items-center gap-2 shrink-0">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-[10px] font-black text-muted-foreground uppercase">{cat.subcategories.length} Entities</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={(e) => startEditCategory(e, cat)} className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => deleteCategory(e, cat.id)} className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className={`p-2 rounded-xl bg-muted/20 transition-transform shrink-0 ${expandedId === cat.id ? "rotate-90 bg-primary/10 text-primary" : ""}`}>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </>
                )}
              </div>

              {/* Subcategories Container */}
              <AnimatePresence>
                {expandedId === cat.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border/30 bg-muted/5"
                  >
                    <div className="p-6 pl-12 space-y-3">
                      {cat.subcategories.map(sub => (
                        <div key={sub.id} className="flex flex-col gap-2 p-4 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-md transition-shadow group">
                          {editingSubId === sub.id ? (
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <input value={editSubData.icon} onChange={e => setEditSubData({ ...editSubData, icon: e.target.value })} className="w-10 h-10 text-center text-lg rounded-xl bg-muted border-0" />
                                  <div className="relative group w-10 h-10 flex items-center justify-center rounded-xl bg-muted border border-dashed border-muted-foreground/30 overflow-hidden">
                                    {editSubData.imageUrl ? (
                                      <img src={editSubData.imageUrl} alt="Sub" className="w-5 h-5 object-cover" />
                                    ) : (
                                      <Upload className="w-3 h-3 text-muted-foreground" />
                                    )}
                                    <input type="file" onChange={(e) => handleFileChange(e, 'editSub')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                  </div>
                                  <div className="relative w-10 h-10">
                                    <GradientColorPicker
                                      value={editSubData.themeColor}
                                      onChange={val => setEditSubData({ ...editSubData, themeColor: val })}
                                    />
                                  </div>
                                </div>
                                <div className="flex-1 flex gap-2 min-w-[200px]">
                                  <input value={editSubData.name} onChange={e => setEditSubData({ ...editSubData, name: e.target.value })} placeholder="Name" className="flex-1 px-4 py-2 rounded-xl bg-muted text-sm outline-none" />
                                  <input value={editSubData.slug} onChange={e => setEditSubData({ ...editSubData, slug: e.target.value })} placeholder="Slug" className="flex-1 px-4 py-2 rounded-xl bg-muted text-xs outline-none" />
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={(e) => saveEditSubcategory(e, sub.id)} className="p-2 rounded-xl bg-primary text-primary-foreground"><Check className="w-4 h-4" /></button>
                                  <button onClick={() => setEditingSubId(null)} className="p-2 rounded-xl bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                                </div>
                              </div>

                              {/* Meta Title, Description & Tags in Subcategory Edit */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/30">
                                <input
                                  value={editSubData.title}
                                  onChange={e => setEditSubData({ ...editSubData, title: e.target.value })}
                                  placeholder="Meta Title"
                                  className="w-full px-3 py-1.5 rounded-xl bg-muted text-xs font-medium outline-none"
                                />
                                <input
                                  value={editSubData.description}
                                  onChange={e => setEditSubData({ ...editSubData, description: e.target.value })}
                                  placeholder="Description / Meta Description"
                                  className="w-full px-3 py-1.5 rounded-xl bg-muted text-xs font-medium outline-none"
                                />
                                <input
                                  value={editSubData.tags}
                                  onChange={e => setEditSubData({ ...editSubData, tags: e.target.value })}
                                  placeholder="Tags / Keywords (comma-separated)"
                                  className="w-full px-3 py-1.5 rounded-xl bg-muted text-xs font-medium outline-none"
                                />
                              </div>

                              {/* Ranking & Promotion in Subcategory Edit */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/30">
                                <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-xl">
                                  <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <input
                                    type="number"
                                    min="1"
                                    value={editSubData.featuredPosition}
                                    onChange={e => setEditSubData({ ...editSubData, featuredPosition: e.target.value === "" ? "" : Number(e.target.value) })}
                                    placeholder="Fixed Pin Position (e.g. 1)"
                                    className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground"
                                  />
                                </div>
                                <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-xl">
                                  <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                  <input
                                    type="number"
                                    min="0"
                                    step="10"
                                    value={editSubData.adminBoost || ""}
                                    onChange={e => setEditSubData({ ...editSubData, adminBoost: Number(e.target.value) })}
                                    placeholder="Admin Boost Score (e.g. 50)"
                                    className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden ring-1 ring-border/50 shrink-0"
                                style={sub.color.includes("gradient") ? { background: sub.color } : { backgroundColor: sub.color + "15" }}
                              >
                                {sub.image_url ? (
                                  <img src={sub.image_url} alt={sub.name} className="w-5 h-5 object-cover" />
                                ) : (
                                  <span className="text-lg">{sub.icon}</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p
                                    className="text-sm font-black text-foreground truncate"
                                    style={
                                      sub?.theme_color
                                        ? sub.theme_color.includes("gradient")
                                          ? { background: sub.theme_color, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", width: "fit-content" }
                                          : { color: sub.theme_color }
                                        : undefined
                                    }
                                  >
                                    {sub.name}
                                  </p>
                                  {sub.featured_position && (
                                    <div className="bg-purple-600 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center shadow-xs shrink-0">
                                      <Sparkles className="w-2.5 h-2.5 mr-1" /> Pin #{sub.featured_position}
                                    </div>
                                  )}
                                  {sub.admin_boost !== undefined && sub.admin_boost > 0 && !sub.featured_position && (
                                    <div className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center shadow-xs shrink-0">
                                      <Zap className="w-2.5 h-2.5 mr-1" /> +{sub.admin_boost} Boost
                                    </div>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground font-bold tracking-widest truncate">/{sub.slug}</p>
                                {sub.title && (
                                  <p className="text-[10px] text-primary/80 font-medium truncate mt-0.5">Meta Title: {sub.title}</p>
                                )}
                                {sub.description && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{sub.description}</p>
                                )}
                                {sub.tags && sub.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {sub.tags.map((tag, idx) => (
                                      <span key={idx} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-muted text-[9px] font-medium text-muted-foreground">
                                        <Tag className="w-2 h-2 opacity-60" />
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <button onClick={(e) => startEditSubcategory(e, sub)} className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={(e) => deleteSubcategory(e, sub.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add Subcategory Row */}
                      <div className="pt-2">
                        {addingSubTo === cat.id ? (
                          <div className="flex flex-col gap-3 p-4 rounded-2xl bg-primary/5 border border-dashed border-primary/30">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2">
                                <input value={newSubIcon} onChange={e => setNewSubIcon(e.target.value)} placeholder="Icon" className="w-10 h-10 text-center rounded-xl bg-white text-lg outline-none border border-border" />
                                <div className="relative group w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden">
                                  {newSubImageUrl ? (
                                    <img src={newSubImageUrl} alt="Sub" className="w-5 h-5 object-cover" />
                                  ) : (
                                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                  <input type="file" onChange={(e) => handleFileChange(e, 'newSub')} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                                <div className="relative w-10 h-10">
                                  <GradientColorPicker
                                    value={newSubColor}
                                    onChange={setNewSubColor}
                                  />
                                </div>
                              </div>
                              <div className="flex-1 flex gap-2 min-w-[200px]">
                                <input value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Subcategory name" className="flex-1 px-4 py-2 rounded-xl bg-white text-sm outline-none border border-border" />
                                <input value={newSubSlug} onChange={e => setNewSubSlug(e.target.value)} placeholder="slug" className="flex-1 px-4 py-2 rounded-xl bg-white text-xs outline-none border border-border" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => addSubcategory(cat.id)} className="p-2 rounded-xl bg-primary text-primary-foreground"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setAddingSubTo(null)} className="p-2 rounded-xl bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                              </div>
                            </div>

                            {/* Meta Title, Description & Tags in Add Subcategory */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/30">
                              <input
                                value={newSubTitle}
                                onChange={e => setNewSubTitle(e.target.value)}
                                placeholder="Meta Title (e.g. For Friend — Birthday Wish Templates)"
                                className="w-full px-3 py-1.5 rounded-xl bg-white text-xs font-medium outline-none border border-border"
                              />
                              <input
                                value={newSubDescription}
                                onChange={e => setNewSubDescription(e.target.value)}
                                placeholder="Description / Meta Description"
                                className="w-full px-3 py-1.5 rounded-xl bg-white text-xs font-medium outline-none border border-border"
                              />
                              <input
                                value={newSubTags}
                                onChange={e => setNewSubTags(e.target.value)}
                                placeholder="Tags / Keywords (comma-separated)"
                                className="w-full px-3 py-1.5 rounded-xl bg-white text-xs font-medium outline-none border border-border"
                              />
                            </div>

                            {/* Ranking & Promotion in Add Subcategory */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/30">
                              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-border">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <input
                                  type="number"
                                  min="1"
                                  value={newSubFeaturedPosition}
                                  onChange={e => setNewSubFeaturedPosition(e.target.value === "" ? "" : Number(e.target.value))}
                                  placeholder="Fixed Pin Position (e.g. 1)"
                                  className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground"
                                />
                              </div>
                              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-border">
                                <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <input
                                  type="number"
                                  min="0"
                                  step="10"
                                  value={newSubAdminBoost || ""}
                                  onChange={e => setNewSubAdminBoost(Number(e.target.value))}
                                  placeholder="Admin Boost Score (e.g. 50)"
                                  className="w-full bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingSubTo(cat.id)}
                            className="flex items-center gap-2 text-xs font-black text-primary hover:bg-primary/5 px-4 py-3 rounded-xl border border-primary/20 border-dashed transition-all"
                          >
                            <Plus className="w-4 h-4" /> ADD SUB-ENTITY
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Categories;
