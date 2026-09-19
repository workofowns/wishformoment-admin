import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, uploadMedia, MEDIA_FOLDERS } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { GradientColorPicker } from "@/components/ui/GradientColorPicker";
import {
  Plus, Search, Edit2, Trash2, X, Check, Upload, Flame,
  Sparkles, Layers, Sliders, MessageSquare, AlertCircle, Image as ImageIcon
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
}

const TrendingTemplates = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [themeColor, setThemeColor] = useState("#6C41CF");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [usedCount, setUsedCount] = useState(0);
  const [imageUrl, setImageUrl] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  // Fetch all trending templates
  const { data: trendingData, isLoading: isTrendingLoading } = useQuery({
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

  const filtered = trendingTemplates.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    (item.templateName && item.templateName.toLowerCase().includes(search.toLowerCase())) ||
    (item.tag && item.tag.toLowerCase().includes(search.toLowerCase()))
  );

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
    setImageUrl(""); // Clear existing CDN url to show preview
    e.target.value = "";
  };

  const resetForm = () => {
    setTitle("");
    setTemplateId("");
    setThemeColor("#6C41CF");
    setTag("");
    setDescription("");
    setUsedCount(0);
    setImageUrl("");
    setPendingFile(null);
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl("");
    setEditingId(null);
    setShowAddForm(false);
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi("/trending-templates", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTrendingTemplates"] });
      toast.success("Trending template created successfully");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to create trending template"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      fetchApi(`/trending-templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTrendingTemplates"] });
      toast.success("Trending template updated successfully");
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to update trending template"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/trending-templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTrendingTemplates"] });
      toast.success("Trending template deleted successfully");
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete trending template"),
  });

  const startEdit = (item: TrendingTemplate) => {
    setEditingId(item.id);
    setTitle(item.title);
    setTemplateId(item.templateId || "");
    setThemeColor(item.themeColor || "#6C41CF");
    setTag(item.tag || "");
    setDescription(item.description || "");
    setUsedCount(item.usedCount || 0);
    setImageUrl(item.imageUrl || "");
    setPendingFile(null);
    setLocalPreviewUrl("");
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to remove this trending template?")) {
      deleteMutation.mutate(id);
    }
  };

  const submitForm = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!templateId) {
      toast.error("Please select an underlying Template");
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
    <DashboardLayout>
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Flame className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Curation Hub</p>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Trending Templates</h1>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl btn-primary text-white font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" /> Add Trending Template
          </button>
        </div>

        {/* Search Filter Bar */}
        <div className="flex items-center gap-3 mb-8 max-w-md bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/15 focus-within:border-primary/30 transition-all">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, template or tag..."
            className="w-full bg-transparent border-none outline-none text-sm font-semibold text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
          />
        </div>

        {/* Curation List */}
        {isTrendingLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-slate-400 font-bold tracking-widest uppercase">Loading curations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
              <Flame className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No trending templates found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Create trending curations to highlight premium content to authenticated users.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                {/* Image Header */}
                <div className="relative h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-300">
                      <ImageIcon className="w-10 h-10" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">No Cover</span>
                    </div>
                  )}

                  {/* Gradient Overlay & Tag */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-80" />
                  
                  {item.tag && (
                    <span className="absolute top-4 left-4 px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-black text-primary uppercase shadow-sm">
                      {item.tag}
                    </span>
                  )}

                  {/* Title overlay */}
                  <h3 className="absolute bottom-4 left-4 right-4 text-lg font-black text-white line-clamp-1 drop-shadow-sm">
                    {item.title}
                  </h3>
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {item.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Metadata Items */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="flex flex-col gap-0.5 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Template</span>
                        <span className="text-xs font-black text-slate-700 truncate">
                          {item.templateName || "Unknown template"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Used Count</span>
                        <span className="text-xs font-black text-slate-700">
                          {item.usedCount.toLocaleString()} wishes
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Color Indicator */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                    {/* Theme color chip */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full border border-slate-200 shadow-sm"
                        style={{ background: item.themeColor || "#6C41CF" }}
                      />
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {item.themeColor?.startsWith("linear") ? "Gradient" : item.themeColor}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-primary/10 text-slate-400 hover:text-primary transition-all border border-slate-100"
                        title="Edit entry"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all border border-slate-100"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal for Add / Edit */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
              onClick={(e) => e.target === e.currentTarget && resetForm()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 bg-white flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Flame className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-800 leading-tight">
                        {editingId ? "Edit Trending Template" : "New Trending Template"}
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        {editingId ? "Update trending curation settings" : "Fill details to highlight template"}
                      </p>
                    </div>
                  </div>
                  <button onClick={resetForm} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto custom-scrollbar p-7 space-y-6 flex-1 bg-slate-50/30">
                  {/* Two columns for Title and Template Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Curation Title</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Valentine Love Special"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Source Template</label>
                      <Select value={templateId} onValueChange={setTemplateId}>
                        <SelectTrigger className="w-full h-10 px-3.5 rounded-xl bg-white border-slate-200 text-sm font-medium text-slate-700 outline-none">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-60 overflow-y-auto">
                          {availableTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-sm">
                              {t.template_name || t.name} (/{t.slug})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Two columns for Theme Color Picker and Tag */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Theme Color</label>
                      <div className="relative h-10">
                        <GradientColorPicker value={themeColor} onChange={setThemeColor} className="h-10 rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tag Label</label>
                      <input
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        placeholder="e.g. Love, Birthday, Popular"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 transition-all"
                      />
                    </div>
                  </div>

                  {/* Two columns for Used Count and Description */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Used Count (Fake/Inflated)</label>
                      <input
                        type="number"
                        value={usedCount}
                        onChange={(e) => setUsedCount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief marketing text explaining why this is trending..."
                        rows={2}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Thumbnail Cover Image Upload */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cover Image</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="group relative cursor-pointer rounded-2xl overflow-hidden bg-white border-2 border-dashed border-slate-200 hover:border-primary/40 transition-all flex items-center justify-center h-44 shadow-inner"
                    >
                      {localPreviewUrl || imageUrl ? (
                        <>
                          <img
                            src={localPreviewUrl || imageUrl}
                            className="absolute inset-0 w-full h-full object-cover"
                            alt="Curation Preview"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white backdrop-blur-sm">
                            <Upload className="w-6 h-6 mb-1" />
                            <span className="text-xs font-bold">Replace Cover Image</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                            <Upload className="w-5 h-5 text-slate-400" />
                          </div>
                          <p className="text-sm font-semibold text-slate-500">Click to upload cover image</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" />
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-7 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 flex-shrink-0">
                  <button
                    onClick={resetForm}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitForm}
                    disabled={isUploading || createMutation.isPending || updateMutation.isPending}
                    className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/10 hover:opacity-95 disabled:opacity-50 transition-opacity flex items-center gap-2"
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
    </DashboardLayout>
  );
};

export default TrendingTemplates;
