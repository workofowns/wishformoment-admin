import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, uploadMedia, MEDIA_FOLDERS } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FormBuilder, { FormStep } from "@/components/dashboard/FormBuilder";
import {
  ArrowLeft, Check, Crown, Globe, Image, Layout, Layers, Plus, RefreshCw,
  Sparkles, Tag, Trash2, Upload, X, Zap, Code, ShieldCheck, Eye, EyeOff,
  Folder, FolderCheck, CheckSquare, Square, Search, Share2, ExternalLink,
  Link as LinkIcon, HelpCircle, Copy, SlidersHorizontal, Music, FileAudio, AlertCircle
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
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: subCategoriesData } = useQuery({
    queryKey: ["sub-categories"],
    queryFn: () => fetchApi("/sub-categories"),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: ratesData } = useQuery({
    queryKey: ["adminCurrencyRates"],
    queryFn: () => fetchApi("/currency-rates"),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: musicData } = useQuery<{ success: boolean; music: Array<{ id: number; name: string; music_url: string }> }>({
    queryKey: ["adminMusicList"],
    queryFn: () => fetchApi("/music"),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

  // SEO Metadata & Social Sharing State
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [pendingOgImageFile, setPendingOgImageFile] = useState<File | null>(null);
  const [localOgImagePreview, setLocalOgImagePreview] = useState("");
  const [metaKeywords, setMetaKeywords] = useState<string[]>([]);
  const [metaKeywordInput, setMetaKeywordInput] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [noindex, setNoindex] = useState(false);
  const [seoPreviewTab, setSeoPreviewTab] = useState<"google" | "social">("google");

  const ogFileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Template Assets State (Stored dynamically in template_assets JSONB column in database)
  interface DynamicTemplateAsset {
    id: string;
    key: string;
    url: string;
    pendingFile?: File | null;
    localPreview?: string;
  }

  const [dynamicAssets, setDynamicAssets] = useState<DynamicTemplateAsset[]>([]);
  const [copiedAssetKey, setCopiedAssetKey] = useState<string | null>(null);
  const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);
  const assetFileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isValidWebUrl = (url?: string | null): boolean => {
    if (!url) return false;
    const trimmed = url.trim();
    return (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("data:")
    );
  };

  const handleAddAsset = (presetKey: string = "") => {
    const newId = `asset_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setDynamicAssets((prev) => [
      ...prev,
      {
        id: newId,
        key: presetKey,
        url: "",
      },
    ]);
  };

  const handleRemoveAsset = (id: string) => {
    setDynamicAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUpdateAssetKey = (id: string, newKey: string) => {
    // Sanitize: lowercase, replace spaces with underscores, allow alphanumeric, underscore, hyphen
    const formatted = newKey.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    setDynamicAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, key: formatted } : a))
    );
  };

  const handleUpdateAssetUrl = (id: string, newUrl: string) => {
    setDynamicAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, url: newUrl, pendingFile: null, localPreview: undefined } : a))
    );
  };

  const handleAssetFileSelect = async (id: string, file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Asset file size must be under 25MB");
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const suggestedKey = file.name.split(".")[0].toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");

    // Set preview immediately
    setDynamicAssets((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          pendingFile: file,
          localPreview: blobUrl,
          key: a.key || suggestedKey,
        };
      })
    );

    // Upload directly to S3
    setUploadingAssetId(id);
    const toastId = toast.loading(`Uploading "${file.name}" to S3 bucket...`);
    try {
      const cdnUrl = await uploadMedia(file, MEDIA_FOLDERS.TEMPLATES);
      setDynamicAssets((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          return {
            ...a,
            url: cdnUrl,
            pendingFile: null,
            localPreview: undefined,
          };
        })
      );
      toast.success(`Uploaded "${file.name}" to S3 successfully!`, { id: toastId });
    } catch (err: any) {
      console.error("[TemplateEditor] Asset S3 upload failed:", err);
      toast.error(err?.message || "Failed to upload asset to S3 bucket", { id: toastId });
    } finally {
      setUploadingAssetId(null);
    }
  };

  const handleCopyKeyCode = (key: string) => {
    if (!key) return;
    navigator.clipboard.writeText(`templateAssets.${key}`);
    setCopiedAssetKey(key);
    toast.success(`Copied "templateAssets.${key}"`);
    setTimeout(() => setCopiedAssetKey(null), 2000);
  };

  // Fetch Existing Template when Editing
  const { data: templateData, isLoading: isLoadingTemplate } = useQuery({
    queryKey: ["adminTemplate", id],
    queryFn: () => fetchApi(`/templates/${id}`),
    enabled: isEditing,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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

      // SEO Metadata hydration (supports both snake_case and camelCase from backend)
      setMetaTitle(templateData.meta_title ?? templateData.metaTitle ?? "");
      setMetaDescription(templateData.meta_description ?? templateData.metaDescription ?? "");
      setOgImage(templateData.og_image ?? templateData.ogImage ?? "");
      const rawKeywords = templateData.meta_keywords ?? templateData.metaKeywords;
      setMetaKeywords(
        Array.isArray(rawKeywords)
          ? rawKeywords
          : typeof rawKeywords === "string"
          ? rawKeywords.split(",").map((k: string) => k.trim()).filter(Boolean)
          : []
      );
      setCanonicalUrl(templateData.canonical_url ?? templateData.canonicalUrl ?? "");
      setNoindex(templateData.noindex ?? templateData.is_noindex ?? false);

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

      // Template Assets hydration (Dynamic key-value map from DB)
      const rawAssets = templateData.template_assets ?? templateData.templateAssets;
      if (rawAssets && typeof rawAssets === "object" && !Array.isArray(rawAssets)) {
        const loadedAssets: DynamicTemplateAsset[] = Object.entries(rawAssets).map(
          ([key, value], index) => ({
            id: `asset_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
            key,
            url: typeof value === "string" ? value : (value as any)?.url || "",
          })
        );
        setDynamicAssets(loadedAssets);
      } else {
        setDynamicAssets([]);
      }

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

  // SEO Helpers
  const autoGenerateMetaTitle = () => {
    const primaryCat = categories.find((c) => selectedCategoryIds.includes(c.id));
    const primarySub = subCategories.find((s) => selectedSubCategoryIds.includes(s.id));
    const label = templateName.trim() || name.trim() || "Greeting Template";
    const subLabel = primarySub ? primarySub.name : primaryCat ? primaryCat.name : "";
    const generated = subLabel ? `${label} — ${subLabel} | WishForMoment` : `${label} | WishForMoment`;
    setMetaTitle(generated.slice(0, 60));
    toast.success("Meta title auto-generated!");
  };

  const autoGenerateMetaDescription = () => {
    const label = templateName.trim() || name.trim() || "this template";
    const primarySub = subCategories.find((s) => selectedSubCategoryIds.includes(s.id));
    const subLabel = primarySub ? primarySub.name.toLowerCase() : "special";
    let desc = description.trim();
    if (!desc || desc.length < 20) {
      desc = `Create and send a personalized ${subLabel} wish with this "${label}" template. Customize messages, photos, and music instantly on WishForMoment.`;
    }
    setMetaDescription(desc.slice(0, 160));
    toast.success("Meta description auto-generated!");
  };

  const handleAddKeyword = () => {
    const trimmed = metaKeywordInput.trim().replace(/^,+|,+$/g, "");
    if (!trimmed) return;
    const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
    const updated = Array.from(new Set([...metaKeywords, ...parts]));
    setMetaKeywords(updated);
    setMetaKeywordInput("");
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    setMetaKeywords((prev) => prev.filter((k) => k !== kwToRemove));
  };

  const handleCopyThumbnailToOg = () => {
    if (thumbnailUrl) {
      setOgImage(thumbnailUrl);
      setPendingOgImageFile(null);
      if (localOgImagePreview) URL.revokeObjectURL(localOgImagePreview);
      setLocalOgImagePreview("");
      toast.success("Cover thumbnail copied to Social Sharing OG Image!");
    } else if (pendingThumbnailFile) {
      setPendingOgImageFile(pendingThumbnailFile);
      if (localPreviewUrl) setLocalOgImagePreview(localPreviewUrl);
      toast.success("Pending cover image linked to Social Sharing OG Image!");
    } else {
      toast.error("Please select or upload a cover thumbnail first");
    }
  };

  const handleOgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file must be under 5MB");
        return;
      }
      setPendingOgImageFile(file);
      const url = URL.createObjectURL(file);
      setLocalOgImagePreview(url);
    }
  };

  const [isSavingSeo, setIsSavingSeo] = useState(false);

  const handleSaveSeoOnly = async () => {
    if (!isEditing || !id) {
      toast.info("Please create and save the template first before updating SEO metadata independently.");
      return;
    }

    setIsSavingSeo(true);
    try {
      let finalOgImage = ogImage.trim();
      if (pendingOgImageFile) {
        setIsUploading(true);
        try {
          finalOgImage = await uploadMedia(pendingOgImageFile, MEDIA_FOLDERS.TEMPLATES);
          setOgImage(finalOgImage);
          setPendingOgImageFile(null);
          if (localOgImagePreview) URL.revokeObjectURL(localOgImagePreview);
          setLocalOgImagePreview("");
        } catch (err: any) {
          toast.error(err?.message || "Social share image upload failed");
          setIsUploading(false);
          setIsSavingSeo(false);
          return;
        }
        setIsUploading(false);
      }

      let finalKeywords = [...metaKeywords];
      if (metaKeywordInput.trim()) {
        const parts = metaKeywordInput.trim().replace(/^,+|,+$/g, "").split(",").map((p) => p.trim()).filter(Boolean);
        finalKeywords = Array.from(new Set([...finalKeywords, ...parts]));
        setMetaKeywords(finalKeywords);
        setMetaKeywordInput("");
      }

      const seoPayload = {
        metaTitle: metaTitle.trim() || null,
        meta_title: metaTitle.trim() || null,
        metaDescription: metaDescription.trim() || null,
        meta_description: metaDescription.trim() || null,
        ogImage: finalOgImage || null,
        og_image: finalOgImage || null,
        metaKeywords: finalKeywords,
        meta_keywords: finalKeywords,
        canonicalUrl: canonicalUrl.trim() || null,
        canonical_url: canonicalUrl.trim() || null,
        noindex: Boolean(noindex),
        is_noindex: Boolean(noindex),
      };

      console.log("[TemplateEditor] Quick-updating SEO metadata payload:", seoPayload);

      const res = await fetchApi(`/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(seoPayload),
      });

      console.log("[TemplateEditor] SEO metadata updated response:", res);
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      queryClient.invalidateQueries({ queryKey: ["adminTemplate", id] });
      toast.success("SEO & Social Sharing metadata saved successfully!");
    } catch (err: any) {
      console.error("[TemplateEditor] Failed to save SEO metadata:", err);
      toast.error(err?.message || "Failed to update SEO metadata");
    } finally {
      setIsSavingSeo(false);
    }
  };

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
    setPendingThumbnailFile(file);
    setLocalPreviewUrl(preview);
    setThumbnailUrl("");
    e.target.value = "";
  };

  // Handle Preview Images
  const handlePreviewImagesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const isAllowed = (file: File) => {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      return allowedExts.includes(ext) || allowedMimes.includes(file.type.toLowerCase());
    };

    const files = rawFiles.filter(isAllowed);
    if (rawFiles.some((f) => !isAllowed(f))) {
      toast.error("Only JPG, PNG, WEBP, and GIF images are supported. Unsupported files were skipped.");
    }
    if (files.length === 0) {
      e.target.value = "";
      return;
    }

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

    // Upload default image assets inside fields if present (support both single and multiple image fields)
    setIsUploading(true);
    let processedFields;
    try {
      processedFields = await Promise.all(
        steps.map(async (step) => {
          const processedStepFields = await Promise.all(
            step.fields.map(async (field: any) => {
              if (field.type === "image") {
                const pendingFiles: File[] =
                  field._files && Array.isArray(field._files)
                    ? field._files
                    : field.pendingFile
                      ? [field.pendingFile]
                      : [];

                const folder = (field.s3Folder || MEDIA_FOLDERS.TEMPLATES) as any;

                let uploadedUrls: string[] = [];
                if (pendingFiles.length > 0) {
                  uploadedUrls = await Promise.all(
                    pendingFiles.map((file) => uploadMedia(file, folder))
                  );
                }

                let finalDefaultValue = field.defaultValue || "";
                if (field.multiple) {
                  let existingUrls: string[] = [];
                  try {
                    existingUrls = field.defaultValue?.startsWith("[")
                      ? JSON.parse(field.defaultValue)
                      : field.defaultValue
                        ? [field.defaultValue]
                        : [];
                  } catch {
                    existingUrls = [];
                  }

                  let uploadIdx = 0;
                  const resolvedList = existingUrls
                    .map((url: string) => {
                      if (typeof url === "string" && url.startsWith("blob:")) {
                        const replacement = uploadedUrls[uploadIdx++];
                        return replacement || null;
                      }
                      return url;
                    })
                    .filter(Boolean) as string[];

                  while (uploadIdx < uploadedUrls.length) {
                    resolvedList.push(uploadedUrls[uploadIdx++]);
                  }

                  finalDefaultValue = resolvedList.length > 0 ? JSON.stringify(resolvedList) : "";
                } else {
                  if (uploadedUrls.length > 0) {
                    finalDefaultValue = uploadedUrls[0];
                  } else if (typeof finalDefaultValue === "string" && finalDefaultValue.startsWith("blob:")) {
                    finalDefaultValue = "";
                  }
                }

                const { _files, pendingFile, previewUrl, default_value, ...rest } = field;
                return {
                  ...rest,
                  defaultValue: finalDefaultValue,
                };
              }

              if (field.type === "music" && field.defaultValue && !field.defaultValue.startsWith("http")) {
                const cleanVal = field.defaultValue.trim().toLowerCase();
                const matchedMusic = (musicData?.music || []).find(
                  (m) =>
                    m.name.trim().toLowerCase() === cleanVal ||
                    String(m.id) === cleanVal ||
                    m.name.trim().toLowerCase().replace(/[-_]/g, ' ') === cleanVal.replace(/[-_]/g, ' ') ||
                    (m.music_url && m.music_url.toLowerCase().includes(cleanVal))
                );
                if (matchedMusic && matchedMusic.music_url) {
                  return { ...field, defaultValue: matchedMusic.music_url };
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
      setSteps(processedFields);
    } catch (err: any) {
      toast.error(err?.message || "Field default image upload failed");
      setIsUploading(false);
      return;
    }
    let finalOgImage = ogImage.trim();
    if (pendingOgImageFile) {
      setIsUploading(true);
      try {
        finalOgImage = await uploadMedia(pendingOgImageFile, MEDIA_FOLDERS.TEMPLATES);
        setOgImage(finalOgImage);
        setPendingOgImageFile(null);
        if (localOgImagePreview) URL.revokeObjectURL(localOgImagePreview);
        setLocalOgImagePreview("");
      } catch (err: any) {
        toast.error(err?.message || "Social share image upload failed");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    let finalKeywords = [...metaKeywords];
    if (metaKeywordInput.trim()) {
      const parts = metaKeywordInput.trim().replace(/^,+|,+$/g, "").split(",").map((p) => p.trim()).filter(Boolean);
      finalKeywords = Array.from(new Set([...finalKeywords, ...parts]));
      setMetaKeywords(finalKeywords);
      setMetaKeywordInput("");
    }

    // Upload any pending template asset files
    const assetsWithPending = dynamicAssets.filter((a) => a.pendingFile);
    const uploadedAssetUrls: Record<string, string> = {};
    if (assetsWithPending.length > 0) {
      setIsUploading(true);
      try {
        await Promise.all(
          assetsWithPending.map(async (asset) => {
            if (asset.pendingFile) {
              const url = await uploadMedia(asset.pendingFile, MEDIA_FOLDERS.TEMPLATES);
              uploadedAssetUrls[asset.id] = url;
            }
          })
        );
      } catch (err: any) {
        toast.error(err?.message || "Failed to upload one or more template assets");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    // Build final template_assets map (key -> URL)
    const finalTemplateAssets: Record<string, string> = {};
    for (const asset of dynamicAssets) {
      const trimmedKey = asset.key.trim();
      if (!trimmedKey) continue;
      const finalUrl = uploadedAssetUrls[asset.id] || asset.url.trim();
      if (finalUrl) {
        finalTemplateAssets[trimmedKey] = finalUrl;
      }
    }

    const payload = {
      name: slug,
      slug,
      templateName: trimmedTemplateName,
      template_name: trimmedTemplateName,
      description: description.trim() || undefined,
      categoryIds: selectedCategoryIds,
      category_ids: selectedCategoryIds,
      subCategoryIds: selectedSubCategoryIds,
      sub_category_ids: selectedSubCategoryIds,
      subCategoryId: selectedSubCategoryIds[0], // fallback for backward compatibility
      sub_category_id: selectedSubCategoryIds[0],
      type,
      price: type === "premium" ? Math.round(price * 100) : 0,
      componentKey: trimmedComponentKey,
      component_key: trimmedComponentKey,
      tags,
      thumbnailUrl: finalThumbnail,
      thumbnail_url: finalThumbnail,
      previewImages: finalPreviewImages,
      preview_images: finalPreviewImages,
      previewVideoUrl: previewVideoUrl.trim() || null,
      preview_video_url: previewVideoUrl.trim() || null,
      featuredPosition: featuredPosition === "" ? null : Number(featuredPosition),
      featured_position: featuredPosition === "" ? null : Number(featuredPosition),
      adminBoost: Number(adminBoost) || 0,
      admin_boost: Number(adminBoost) || 0,
      isActive,
      is_active: isActive,
      formFields: processedFields,
      form_fields: processedFields,
      // SEO Metadata fields (dual casing for robust backend persistence)
      metaTitle: metaTitle.trim() || null,
      meta_title: metaTitle.trim() || null,
      metaDescription: metaDescription.trim() || null,
      meta_description: metaDescription.trim() || null,
      ogImage: finalOgImage || null,
      og_image: finalOgImage || null,
      metaKeywords: finalKeywords,
      meta_keywords: finalKeywords,
      canonicalUrl: canonicalUrl.trim() || null,
      canonical_url: canonicalUrl.trim() || null,
      noindex: Boolean(noindex),
      is_noindex: Boolean(noindex),
      // Template Assets (admin-configured CDN asset URLs)
      templateAssets: finalTemplateAssets,
      template_assets: finalTemplateAssets,
    };

    console.log("[TemplateEditor] Submitting payload to API:", payload);

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

            {/* Card 3: SEO & Social Sharing (Open Graph) Studio */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-800">SEO & Social Sharing (Open Graph)</h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Production Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Search engine optimization, Google SERP appearance, and social card preview for WhatsApp, Twitter, and Facebook
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  {/* Live Preview Switcher Tab */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSeoPreviewTab("google")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        seoPreviewTab === "google"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Search className="w-3.5 h-3.5 text-primary" /> Google SERP
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoPreviewTab("social")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        seoPreviewTab === "social"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Share2 className="w-3.5 h-3.5 text-blue-500" /> Social Card
                    </button>
                  </div>

                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleSaveSeoOnly}
                      disabled={isSavingSeo || isUploading}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Directly save metadata updates to backend"
                    >
                      {isSavingSeo ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving SEO...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" /> Save SEO Metadata
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* ── Real-Time Interactive Live Previews ── */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    {seoPreviewTab === "google" ? "Live Google Search Snippet Preview" : "Live Social Sharing Card Preview (1200×630)"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Updated live as you type</span>
                </div>

                {seoPreviewTab === "google" ? (
                  /* Google SERP Snippet Preview Box */
                  <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-xs space-y-1.5 font-sans">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-black">
                        W
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-800 text-[11px]">WishForMoment</span>
                        <span className="text-slate-400 text-[10px]">&rsaquo;</span>
                        <span className="text-slate-500 text-[10px] truncate max-w-[280px]">
                          templates &rsaquo; {categories.find((c) => selectedCategoryIds.includes(c.id))?.slug || "category"} &rsaquo; {name || "template"}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-medium text-[#1a0dab] hover:underline cursor-pointer leading-snug line-clamp-1">
                      {metaTitle.trim() ||
                        (templateName.trim()
                          ? `${templateName.trim()} — ${subCategories.find((s) => selectedSubCategoryIds.includes(s.id))?.name || "Wish"} | WishForMoment`
                          : "Customizable Greeting Card Template | WishForMoment")}
                    </h3>

                    <p className="text-xs sm:text-sm text-[#4d5156] leading-relaxed line-clamp-2">
                      {metaDescription.trim() ||
                        description.trim() ||
                        "Send a beautiful personalized wish with this interactive greeting card template. Customize messages, photos, and music instantly on WishForMoment."}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] font-mono text-slate-400 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        Title Length:
                        <span
                          className={`font-bold ${
                            metaTitle.length >= 40 && metaTitle.length <= 60
                              ? "text-emerald-600"
                              : metaTitle.length > 60
                              ? "text-rose-600"
                              : "text-amber-600"
                          }`}
                        >
                          {metaTitle.length}/60 chars
                        </span>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        Description Length:
                        <span
                          className={`font-bold ${
                            metaDescription.length >= 120 && metaDescription.length <= 160
                              ? "text-emerald-600"
                              : metaDescription.length > 160
                              ? "text-rose-600"
                              : "text-amber-600"
                          }`}
                        >
                          {metaDescription.length}/160 chars
                        </span>
                      </span>
                      {noindex && (
                        <>
                          <span>&bull;</span>
                          <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            NOINDEX ACTIVE
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Social Share Card Preview (WhatsApp / Facebook / Twitter) */
                  <div className="max-w-md mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-md">
                    <div className="relative aspect-[1.91/1] bg-slate-900 overflow-hidden">
                      {localOgImagePreview || ogImage || localPreviewUrl || thumbnailUrl ? (
                        <img
                          src={localOgImagePreview || ogImage || localPreviewUrl || thumbnailUrl}
                          alt="Open Graph preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 text-center">
                          <Globe className="w-8 h-8 text-primary mb-2 opacity-80" />
                          <p className="text-xs font-bold">{templateName || "Wish Template"}</p>
                          <p className="text-[10px] text-slate-400">wishformoment.com</p>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                        1200 × 630
                      </div>
                    </div>

                    <div className="p-3.5 space-y-1 bg-slate-50 border-t border-slate-200/80">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        WISHFORMOMENT.COM
                      </p>
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                        {metaTitle.trim() || templateName.trim() || name || "Wish Template"}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                        {metaDescription.trim() ||
                          description.trim() ||
                          "Send personalized wishes with interactive animations, photos, and music."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Meta Title Input & Auto-Generate ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    Meta Title (Google & Social Headline)
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        metaTitle.length >= 40 && metaTitle.length <= 60
                          ? "bg-emerald-50 text-emerald-700 font-bold"
                          : metaTitle.length > 60
                          ? "bg-rose-50 text-rose-700 font-bold"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {metaTitle.length}/60
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={autoGenerateMetaTitle}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-generate
                  </button>
                </div>
                <input
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="e.g. Valentine Romantic Letter — Love & Romance | WishForMoment"
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:font-normal placeholder:text-slate-300"
                />
                <p className="text-[10px] text-slate-400">
                  Recommended: 50–60 characters. Appears in search results, browser tabs, and message link previews.
                </p>
              </div>

              {/* ── Meta Description Input & Auto-Generate ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    Meta Description (SERP Snippet & Social Summary)
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        metaDescription.length >= 120 && metaDescription.length <= 160
                          ? "bg-emerald-50 text-emerald-700 font-bold"
                          : metaDescription.length > 160
                          ? "bg-rose-50 text-rose-700 font-bold"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {metaDescription.length}/160
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={autoGenerateMetaDescription}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-generate
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="e.g. Send a heartfelt Valentine's wish with our Romantic Letter template. Customize romantic photos, love notes, and background music instantly on WishForMoment."
                  maxLength={300}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:text-slate-300 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-slate-400">
                  Recommended: 120–160 characters. A compelling summary to boost organic click-through rate from search engines.
                </p>
              </div>

              {/* ── Social Share Image (OG Image) ── */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-primary" /> Open Graph Social Image (1200 × 630)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      High-resolution image displayed when shared on WhatsApp, Facebook, Twitter, and iMessage
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyThumbnailToOg}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-primary transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <Copy className="w-3 h-3" /> Use Cover Thumbnail
                    </button>
                    <button
                      type="button"
                      onClick={() => ogFileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary hover:bg-primary/20 transition-all flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" /> Upload Custom
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-4 aspect-[1.91/1] rounded-xl overflow-hidden border border-slate-200 bg-slate-200 relative group">
                    {localOgImagePreview || ogImage ? (
                      <>
                        <img
                          src={localOgImagePreview || ogImage}
                          alt="OG Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setOgImage("");
                            setPendingOgImageFile(null);
                            if (localOgImagePreview) URL.revokeObjectURL(localOgImagePreview);
                            setLocalOgImagePreview("");
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div
                        onClick={() => ogFileInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-primary cursor-pointer hover:bg-primary/5 transition-all text-center p-2"
                      >
                        <Upload className="w-4 h-4 mb-1" />
                        <span className="text-[10px] font-bold">Click to upload</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-8 space-y-1.5">
                    <input
                      type="url"
                      value={ogImage}
                      onChange={(e) => {
                        setOgImage(e.target.value);
                        setPendingOgImageFile(null);
                        setLocalOgImagePreview("");
                      }}
                      placeholder="Or paste direct image URL (https://.../og.png)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:text-slate-300"
                    />
                    <p className="text-[10px] text-slate-400">
                      If left empty, social networks automatically fall back to the cover thumbnail.
                    </p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={ogFileInputRef}
                  onChange={handleOgFileSelect}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />
              </div>

              {/* ── Meta Keywords (Tags) ── */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Meta Keywords ({metaKeywords.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Press Enter or comma to add</span>
                </label>

                <div className="flex gap-2">
                  <input
                    value={metaKeywordInput}
                    onChange={(e) => setMetaKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    placeholder="Type keyword and press Enter (e.g. romantic wish, love letter, valentine card)..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Add
                  </button>
                </div>

                {metaKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {metaKeywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(keyword)}
                          className="hover:text-blue-900 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Advanced: Canonical URL & Search Indexing Switch ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <LinkIcon className="w-3 h-3 text-slate-400" /> Canonical URL Override
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="url"
                    value={canonicalUrl}
                    onChange={(e) => setCanonicalUrl(e.target.value)}
                    placeholder="e.g. https://wishformoment.com/en/templates/..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/40 transition-all placeholder:text-slate-300"
                  />
                  <p className="text-[10px] text-slate-400">
                    Leave empty to use automatic canonical URL based on the route.
                  </p>
                </div>

                <div className="flex flex-col justify-between space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Search Engine Indexing</h4>
                      <p className="text-[10px] text-slate-400">
                        {noindex
                          ? "Search engines are instructed NOT to index (noindex, nofollow)"
                          : "Search engines are allowed to index and rank this page (index, follow)"}
                      </p>
                    </div>
                    <Switch
                      checked={!noindex}
                      onCheckedChange={(checked) => setNoindex(!checked)}
                    />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold">
                    {!noindex ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Indexed by Google & Bing
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1">
                        <EyeOff className="w-3 h-3" /> Hidden with noindex
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Template Assets (Dynamic Backgrounds, Audio & Media in Database) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-800">Template Assets</h2>
                      <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50/50 text-indigo-700 border-indigo-200">
                        {dynamicAssets.length} {dynamicAssets.length === 1 ? "Asset" : "Assets"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Dynamically manage background graphics, music, overlays, and decorative assets stored directly in the database.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddAsset()}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm hover:shadow transition-all active:scale-[0.98]"
                >
                  <Plus className="w-4 h-4" />
                  Add Asset
                </button>
              </div>

              {/* Quick Preset Suggestions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Quick Add Common Asset Keys:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">click to add</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "engagement_invitation_bg",
                    "first_section_bg_overlay",
                    "second_screen_bg",
                    "screen2_rose_frame",
                    "our_memories_bg",
                    "officially_bg",
                    "proposal_ring_screen",
                    "left_door",
                    "right_door",
                    "story_right_frame",
                    "story_middle_frame",
                    "reveal_button",
                    "story_background",
                    "gift_box_closed",
                    "gift_box_open",
                    "gift_podium",
                    "open_gift",
                    "pink_heart",
                    "yellow_star",
                    "background_music",
                  ].map((preset) => {
                    const alreadyExists = dynamicAssets.some((a) => a.key === preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddAsset(preset)}
                        disabled={alreadyExists}
                        className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                          alreadyExists
                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            : "bg-white text-slate-700 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30"
                        }`}
                      >
                        {alreadyExists ? `✓ ${preset}` : `+ ${preset}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Empty State */}
              {dynamicAssets.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                    <Image className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">No Template Assets Added Yet</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      Add custom background images, audio tracks, or decorative overlays. All assets are saved dynamically to this template's database record.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddAsset()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add First Asset
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {dynamicAssets.map((asset, index) => {
                    const displayUrl = asset.localPreview || asset.url;
                    const isAudio =
                      asset.key.toLowerCase().includes("music") ||
                      asset.key.toLowerCase().includes("audio") ||
                      displayUrl.endsWith(".mp3") ||
                      displayUrl.endsWith(".wav") ||
                      displayUrl.endsWith(".ogg") ||
                      (asset.pendingFile && asset.pendingFile.type.startsWith("audio/"));
                    const isDuplicate =
                      Boolean(asset.key.trim()) &&
                      dynamicAssets.filter((a) => a.key.trim() === asset.key.trim()).length > 1;

                    return (
                      <div
                        key={asset.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 bg-white ${
                          isDuplicate
                            ? "border-rose-300 ring-2 ring-rose-100"
                            : "border-slate-200 shadow-xs hover:border-slate-300"
                        }`}
                      >
                        {/* Top: Asset Key & Action Tools */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 font-mono">
                              #{index + 1}
                            </span>
                            <div className="flex-1 flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                                Asset Key:
                              </span>
                              <input
                                type="text"
                                value={asset.key}
                                onChange={(e) => handleUpdateAssetKey(asset.id, e.target.value)}
                                placeholder="e.g. engagement_invitation_bg"
                                className={`flex-1 min-w-[140px] px-2.5 py-1.5 rounded-lg border text-xs font-mono outline-none transition-all ${
                                  isDuplicate
                                    ? "border-rose-400 bg-rose-50/50 text-rose-800 focus:ring-2 focus:ring-rose-200"
                                    : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {asset.key.trim() && (
                              <button
                                type="button"
                                onClick={() => handleCopyKeyCode(asset.key)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all"
                                title="Copy React prop expression"
                              >
                                {copiedAssetKey === asset.key ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>templateAssets.{asset.key}</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveAsset(asset.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              title="Delete this asset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {isDuplicate && (
                          <p className="text-[10px] font-semibold text-rose-600">
                            Warning: Key "{asset.key}" is used more than once. Keys must be unique!
                          </p>
                        )}

                        {/* Content: Preview + Upload/URL Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                          {/* Preview Thumbnail Box */}
                          <div className="sm:col-span-4 rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden min-h-[90px] flex items-center justify-center p-1.5 relative">
                            {displayUrl ? (
                              isValidWebUrl(displayUrl) ? (
                                isAudio ? (
                                  <div className="flex flex-col items-center justify-center p-2 text-center w-full">
                                    <Music className="w-6 h-6 text-indigo-500 mb-1" />
                                    <span className="text-[10px] font-bold text-slate-700 truncate max-w-full">
                                      Audio Track
                                    </span>
                                    <audio
                                      src={displayUrl}
                                      controls
                                      className="w-full h-7 mt-1.5"
                                    />
                                  </div>
                                ) : (
                                  <img
                                    src={displayUrl}
                                    alt={asset.key || "Asset preview"}
                                    className="w-full max-h-24 object-contain rounded-lg bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#fff_0%_50%)] bg-[length:12px_12px]"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = "none";
                                    }}
                                  />
                                )
                              ) : (
                                <div className="flex flex-col items-center justify-center p-2 text-center text-amber-700 bg-amber-50/70 rounded-lg w-full">
                                  <AlertCircle className="w-5 h-5 mb-1 text-amber-500" />
                                  <span className="text-[10px] font-bold">Local File Path</span>
                                  <span className="text-[9px] font-mono truncate max-w-full text-amber-800" title={displayUrl}>
                                    {displayUrl}
                                  </span>
                                  <span className="text-[9px] text-amber-600 mt-0.5">Upload to S3 to host on CDN</span>
                                </div>
                              )
                            ) : (
                              <div className="flex flex-col items-center justify-center text-slate-400 p-3 text-center">
                                <Image className="w-5 h-5 mb-1 text-slate-300" />
                                <span className="text-[10px]">No asset selected</span>
                              </div>
                            )}
                          </div>

                          {/* Controls (File Upload & CDN URL Input) */}
                          <div className="sm:col-span-8 space-y-2.5">
                            <input
                              ref={(el) => {
                                assetFileInputRefs.current[asset.id] = el;
                              }}
                              type="file"
                              accept="image/*,audio/*,video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleAssetFileSelect(asset.id, file);
                                e.target.value = "";
                              }}
                            />

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={uploadingAssetId === asset.id}
                                onClick={() => assetFileInputRefs.current[asset.id]?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700 shadow-2xs transition-all shrink-0 disabled:opacity-50"
                              >
                                {uploadingAssetId === asset.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Uploading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>{isValidWebUrl(asset.url) ? "Replace in S3" : "Upload to S3"}</span>
                                  </>
                                )}
                              </button>

                              <div className="relative flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={uploadingAssetId === asset.id ? "Uploading to S3..." : asset.url}
                                  readOnly={uploadingAssetId === asset.id}
                                  onChange={(e) => handleUpdateAssetUrl(asset.id, e.target.value)}
                                  placeholder="Or paste direct CDN URL (https://...)"
                                  className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                />
                                {isValidWebUrl(asset.url) && (
                                  <a
                                    href={asset.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                    title="Open link in new tab"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Status label */}
                            <div className="flex items-center justify-between text-[10px]">
                              {uploadingAssetId === asset.id ? (
                                <span className="text-indigo-600 font-semibold flex items-center gap-1">
                                  <RefreshCw className="w-3 h-3 animate-spin shrink-0" /> Uploading directly to AWS S3 bucket...
                                </span>
                              ) : isValidWebUrl(asset.url) ? (
                                <span className="text-emerald-600 font-medium flex items-center gap-1 truncate max-w-[360px]" title={asset.url}>
                                  <Check className="w-3 h-3 shrink-0" /> CDN: {asset.url}
                                </span>
                              ) : asset.url ? (
                                <span className="text-amber-600 font-medium flex items-center gap-1 truncate max-w-[360px]" title={asset.url}>
                                  <AlertCircle className="w-3 h-3 shrink-0" /> Local: {asset.url} (click "Upload to S3")
                                </span>
                              ) : (
                                <span className="text-slate-400">
                                  Upload a media file (Image, Audio, Video) or enter a hosted URL.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                  accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
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
                      accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
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
