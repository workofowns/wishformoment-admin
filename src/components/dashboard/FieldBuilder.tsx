import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Plus, Trash2, GripVertical, Check, X, Layers, Settings2, Upload, Database, FolderPlus, Search, ChevronDown, Music as MusicIcon } from "lucide-react";
import MediaSelector from "./MediaSelector";
import MusicSelector from "./MusicSelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "select" | "image" | "music";
  placeholder: string;
  defaultValue?: string;
  _files?: File[]; // plural storage for pending default image uploads
  required: boolean;
  options?: string[];
  multiple?: boolean;
  searchable?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  description?: string;
  s3Folder?: string;
  maxLength?: number;
  musicCategories?: string[];
}

interface FieldBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

const fieldTypes = ["text", "textarea", "date", "select", "image", "music"] as const;

const FieldBuilder = ({ fields, onChange }: FieldBuilderProps) => {
  const [addingOption, setAddingOption] = useState<number | null>(null);
  const [newOption, setNewOption] = useState("");
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState<number | null>(null);
  const [musicSelectorOpen, setMusicSelectorOpen] = useState<number | null>(null);
  const [localFolders, setLocalFolders] = useState<string[]>([]);

  const { data: dynamicFolders } = useQuery<string[]>({
    queryKey: ["adminMediaFolders"],
    queryFn: () => fetchApi("/media/folders"),
  });

  const allFolders = Array.from(new Set([
    ...(dynamicFolders || []),
    ...localFolders
  ]));

  const { data: musicCatsData } = useQuery<{ success: boolean; categories: string[] }>({
    queryKey: ["adminMusicCategories"],
    queryFn: () => fetchApi("/music/categories"),
  });
  const allMusicCategories = musicCatsData?.categories || [];

  const addField = () => {
    onChange([...fields, {
      name: `field_${Date.now()}`,
      label: "",
      type: "text",
      placeholder: "placeholder",
      required: true,
    }]);
  };

  const updateField = (index: number, update: Partial<FormField>) => {
    onChange(fields.map((f, i) => i === index ? { ...f, ...update } : f));
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const addOption = (fieldIndex: number) => {
    if (!newOption.trim()) return;
    const field = fields[fieldIndex];
    updateField(fieldIndex, { options: [...(field.options || []), newOption.trim()] });
    setNewOption("");
    setAddingOption(null);
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const field = fields[fieldIndex];
    updateField(fieldIndex, { options: field.options?.filter((_, i) => i !== optIndex) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Field Slots</p>
        </div>
        <button
          type="button"
          onClick={addField}
          className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:opacity-80 transition-all uppercase tracking-wider bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 shadow-2xs"
        >
          <Plus className="w-3 h-3" /> Add Slot
        </button>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {fields.map((field, i) => (
            <motion.div
              key={`${field.name}-${i}`}
              layout
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs group hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-2.5">
                <div className="pt-2 shrink-0">
                  <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 w-full">
                    {/* Label */}
                    <div className="w-36 sm:w-44 shrink-0">
                      <input
                        value={field.label}
                        onChange={e => updateField(i, { label: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs placeholder:font-normal placeholder:text-slate-400"
                        placeholder="Label"
                      />
                    </div>

                    {/* Key Name */}
                    <div className="w-28 sm:w-36 shrink-0">
                      <input
                        value={field.name}
                        onChange={e => updateField(i, { name: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-700 outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                        placeholder="variable_key"
                      />
                    </div>

                    {/* Type Select */}
                    <div className="w-28 shrink-0">
                      <select
                        value={field.type}
                        onChange={e => {
                          const newType = e.target.value as FormField["type"];
                          const update: Partial<FormField> = { type: newType };
                          if (newType === "date" && !field.defaultValue) {
                            update.defaultValue = new Date().toISOString().split('T')[0];
                          }
                          updateField(i, update);
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-slate-300 text-[11px] font-bold uppercase text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all"
                      >
                        {fieldTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Text/Date/Select inline fields (placeholder, default value, max length) */}
                    {field.type !== "image" && field.type !== "music" && (
                      <div className="flex flex-wrap sm:flex-nowrap gap-2 flex-1 min-w-[200px]">
                        <div className="flex-1 min-w-[100px]">
                          <input
                            value={field.placeholder}
                            onChange={e => updateField(i, { placeholder: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                            placeholder="Placeholder"
                          />
                        </div>
                        <div className="flex-1 min-w-[100px]">
                          <input
                            value={field.defaultValue || ""}
                            onChange={e => updateField(i, { defaultValue: e.target.value })}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-300 text-xs font-semibold text-emerald-900 outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-emerald-500/70"
                            placeholder="Default Value"
                          />
                        </div>
                        {(field.type === "text" || field.type === "textarea") && (
                          <div className="w-20 shrink-0">
                            <input
                              type="number"
                              value={field.maxLength || ""}
                              onChange={e => updateField(i, { maxLength: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full px-2 py-1.5 rounded-lg bg-amber-50/70 border border-amber-300 text-xs font-semibold text-amber-900 outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder:text-amber-500/70"
                              placeholder="Max L."
                              title="Maximum Characters"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Image type specific settings: spans full width cleanly */}
                  {field.type === "image" && (
                    <div className="w-full mt-3 pt-3 border-t border-slate-200/80 space-y-3">
                      <div className="flex flex-wrap items-center gap-4 p-2.5 bg-slate-50/90 rounded-xl border border-slate-200">
                        <label className="flex items-center cursor-pointer group/req">
                          <input
                            type="checkbox"
                            checked={field.multiple}
                            onChange={e => updateField(i, { multiple: e.target.checked })}
                            className="hidden"
                          />
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${field.multiple ? 'bg-primary text-white shadow-xs' : 'bg-white text-slate-300 border border-slate-300 hover:border-slate-400'}`}>
                            <Check className={`w-3.5 h-3.5 transition-transform ${field.multiple ? 'scale-100' : 'scale-0'}`} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight ml-2">Multiple Images</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight whitespace-nowrap">Max Size</span>
                          <input
                            type="number"
                            value={field.maxSizeMB || ''}
                            onChange={e => updateField(i, { maxSizeMB: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-16 px-2 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-primary transition-all text-center"
                          />
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">MB</span>
                        </div>

                        {field.multiple && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight whitespace-nowrap">Max Count</span>
                            <input
                              type="number"
                              value={field.maxFiles || ''}
                              onChange={e => updateField(i, { maxFiles: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-16 px-2 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-primary transition-all text-center"
                              placeholder="∞"
                            />
                          </div>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Description (Instructions for user e.g. Upload high quality photo)"
                        value={field.description || ''}
                        onChange={e => updateField(i, { description: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 outline-none focus:border-primary transition-all placeholder:text-slate-400"
                      />

                      <div className="space-y-3 pt-1">
                        {/* S3 Storage Path Control */}
                        <div className="flex flex-col md:flex-row md:items-end gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                          <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                              <Database className="w-3.5 h-3.5 text-primary" /> Storage Vault Path
                            </label>
                            <div className="relative group">
                              <Select 
                                value={field.s3Folder || "templates"} 
                                onValueChange={v => updateField(i, { s3Folder: v })}
                              >
                                <SelectTrigger className="w-full h-9 px-3 rounded-lg bg-white border-slate-300 text-xs font-bold text-slate-800 outline-none">
                                  <SelectValue placeholder="Select folder" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                  {allFolders.map(folder => (
                                    <SelectItem key={folder} value={folder} className="text-xs font-semibold uppercase tracking-wider">
                                      {folder}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const newFolder = window.prompt("Enter new folder name (e.g. promotional-campaigns):");
                                if (newFolder) {
                                  const formatted = newFolder.toLowerCase().replace(/[^a-z0-9-/]/g, '-');
                                  setLocalFolders(prev => [...prev, formatted]);
                                  updateField(i, { s3Folder: formatted });
                                }
                              }}
                              className="p-2 rounded-lg bg-white border border-slate-300 text-slate-600 hover:text-primary hover:border-primary transition-all shadow-2xs"
                              title="Create New Folder"
                            >
                              <FolderPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Default Images {field.multiple && '(Multiple)'}</label>
                            <div className="flex gap-2">
                               <button 
                                 type="button"
                                 onClick={() => setMediaSelectorOpen(i)}
                                 className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:text-primary transition-colors bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs"
                               >
                                 <Search className="w-3 h-3 text-primary" /> Browse Vault
                               </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {/* Existing/New Previews */}
                            {(field.multiple ? (field.defaultValue ? (field.defaultValue.startsWith('[') ? JSON.parse(field.defaultValue) : [field.defaultValue]) : []) : (field.defaultValue ? [field.defaultValue] : [])).map((url: string, idx: number) => (
                              <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-300 group/img">
                                <img src={url} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (field.multiple) {
                                      const urls = field.defaultValue?.startsWith('[') ? JSON.parse(field.defaultValue) : [field.defaultValue];
                                      const newUrls = urls.filter((_: any, i: number) => i !== idx);
                                      // Also remove corresponding file if it exists
                                      const newFiles = field._files?.filter((_: any, i: number) => i !== idx);
                                      updateField(i, { 
                                        defaultValue: newUrls.length > 0 ? JSON.stringify(newUrls) : "",
                                        _files: newFiles
                                      });
                                    } else {
                                      updateField(i, { defaultValue: "", _files: [] });
                                    }
                                  }}
                                  className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity shadow-xs"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}

                            {/* Add Button */}
                            {(!field.defaultValue || field.multiple) && (
                              <div
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.multiple = !!field.multiple;
                                  input.onchange = (e: any) => {
                                    const files = Array.from(e.target.files || []) as File[];
                                    if (files.length > 0) {
                                      const newPreviews = files.map(f => URL.createObjectURL(f));
                                      if (field.multiple) {
                                        const existingUrls = field.defaultValue?.startsWith('[') ? JSON.parse(field.defaultValue) : (field.defaultValue ? [field.defaultValue] : []);
                                        updateField(i, { 
                                          defaultValue: JSON.stringify([...existingUrls, ...newPreviews]), 
                                          _files: [...(field._files || []), ...files] 
                                        });
                                      } else {
                                        updateField(i, { defaultValue: newPreviews[0], _files: [files[0]] });
                                      }
                                    }
                                  };
                                  input.click();
                                }}
                                className="w-20 h-20 cursor-pointer rounded-lg border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-primary shadow-2xs"
                              >
                                <Upload className="w-5 h-5 mb-1" />
                                <span className="text-[9px] font-bold uppercase">Upload</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Media Selector Modal Integration */}
                        <MediaSelector 
                          isOpen={mediaSelectorOpen === i}
                          onClose={() => setMediaSelectorOpen(null)}
                          onSelect={(url) => {
                            if (field.multiple) {
                              const existingUrls = field.defaultValue?.startsWith('[') ? JSON.parse(field.defaultValue) : (field.defaultValue ? [field.defaultValue] : []);
                              if (!existingUrls.includes(url)) {
                                updateField(i, { 
                                  defaultValue: JSON.stringify([...existingUrls, url])
                                });
                              }
                            } else {
                              updateField(i, { defaultValue: url, _files: [] });
                            }
                            setMediaSelectorOpen(null);
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Music type specific settings: spans full width cleanly */}
                  {field.type === "music" && (
                    <div className="w-full mt-3 pt-3 border-t border-slate-200/80 space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        {/* Default Music Selection */}
                        <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Default Music</label>
                          <div className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-200 shrink-0">
                              <MusicIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate" title={field.defaultValue}>
                                {field.defaultValue
                                  ? (field.defaultValue.startsWith("http://") || field.defaultValue.startsWith("https://")
                                      ? decodeURIComponent(field.defaultValue.split("/").pop()?.split("?")[0] || field.defaultValue)
                                      : field.defaultValue)
                                  : "No default selected"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setMusicSelectorOpen(i)}
                                className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:underline"
                              >
                                Browse
                              </button>
                              {field.defaultValue && (
                                <button
                                  type="button"
                                  onClick={() => updateField(i, { defaultValue: "" })}
                                  className="text-[10px] font-bold text-rose-500 uppercase tracking-wider hover:underline"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Category Restrictions */}
                        <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Allowed Categories</label>
                          <div className="flex flex-wrap gap-2">
                            {(field.musicCategories || []).map((cat, ci) => (
                              <div key={ci} className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                                <span className="text-xs font-bold text-indigo-800">{cat}</span>
                                <button 
                                  type="button"
                                  onClick={() => updateField(i, { musicCategories: field.musicCategories?.filter((_, idx) => idx !== ci) })}
                                  className="text-indigo-400 hover:text-rose-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            <div className="relative">
                              <select
                                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer hover:border-primary/40 transition-colors"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val && !(field.musicCategories || []).includes(val)) {
                                    updateField(i, { musicCategories: [...(field.musicCategories || []), val] });
                                  }
                                  e.target.value = "";
                                }}
                                value=""
                              >
                                <option value="" disabled>+ Add Category</option>
                                {allMusicCategories.filter(c => !(field.musicCategories || []).includes(c)).map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Description (Instructions for user)"
                        value={field.description || ''}
                        onChange={e => updateField(i, { description: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-slate-700 outline-none focus:border-primary transition-all placeholder:text-slate-400"
                      />

                      <MusicSelector
                        isOpen={musicSelectorOpen === i}
                        onClose={() => setMusicSelectorOpen(null)}
                        onSelect={(m) => {
                          updateField(i, { defaultValue: m.music_url }); // Store song URL as default
                          setMusicSelectorOpen(null);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Right-side actions: Required & Remove */}
                <div className="flex items-center gap-2 border-l border-slate-200 pl-2 shrink-0 pt-1">
                  <label className="flex items-center cursor-pointer group/req" title={field.required ? "Required slot" : "Optional slot"}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateField(i, { required: e.target.checked })}
                      className="hidden"
                    />
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${field.required ? 'bg-primary text-white shadow-xs' : 'bg-white text-slate-300 border border-slate-300 hover:border-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 transition-transform ${field.required ? 'scale-100' : 'scale-0'}`} />
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => removeField(i)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all active:scale-90"
                    title="Remove slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Select Options - Compact Style */}
              {field.type === "select" && (
                <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 pl-6">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center cursor-pointer group/mult">
                      <input
                        type="checkbox"
                        checked={field.multiple}
                        onChange={e => updateField(i, { multiple: e.target.checked })}
                        className="hidden"
                      />
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${field.multiple ? 'bg-primary text-white shadow-xs' : 'bg-white text-slate-300 border border-slate-300 hover:border-slate-400'}`}>
                        <Check className={`w-3.5 h-3.5 transition-transform ${field.multiple ? 'scale-100' : 'scale-0'}`} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight ml-2">Allow Multiple</span>
                    </label>

                    <label className="flex items-center cursor-pointer group/search">
                      <input
                        type="checkbox"
                        checked={field.searchable}
                        onChange={e => updateField(i, { searchable: e.target.checked })}
                        className="hidden"
                      />
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${field.searchable ? 'bg-indigo-500 text-white shadow-xs' : 'bg-white text-slate-300 border border-slate-300 hover:border-slate-400'}`}>
                        <Search className={`w-3.5 h-3.5 transition-transform ${field.searchable ? 'scale-100' : 'scale-0'}`} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight ml-2">Searchable</span>
                    </label>
                  </div>

                  <div className="flex-1 flex items-center gap-2 flex-wrap justify-end">
                    <div className="flex items-center gap-1 mr-1">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Choices:</span>
                    </div>
                    {field.options?.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300">
                        <span className="text-xs font-bold text-slate-700">{opt}</span>
                        <button type="button" onClick={() => removeOption(i, oi)} className="text-slate-400 hover:text-rose-600">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {addingOption === i ? (
                      <div className="flex items-center gap-1 animate-in zoom-in-95 duration-200">
                        <input
                          value={newOption}
                          onChange={e => setNewOption(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && addOption(i)}
                          className="px-2.5 py-1 bg-white border border-primary/40 rounded-lg text-xs font-bold text-slate-800 outline-none w-28 shadow-2xs"
                          autoFocus
                        />
                        <button type="button" onClick={() => addOption(i)} className="p-1 bg-primary text-white rounded-lg shadow-2xs hover:opacity-90"><Check className="w-3 h-3" /></button>
                        <button type="button" onClick={() => setAddingOption(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingOption(i)}
                        className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tight bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/20"
                      >
                        + Add Option
                      </button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {fields.length === 0 && (
        <div className="py-6 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400">
          <Plus className="w-6 h-6 mb-2 opacity-60" />
          <p className="text-[11px] font-bold uppercase tracking-wider">No Inputs Defined</p>
        </div>
      )}
    </div>
  );
};

export default FieldBuilder;
