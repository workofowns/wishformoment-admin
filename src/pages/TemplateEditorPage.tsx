import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, uploadMedia, MEDIA_FOLDERS } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FormBuilder, { FormStep } from "@/components/dashboard/FormBuilder";
import {
  ArrowLeft, Check, Crown, Globe, Layout, Layers, Plus, RefreshCw,
  Sparkles, Tag, Trash2, Upload, X, Zap, Code, ShieldCheck, Eye, EyeOff,
  Folder, FolderCheck, CheckSquare, Square
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface CurrencyRate {
  id: string;
  currency: string;
  label: string;
  symbol: string;
  rate: number;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
}

const COMMON_TAGS = [
  "Birthday", "Wedding", "Anniversary", "Valentine", "Father's Day",
  "Mother's Day", "Christmas", "New Year", "Party", "Corporate",
  "Minimal", "Colorful", "Modern", "Classic", "Premium", "Romantic", "Kids"
];

export default function TemplateEditorPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories & Currency Queries
  const { data: categoryData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchApi("/categories"),
  });

  const { data: subCategoriesData } = useQuery({
    queryKey: ["sub-categories"],
    queryFn: () => fetchApi("/sub-categories"),
  });

  const { data: ratesData } = useQuery({
    queryKey: ["adminCurrencyRates"],
    queryFn: () => fetchApi("/currency-rates"),
  });

  const categories: Category[] = categoryData?.data || [];
  const subCategories: SubCategory[] = subCategoriesData?.data || [];
  const currencyRates: CurrencyRate[] = ratesData?.rates || [];

  // Multi-Category & Multi-SubCategory Selection State
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<string[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [componentKey, setComponentKey] = useState("");
  const [type, setType] = useState<"free" | "premium">("free");
  const [price, setPrice] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");
  const [featuredPosition, setFeaturedPosition] = useState<number | "">("");
  const [adminBoost, setAdminBoost] = useState<number>(0);

  // Thumbnail
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [pendingThumbnailFile, setPendingThumbnailFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>("");

  // Gallery Preview Images
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [pendingPreviewFiles, setPendingPreviewFiles] = useState<File[]>([]);
  const [previewLocalUrls, setPreviewLocalUrls] = useState<string[]>([]);

  // Form Steps
  const [steps, setSteps] = useState<FormStep[]>([
    {
      id: "step_1",
      title: "Step 1",
      subtitle: "Basic details",
      icon: "users",
      fields: [{ name: "recipientName", label: "Recipient Name", type: "text", placeholder: "e.g. Amelia", required: true }],
    },
  ]);

  const [isUploading, setIsUploading] = useState(false);

  // Fetch Existing Template when Editing
  const { data: templateData, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ["adminTemplate", id],
    queryFn: () => fetchApi(`/templates/${id}`),
    enabled: isEditing,
  });

  useEffect(() => {
    if (templateData && isEditing) {
      setName(templateData.name || "");
      setTemplateName(templateData.template_name || "");
      setDescription(templateData.description || "");
      setType(templateData.type || "free");
      setPrice(templateData.price ? templateData.price / 100 : 0);
      setComponentKey(templateData.component_key || "");
      setThumbnailUrl(templateData.thumbnail_url || "");
      setTags(templateData.tags || []);
      setIsActive(templateData.is_active ?? true);
      setFeaturedPosition(templateData.featured_position ?? "");
      setAdminBoost(templateData.admin_boost ?? 0);

      // Multi-category & Multi-subcategory hydration
      const catIds: string[] =
        templateData.category_ids && templateData.category_ids.length > 0
          ? templateData.category_ids
          : templateData.category_id
            ? [templateData.category_id]
            : [];
      const subCatIds: string[] =
        templateData.sub_category_ids && templateData.sub_category_ids.length > 0
          ? templateData.sub_category_ids
          : templateData.sub_category_id
            ? [templateData.sub_category_id]
            : [];

      setSelectedCategoryIds(catIds);
      setSelectedSubCategoryIds(subCatIds);

      setPreviewImages(templateData.preview_images || []);
      setPreviewVideoUrl(templateData.preview_video_url || "");

      if (templateData.form_fields && Array.isArray(templateData.form_fields)) {
        const isStepStructure = templateData.form_fields.length > 0 && "fields" in templateData.form_fields[0];
        if (isStepStructure) {
          setSteps(templateData.form_fields as FormStep[]);
        } else {
          setSteps([
            {
              id: "step_1",
              title: "Step 1",
              subtitle: "Customise",
              icon: "file-text",
              fields: templateData.form_fields as any[],
            },
          ]);
        }
      }
    }
  }, [templateData, isEditing]);

  // Category selection helpers
  const toggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
      // Remove any subcategories that belonged to this category
      const subCategoryIdsForCat = subCategories
        .filter((sc) => sc.category_id === categoryId)
        .map((sc) => sc.id);
      setSelectedSubCategoryIds((prev) => prev.filter((id) => !subCategoryIdsForCat.includes(id)));
    } else {
      setSelectedCategoryIds((prev) => [...prev, categoryId]);
      // Automatically select subcategories for this category if none selected
      const firstSubCat = subCategories.find((sc) => sc.category_id === categoryId);
      if (firstSubCat && !selectedSubCategoryIds.includes(firstSubCat.id)) {
        setSelectedSubCategoryIds((prev) => [...prev, firstSubCat.id]);
      }
    }
  };

  const selectAllCategories = () => {
    const allCatIds = categories.map((c) => c.id);
    setSelectedCategoryIds(allCatIds);
  };

  const clearAllCategories = () => {
    setSelectedCategoryIds([]);
    setSelectedSubCategoryIds([]);
  };

  // Subcategory selection helpers
  const toggleSubCategory = (subCatId: string) => {
    if (selectedSubCategoryIds.includes(subCatId)) {
      setSelectedSubCategoryIds((prev) => prev.filter((id) => id !== subCatId));
    } else {
      setSelectedSubCategoryIds((prev) => [...prev, subCatId]);
      // Ensure parent category is selected
      const subCat = subCategories.find((sc) => sc.id === subCatId);
      if (subCat && !selectedCategoryIds.includes(subCat.category_id)) {
        setSelectedCategoryIds((prev) => [...prev, subCat.category_id]);
      }
    }
  };

  const toggleAllSubcategoriesForCategory = (categoryId: string, catSubCategories: SubCategory[]) => {
    const subCatIds = catSubCategories.map((sc) => sc.id);
    const areAllSelected = subCatIds.every((id) => selectedSubCategoryIds.includes(id));

    if (areAllSelected) {
      // Deselect all for this category
      setSelectedSubCategoryIds((prev) => prev.filter((id) => !subCatIds.includes(id)));
    } else {
      // Select all for this category
      setSelectedSubCategoryIds((prev) => Array.from(new Set([...prev, ...subCatIds])));
    }
  };

  // Handle Thumbnail selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    const preview = URL.createObjectURL(file);
    setPendingThumbnailFile(file);
    setLocalPreviewUrl(preview);
    setThumbnailUrl("");
    e.target.value = "";
  };

  // Handle Preview Images
  const handlePreviewImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newUrls = files.map((file) => URL.createObjectURL(file));
    setPendingPreviewFiles((prev) => [...prev, ...files]);
    setPreviewLocalUrls((prev) => [...prev, ...newUrls]);
    e.target.value = "";
  };

  const removePreviewImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      setPreviewImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setPreviewLocalUrls((prev) => {
        const urlToRemove = prev[index];
        if (urlToRemove && urlToRemove.startsWith("blob:")) {
          URL.revokeObjectURL(urlToRemove);
        }
        return prev.filter((_, i) => i !== index);
      });
      setPendingPreviewFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Tag Helpers
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const addCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim();
      if (!tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  };

  // Auto-generate slug helper
  const generateSlugFromName = () => {
    if (!templateName) return;
    const generated = templateName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setName(generated);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      fetchApi("/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      toast.success("Template created and assigned successfully!");
      navigate("/templates");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create template"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      fetchApi(`/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      queryClient.invalidateQueries({ queryKey: ["adminTemplate", id] });
      toast.success("Template updated successfully!");
      navigate("/templates");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update template"),
  });

  // Submit Handler
  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const trimmedTemplateName = templateName.trim();
    const trimmedComponentKey = componentKey.trim();

    if (!trimmedName) {
      toast.error("Template slug/name is required");
      return;
    }
    if (!slug) {
      toast.error("Template name must contain alphanumeric characters for URL slug");
      return;
    }
    if (!trimmedTemplateName) {
      toast.error("Display label is required");
      return;
    }
    if (!trimmedComponentKey) {
      toast.error("Component Key is required (e.g. BirthdayClassic)");
      return;
    }
    if (selectedCategoryIds.length === 0) {
      toast.error("Please select at least one Category");
      return;
    }
    if (selectedSubCategoryIds.length === 0) {
      toast.error("Please select at least one Subcategory");
      return;
    }
    if (!thumbnailUrl && !pendingThumbnailFile) {
      toast.error("Cover Thumbnail image is required");
      return;
    }
    if (type === "premium" && (!price || price <= 0)) {
      toast.error("Premium template must have a valid price in INR (> 0)");
      return;
    }

    if (steps.length === 0) {
      toast.error("At least one form step is required");
      return;
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepTitle = step.title.trim();
      if (!stepTitle) {
        toast.error(`Step ${i + 1} is missing a title`);
        return;
      }
      if (step.fields.length === 0) {
        toast.error(`Step "${stepTitle}" must contain at least one slot/field`);
        return;
      }

      for (let j = 0; j < step.fields.length; j++) {
        const field = step.fields[j];
        if (!field.label.trim()) {
          toast.error(`Slot ${j + 1} in step "${stepTitle}" is missing a label`);
          return;
        }
        if (!field.name.trim()) {
          toast.error(`Slot "${field.label}" in step "${stepTitle}" is missing a unique key (name)`);
          return;
        }
        if (!/^[a-z0-9_]+$/i.test(field.name.trim())) {
          toast.error(`Slot key "${field.name}" in "${stepTitle}" must contain only letters, numbers, and underscores`);
          return;
        }
      }
    }

    let finalThumbnail = thumbnailUrl.trim();

    if (pendingThumbnailFile) {
      setIsUploading(true);
      try {
        finalThumbnail = await uploadMedia(pendingThumbnailFile, MEDIA_FOLDERS.TEMPLATES);
        setThumbnailUrl(finalThumbnail);
        setPendingThumbnailFile(null);
      } catch (err: any) {
        toast.error(err?.message || "Thumbnail upload failed");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    let finalPreviewImages = [...previewImages];
    if (pendingPreviewFiles.length > 0) {
      setIsUploading(true);
      try {
        const uploadedUrls = await Promise.all(
          pendingPreviewFiles.map((file) => uploadMedia(file, MEDIA_FOLDERS.TEMPLATES))
        );
        finalPreviewImages = [...finalPreviewImages, ...uploadedUrls];
        setPendingPreviewFiles([]);
        setPreviewLocalUrls([]);
      } catch (err: any) {
        toast.error(err?.message || "Gallery images upload failed");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Upload default image assets inside fields if present
    const processedFields = await Promise.all(
      steps.map(async (step) => {
        const processedStepFields = await Promise.all(
          step.fields.map(async (field: any) => {
            if (field.type === "image" && field.pendingFile) {
              try {
                const uploadedUrl = await uploadMedia(field.pendingFile, MEDIA_FOLDERS.TEMPLATES);
                const { pendingFile, previewUrl, ...rest } = field;
                return { ...rest, default_value: uploadedUrl };
              } catch (err) {
                console.error("Failed to upload field default asset", err);
                return field;
              }
            }
            return field;
          })
        );
        return {
          ...step,
          fields: processedStepFields,
        };
      })
    );

    const payload = {
      name: slug,
      slug,
      templateName: trimmedTemplateName,
      description: description.trim() || undefined,
      categoryIds: selectedCategoryIds,
      subCategoryIds: selectedSubCategoryIds,
      subCategoryId: selectedSubCategoryIds[0], // fallback for backward compatibility
      type,
      price: type === "premium" ? Math.round(price * 100) : 0,
      componentKey: trimmedComponentKey,
      tags,
      thumbnailUrl: finalThumbnail,
      previewImages: finalPreviewImages,
      previewVideoUrl: previewVideoUrl.trim() || null,
      featuredPosition: featuredPosition === "" ? null : Number(featuredPosition),
      adminBoost: Number(adminBoost) || 0,
      isActive,
      formFields: processedFields,
    };

    if (isEditing && id) {
      updateMutation.mutate({ id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPendingAction = createMutation.isPending || updateMutation.isPending || isUploading;

  if (isEditing && isLoadingTemplate) {
    return (
      <DashboardLayout>
        <div className="min-h-[500px] flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-bold text-slate-500">Loading template data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="w-full max-w-[1600px] mx-auto space-y-8 pb-20 px-2 sm:px-4">
        {/* ── Top Header Navigation Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <Link
              to="/templates"
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-0.5">
                <Link to="/templates" className="hover:text-primary transition-colors">
                  Templates
                </Link>
                <span>/</span>
                <span className="text-slate-700 font-semibold">{isEditing ? "Edit Template" : "New Template"}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {isEditing ? `Edit: ${templateName || name}` : "Create New Wish Template"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/templates")}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPendingAction}
              className="px-6 py-2.5 rounded-xl btn-primary text-white font-bold text-xs shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Uploading Media...
                </>
              ) : isPendingAction ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                <>
                  <Check className="w-4 h-4" /> Save Changes
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> Deploy Template
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── 2-Column Responsive Studio Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ════ LEFT COLUMN: Identity & Interactive Form Builder (8 cols on large screens) ════ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* Card 1: Basic Identity & Categorization */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">General Information</h2>
                    <p className="text-[11px] text-slate-400">Template naming, multi-category assignment, and routing slug</p>
                  </div>
                </div>
              </div>

              {/* Display Label & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Display Label *
                  </label>
                  <input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Valentine Romantic Letter"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:font-normal placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Slug / Identifier *
                    </label>
                    {templateName && !name && (
                      <button
                        type="button"
                        onClick={generateSlugFromName}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Auto-fill
                      </button>
                    )}
                  </div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. valentines-relationship"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-medium text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:text-slate-300"
                  />
                </div>
              </div>

              {/* Multi-Category Selector */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-primary" /> Assigned Categories * ({selectedCategoryIds.length})
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllCategories}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300 text-xs">|</span>
                    <button
                      type="button"
                      onClick={clearAllCategories}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => {
                    const isSelected = selectedCategoryIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategory(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${isSelected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 hover:border-primary/40 hover:bg-slate-50"
                          }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Subcategory Selector (Grouped by Category) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <FolderCheck className="w-3.5 h-3.5 text-primary" /> Assigned Subcategories * ({selectedSubCategoryIds.length})
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Grouped by selected categories
                  </span>
                </div>

                {selectedCategoryIds.length === 0 ? (
                  <div className="py-6 px-4 text-center bg-white rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-medium text-slate-400">
                      Select one or more categories above to display and assign subcategories.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCategoryIds.map((catId) => {
                      const cat = categories.find((c) => c.id === catId);
                      const catSubCategories = subCategories.filter((sc) => sc.category_id === catId);
                      const areAllSelected =
                        catSubCategories.length > 0 &&
                        catSubCategories.every((sc) => selectedSubCategoryIds.includes(sc.id));

                      return (
                        <div
                          key={catId}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-primary" />
                              {cat?.name || "Category"}
                            </span>
                            {catSubCategories.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleAllSubcategoriesForCategory(catId, catSubCategories)}
                                className="text-[10px] font-bold text-primary hover:underline"
                              >
                                {areAllSelected ? "Deselect All" : "Select All"}
                              </button>
                            )}
                          </div>

                          {catSubCategories.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic">No subcategories found in this category.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {catSubCategories.map((sc) => {
                                const isSelected = selectedSubCategoryIds.includes(sc.id);
                                return (
                                  <button
                                    key={sc.id}
                                    type="button"
                                    onClick={() => toggleSubCategory(sc.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${isSelected
                                        ? "bg-purple-50 text-purple-800 border-purple-300 font-semibold"
                                        : "bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                                      }`}
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                                    ) : (
                                      <Square className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                    {sc.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Component Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-primary" /> React Component Key *
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Matches Frontend Component Registry</span>
                </div>
                <input
                  value={componentKey}
                  onChange={(e) => setComponentKey(e.target.value)}
                  placeholder="e.g. ValentinesRelationship, RoyalWeddingWish, SweetAnniversary"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:font-normal placeholder:text-slate-300"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Public Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide a compelling overview of what makes this wish design unique..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all resize-none placeholder:text-slate-300"
                />
              </div>

              {/* Tags Selector */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Tags & Keywords
                </label>
                <div className="flex flex-wrap gap-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 min-h-[50px]">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold"
                    >
                      {tag}
                      <X className="w-3 h-3 cursor-pointer hover:text-rose-600" onClick={() => toggleTag(tag)} />
                    </Badge>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={addCustomTag}
                    placeholder="+ Type tag and press Enter..."
                    className="bg-transparent border-none text-xs text-slate-700 outline-none font-medium placeholder:text-slate-400 min-w-[140px] flex-1 py-1"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1 self-center">
                    Suggestions:
                  </span>
                  {COMMON_TAGS.filter((t) => !tags.includes(t))
                    .slice(0, 7)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="text-[10px] font-medium bg-white hover:bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Card 2: Interactive Form Step Builder */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Form Slots & Stepper Flow</h2>
                    <p className="text-[11px] text-slate-400">
                      Configure multi-step customization fields displayed on the wish editor
                    </p>
                  </div>
                </div>
              </div>

              <FormBuilder steps={steps} onChange={setSteps} />
            </div>
          </div>

          {/* ════ RIGHT COLUMN: Monetization, Visibility & Media Assets (4 cols on large screens) ════ */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-8">
            {/* Card 3: Monetization & Pricing Control */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Access & Pricing</h2>
                    <p className="text-[11px] text-slate-400">Set monetization tier and regional currency prices</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${type === "premium" ? "text-amber-600" : "text-slate-400"}`}>
                    {type === "premium" ? "Premium" : "Free"}
                  </span>
                  <Switch
                    checked={type === "premium"}
                    onCheckedChange={(checked) => setType(checked ? "premium" : "free")}
                  />
                </div>
              </div>

              {type === "premium" ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Base Price in INR (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={price || ""}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        placeholder="299"
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Multi-Currency Automatic Estimator Table */}
                  {currencyRates.length > 0 && price > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 text-primary" /> Regional Price Preview
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">Auto-converted</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {currencyRates
                          .filter((r) => r.is_active && r.currency !== "INR")
                          .slice(0, 6)
                          .map((r) => {
                            const converted = Math.round(price * r.rate * 100) / 100;
                            return (
                              <div
                                key={r.currency}
                                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60 text-xs"
                              >
                                <span className="font-semibold text-slate-600">{r.currency}</span>
                                <span className="font-bold text-slate-900">
                                  {r.symbol}
                                  {converted.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-xs text-emerald-800 font-medium">
                    This template is configured as <span className="font-bold">Free</span>. Users worldwide can create
                    and share unlimited wishes with this design without payment.
                  </p>
                </div>
              )}

              {/* Status Visibility Switch */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Publish Status</h4>
                  <p className="text-[11px] text-slate-400">
                    {isActive ? "Template is publicly accessible" : "Template is hidden from public catalog"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isActive ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </div>

            {/* Card 4: Catalog Ranking & Promotion Controls */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Ranking & Promotion</h2>
                    <p className="text-[11px] text-slate-400">Pin to fixed top positions or add custom score boost</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>Fixed Pin Position</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={featuredPosition}
                    onChange={(e) => setFeaturedPosition(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 1 (Top slot)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:text-slate-300"
                  />
                  <p className="text-[10px] text-slate-400">
                    Leave empty for organic ranking. Enter 1 to guarantee 1st place.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span>Admin Boost Score</span>
                    <span className="text-[10px] text-slate-400 font-normal">Hybrid weight</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={adminBoost || ""}
                    onChange={(e) => setAdminBoost(Number(e.target.value))}
                    placeholder="e.g. 50, 100"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:text-slate-300"
                  />
                  <p className="text-[10px] text-slate-400">
                    Extra points added to base score before recency multiplier.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 5: Media Assets & Visuals */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Media Assets</h2>
                    <p className="text-[11px] text-slate-400">Cover thumbnail, preview gallery, and video teaser</p>
                  </div>
                </div>
              </div>

              {/* Cover Thumbnail */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Cover Thumbnail Image *
                </label>

                {localPreviewUrl || thumbnailUrl ? (
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-slate-200 group bg-slate-100">
                    <img
                      src={localPreviewUrl || thumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-bold shadow-md hover:bg-slate-100 transition-colors"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setThumbnailUrl("");
                          setPendingThumbnailFile(null);
                          if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
                          setLocalPreviewUrl("");
                        }}
                        className="p-1.5 rounded-xl bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Click or drag cover image</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PNG, JPG, WebP up to 5MB (16:10 recommended)</p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>

              {/* Gallery Preview Images */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Showcase Gallery Images ({previewImages.length + previewLocalUrls.length})
                </label>

                <div className="grid grid-cols-3 gap-2.5">
                  {previewImages.map((url, idx) => (
                    <div
                      key={`existing-${idx}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group bg-slate-100"
                    >
                      <img src={url} alt="Gallery" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePreviewImage(idx, true)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {previewLocalUrls.map((url, idx) => (
                    <div
                      key={`local-${idx}`}
                      className="relative aspect-square rounded-xl overflow-hidden border border-primary/40 group bg-slate-100"
                    >
                      <img src={url} alt="Gallery local" className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 left-1.5 bg-primary text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                        New
                      </div>
                      <button
                        type="button"
                        onClick={() => removePreviewImage(idx, false)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-slate-50 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-400 hover:text-primary">
                    <Plus className="w-5 h-5 mb-1" />
                    <span className="text-[10px] font-bold">Add Image</span>
                    <input
                      type="file"
                      multiple
                      onChange={handlePreviewImagesSelect}
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Preview Video URL */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Preview Video Teaser URL (Optional)
                </label>
                <input
                  type="url"
                  value={previewVideoUrl}
                  onChange={(e) => setPreviewVideoUrl(e.target.value)}
                  placeholder="https://storage.googleapis.com/.../teaser.mp4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:text-slate-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky Bottom Action Bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-6 sm:px-10 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-600">
                {isEditing ? "Editing mode" : "Drafting new template"} &bull;{" "}
                <span className="font-bold text-slate-900">{templateName || name || "Untitled Template"}</span>
                {" "}&bull;{" "}
                <span className="text-primary font-bold">{selectedCategoryIds.length} categories</span>,{" "}
                <span className="text-purple-600 font-bold">{selectedSubCategoryIds.length} subcategories</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/templates")}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPendingAction}
                className="px-6 py-2.5 rounded-xl btn-primary text-white font-bold text-xs shadow-md shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Uploading Media...
                  </>
                ) : isPendingAction ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <Check className="w-4 h-4" /> Save Changes
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Deploy Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
