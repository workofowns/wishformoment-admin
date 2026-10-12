import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, uploadMedia } from "@/lib/api";
import { 
  Search, Trash2, Image as ImageIcon, 
  ExternalLink, Database, HardDrive,
  RefreshCw, X, Check, Download as DownloadIcon,
  Upload as UploadIcon, Plus, FolderPlus, Folder, ChevronDown,
  Music, FileAudio
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface MediaObject {
  key: string;
  url: string;
  size: number;
  lastModified: string;
}

const S3ImageManager = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for Filters
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [sizeFilter, setSizeFilter] = useState<"all" | "small" | "medium" | "large">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "size_desc" | "size_asc">("date_desc");

  // State for Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFolder, setUploadFolder] = useState("templates");
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { data: objects, isLoading } = useQuery<MediaObject[]>({
    queryKey: ["media", selectedFolder],
    queryFn: () => fetchApi(`/media?folder=${selectedFolder === "all" ? "" : selectedFolder}`),
  });

  const { data: dynamicFolders } = useQuery<string[]>({
    queryKey: ["mediaFolders"],
    queryFn: () => fetchApi("/media/folders"),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: string }) => {
      return uploadMedia(file, folder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["mediaFolders"] });
      toast.success("Image uploaded successfully");
      setIsUploadModalOpen(false);
      resetUploadForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Upload failed");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => fetchApi(`/media?key=${encodeURIComponent(key)}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success("Image deleted from S3");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete image")
  });

  const handleDelete = (key: string) => {
    if (window.confirm("Are you sure you want to delete this image? This will delete it permanently from AWS S3.")) {
      deleteMutation.mutate(key);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setNewFolderName("");
    setIsCreatingNewFolder(false);
  };

  const handleUpload = () => {
    if (!uploadFile) return toast.error("Please select a file");
    const finalFolder = isCreatingNewFolder ? newFolderName.trim() : uploadFolder;
    if (!finalFolder) return toast.error("Please specify a folder");
    
    uploadMutation.mutate({ file: uploadFile, folder: finalFolder.toLowerCase().replace(/[^a-z0-9-/]/g, '-') });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const folders = [
    { id: "all", label: "All Assets" },
    ...(dynamicFolders || []).map(f => ({ id: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))
  ];

  const filtered = (objects || [])
    .filter(obj => {
      const matchesSearch = obj.key.toLowerCase().includes(search.toLowerCase());
      
      let matchesSize = true;
      if (sizeFilter === "small") matchesSize = obj.size < 102400; // < 100KB
      if (sizeFilter === "medium") matchesSize = obj.size >= 102400 && obj.size < 1048576; // 100KB - 1MB
      if (sizeFilter === "large") matchesSize = obj.size >= 1048576; // > 1MB
      
      return matchesSearch && matchesSize;
    })
    .sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      if (sortBy === "date_asc") return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
      if (sortBy === "size_desc") return b.size - a.size;
      if (sortBy === "size_asc") return a.size - b.size;
      return 0;
    });

  const totalSize = (objects || []).reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="space-y-8">
      {/* Mini Stats & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-white/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg">
                <Database className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Images</p>
                <p className="text-sm font-black text-slate-900 leading-none">{objects?.length || 0}</p>
              </div>
            </div>
            
            <div className="bg-white/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <HardDrive className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Image Storage</p>
                <p className="text-sm font-black text-slate-900 leading-none">{formatSize(totalSize)}</p>
              </div>
            </div>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2.5 px-8 py-3.5 rounded-[1.25rem] bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
        >
          <UploadIcon className="w-4 h-4" /> Upload to Vault
        </button>
      </div>

      {/* Toolbar: Search + Advanced Filters */}
      <div className="space-y-5 bg-white/40 p-6 rounded-[2.5rem] border border-white shadow-md">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search images..."
              className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/80 border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
            />
          </div>
          
          <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 overflow-x-auto whitespace-nowrap no-scrollbar max-w-full">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedFolder === folder.id 
                  ? "bg-white text-primary shadow-sm border border-slate-200/50" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}
              >
                {folder.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Weight:</span>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {[
                  { id: "all", label: "All" },
                  { id: "small", label: "<100KB" },
                  { id: "medium", label: "100KB-1MB" },
                  { id: "large", label: ">1MB" }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setSizeFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${sizeFilter === f.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-4 w-[1px] bg-slate-200" />

            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sort By:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[10px] font-black text-slate-600 uppercase tracking-widest outline-none cursor-pointer"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="size_desc">Largest First</option>
                <option value="size_asc">Smallest First</option>
              </select>
            </div>
          </div>

          <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">
            Showing {filtered.length} of {objects?.length || 0} Assets
          </p>
        </div>
      </div>

      {isLoading ? (
         <div className="min-h-[400px] flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-primary/5 border-t-primary animate-spin" />
              <div className="absolute inset-0 m-auto w-10 h-10 rounded-full border border-primary/10 border-b-primary animate-spin-slow" />
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing S3 Vault</p>
              <p className="text-[9px] text-slate-300 font-bold uppercase mt-1">Fetching image inventory...</p>
            </div>
         </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-8">
          {filtered.map((obj, i) => (
            <div key={obj.key} className="group flex flex-col transition-all duration-500 hover:-translate-y-2">
              <div className="aspect-[4/5] relative bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm group-hover:shadow-2xl group-hover:border-primary/20 transition-all duration-500">
                 {obj.key.match(/\.(mp3|wav|ogg|m4a|aac)$/i) ? (
                   <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center group-hover:from-primary/5 group-hover:to-primary/10 transition-colors duration-500">
                      <div className="relative">
                        <Music className="w-16 h-16 text-slate-200 group-hover:text-primary/20 transition-all duration-500 group-hover:scale-110" />
                        <FileAudio className="absolute -bottom-2 -right-2 w-8 h-8 text-slate-100 group-hover:text-primary/10 transition-colors" />
                      </div>
                   </div>
                 ) : (
                   <img src={obj.url} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt="" />
                 )}

                 
                 {/* Overlay: Actions */}
                 <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-[3px] flex items-center justify-center gap-3">
                    <a href={obj.url} target="_blank" rel="noreferrer" className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-900 transition-all hover:scale-110 hover:bg-primary hover:text-white shadow-2xl">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                    <button 
                      onClick={() => handleDelete(obj.key)}
                      className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-rose-500 transition-all hover:scale-110 hover:bg-rose-500 hover:text-white shadow-2xl"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                 </div>

                 {/* Tags / Metadata on top */}
                 <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                    <div className="px-2.5 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[8px] font-black text-slate-800 uppercase tracking-widest shadow-sm border border-white">
                      {obj.key.split('/')[0]}
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm border border-white opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <DownloadIcon className="w-3.5 h-3.5 text-slate-600 cursor-pointer" onClick={() => window.open(obj.url)} />
                    </div>
                 </div>

                 {/* Size badge bottom right */}
                 <div className="absolute bottom-5 right-5">
                    <div className="px-2.5 py-1.5 bg-slate-900/80 backdrop-blur-md rounded-xl text-[8px] font-black text-white uppercase tracking-widest border border-white/10">
                      {formatSize(obj.size)}
                    </div>
                 </div>
              </div>

              <div className="mt-4 px-2 space-y-1">
                 <p className="text-[11px] font-black text-slate-800 line-clamp-1 group-hover:text-primary transition-colors" title={obj.key}>
                    {obj.key.split('/').pop()}
                 </p>
                 <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>{format(new Date(obj.lastModified), "MMM dd, yyyy")}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    <span>{obj.key.split('.').pop()?.toUpperCase()}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="min-h-[500px] flex flex-col items-center justify-center p-12 bg-white/30 rounded-[4rem] border-4 border-dashed border-white shadow-inner">
           <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mb-8 shadow-xl shadow-slate-200/50">
             <ImageIcon className="w-10 h-10 text-slate-200" />
           </div>
           <h3 className="text-3xl font-black text-slate-800 uppercase tracking-[0.2em] mb-2">Vault Empty</h3>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-sm text-center leading-relaxed">No cloud images found matching your current filter criteria.</p>
           <button 
             onClick={() => { setSearch(""); setSizeFilter("all"); setSelectedFolder("all"); }}
             className="mt-10 px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
           >
             Clear Filters
           </button>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !uploadMutation.isPending && setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <UploadIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Upload Asset</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">S3 Cloud Provisioning</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* File Selection */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative aspect-video rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${uploadFile ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'}`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.svg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) {
                          setUploadFile(null);
                          return;
                        }
                        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
                        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
                        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
                        if (!allowedExts.includes(ext) && !allowedMimes.includes(file.type.toLowerCase())) {
                          toast.error("Please upload an image in JPG, PNG, WEBP, GIF, or SVG format.");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                          return;
                        }
                        setUploadFile(file);
                      }}
                    />
                    {uploadFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-lg">
                          <img src={URL.createObjectURL(uploadFile)} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">{uploadFile.name}</p>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                          className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                        >
                          Change File
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                          <Plus className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold text-slate-500">Click to browse or drag & drop</p>
                        <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-widest">PNG, JPG, WEBP up to 10MB</p>
                      </>
                    )}
                  </div>

                  {/* Destination Control */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Folder className="w-3 h-3" /> Target Path
                      </label>
                      <button 
                        onClick={() => setIsCreatingNewFolder(!isCreatingNewFolder)}
                        className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                      >
                        {isCreatingNewFolder ? <Check className="w-3 h-3" /> : <FolderPlus className="w-3 h-3" />}
                        {isCreatingNewFolder ? "Select Existing" : "Create New Path"}
                      </button>
                    </div>

                    {isCreatingNewFolder ? (
                      <div className="relative animate-in slide-in-from-top-2 duration-300">
                        <input 
                          autoFocus
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          placeholder="Enter new path name (e.g. holiday-campaign)"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          value={uploadFolder}
                          onChange={(e) => setUploadFolder(e.target.value)}
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all appearance-none cursor-pointer"
                        >
                          {["templates", "categories", "sub-categories", "wishes", "users/profiles", "users/covers", "music-thumbnails", ...(dynamicFolders || [])].map(folder => (
                            <option key={folder} value={folder}>{folder}</option>
                          ))}

                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <button 
                    disabled={uploadMutation.isPending}
                    onClick={() => setIsUploadModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={uploadMutation.isPending || !uploadFile}
                    onClick={handleUpload}
                    className="flex-[2] py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-2"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Provisioning...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Finalize Upload
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default S3ImageManager;
