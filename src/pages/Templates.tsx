import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Plus, Search, Crown, Edit2, Trash2, Layout, Box, Sparkles, Zap, Globe
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Template {
  id: string;
  name: string;
  template_name: string;
  description: string;
  type: "free" | "premium";
  component_key: string;
  thumbnail_url: string;
  form_fields: any[];
  category_id?: string;
  category_name?: string;
  sub_category_id?: string;
  sub_category_name?: string;
  category_ids?: string[];
  sub_category_ids?: string[];
  categories?: { id: string; name: string; slug: string }[];
  sub_categories?: { id: string; name: string; slug: string; category_id: string }[];
  is_active: boolean;
  tags: string[];
  preview_images: string[];
  preview_video_url?: string | null;
  price?: number;
  prices?: Record<string, number>;
  featured_position?: number | null;
  admin_boost?: number;
  meta_title?: string | null;
  meta_description?: string | null;
  og_image?: string | null;
  meta_keywords?: string[];
  canonical_url?: string | null;
  noindex?: boolean;
}

interface TemplatesResponse {
  rows: Template[];
  total: number;
}

const Templates = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "free" | "premium">("all");

  const { data, isLoading } = useQuery<TemplatesResponse>({
    queryKey: ["adminTemplates", search],
    queryFn: () => fetchApi(`/templates?search=${encodeURIComponent(search)}`),
  });

  const templates = data?.rows || [];

  const filtered = templates.filter((t) => {
    const matchesType = filterType === "all" || t.type === filterType;
    return matchesType;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => fetchApi(`/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      toast.success("Template deleted successfully");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      fetchApi(`/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTemplates"] });
      toast.success("Template updated successfully");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update template"),
  });

  const deleteTemplate = (id: string) => {
    if (window.confirm("Are you sure you want to delete this design template? This action cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleTemplateActive = (template: Template) => {
    updateMutation.mutate({
      id: template.id,
      payload: { isActive: !template.is_active },
    });
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shadow-xs">
              <Layout className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">Catalog Control</p>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Wish Templates</h1>
              <p className="text-xs text-slate-500 font-medium">Manage and design your personalized interactive greeting templates</p>
            </div>
          </div>

          <button
            onClick={() => navigate("/templates/new")}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl btn-primary text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" /> Add Design Template
          </button>
        </div>

        {/* Search & Statistics Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates by name, title, or category..."
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all shadow-xs"
            />
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
            {(["all", "free", "premium"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filterType === type ? "bg-primary text-white shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filtered.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`group bg-white rounded-2xl overflow-hidden border border-slate-200 transition-all hover:shadow-xl hover:border-primary/30 flex flex-col ${
                !template.is_active ? "grayscale opacity-60" : ""
              }`}
            >
              {/* Thumbnail */}
              <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                {template.thumbnail_url ? (
                  <img
                    src={template.thumbnail_url}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    alt={template.name}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Sparkles className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    {template.type === "premium" && (
                      <div className="bg-amber-400 text-black px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center w-fit shadow-xs">
                        <Crown className="w-2.5 h-2.5 mr-1" /> Premium
                      </div>
                    )}
                    {template.featured_position && (
                      <div className="bg-purple-600 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center w-fit shadow-xs">
                        <Sparkles className="w-2.5 h-2.5 mr-1" /> Pin #{template.featured_position}
                      </div>
                    )}
                    {template.admin_boost > 0 && !template.featured_position && (
                      <div className="bg-indigo-600 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center w-fit shadow-xs">
                        <Zap className="w-2.5 h-2.5 mr-1" /> +{template.admin_boost} Boost
                      </div>
                    )}
                    <div className="bg-slate-900/70 text-white backdrop-blur-xs px-2 py-0.5 rounded-md text-[8px] font-bold uppercase w-fit">
                      {template.sub_categories && template.sub_categories.length > 1
                        ? `${template.sub_categories[0].name} +${template.sub_categories.length - 1}`
                        : template.sub_category_name || "Misc"}
                    </div>
                    {template.meta_title ? (
                      <div className="bg-emerald-600 text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center w-fit shadow-xs">
                        <Globe className="w-2.5 h-2.5 mr-1" /> SEO Ready
                      </div>
                    ) : (
                      <div className="bg-slate-900/60 text-slate-300 backdrop-blur-xs px-2 py-0.5 rounded-md text-[8px] font-medium flex items-center w-fit">
                        <Globe className="w-2.5 h-2.5 mr-1 opacity-70" /> Default SEO
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <button
                    onClick={() => navigate(`/templates/edit/${template.id}`)}
                    className="p-2.5 rounded-xl bg-white shadow-lg text-slate-800 hover:bg-primary hover:text-white transition-all scale-90 group-hover:scale-100 cursor-pointer"
                    title="Edit Template"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="p-2.5 rounded-xl bg-white shadow-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all scale-90 group-hover:scale-100 cursor-pointer"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold text-slate-800 truncate leading-tight mb-0.5">
                        {template.template_name || template.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{template.name}</p>
                    </div>
                    <Switch
                      className="scale-75 origin-right"
                      checked={template.is_active}
                      onCheckedChange={() => toggleTemplateActive(template)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {(template.tags || []).slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[8px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold border border-slate-200/60 truncate"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags?.length > 2 && (
                        <span className="text-[8px] text-slate-300 font-semibold">+{template.tags.length - 2}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {template.type === "free" ? (
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                        Free
                      </span>
                    ) : template.price && template.price > 0 ? (
                      <span className="text-[9px] font-black text-purple-700 uppercase bg-purple-50 px-1.5 py-0.5 rounded-md border border-purple-200">
                        ₹{(template.price / 100).toLocaleString("en-IN")}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                        No Price
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && !isLoading && (
          <div className="min-h-[350px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-white">
            <Box className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-base font-bold text-slate-700">No Templates Found</h3>
            <p className="text-xs text-slate-400 text-center max-w-sm mt-1 mb-5">
              {search
                ? `No templates matching "${search}". Try clearing your search.`
                : "Create and publish your first wish template to populate your marketplace."}
            </p>
            <button
              onClick={() => navigate("/templates/new")}
              className="px-5 py-2.5 rounded-xl btn-primary text-white font-bold text-xs shadow-md"
            >
              + Create Template
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Templates;
