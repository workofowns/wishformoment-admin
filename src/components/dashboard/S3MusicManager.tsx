import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi, API_BASE } from "@/lib/api";
import { 
  Search, Trash2, Music, 
  ExternalLink, Database, HardDrive,
  RefreshCw, X, Check, Download as DownloadIcon,
  Upload as UploadIcon, Plus, FolderPlus, Folder, ChevronDown,
  Clock, FileAudio, Play, Pause,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface MusicObject {
  id: number;
  name: string;
  music_url: string;
  thumbnail_url: string | null;
  size: number;
  duration: number;
  category: string;
  created_at: string;
}

const S3MusicManager = () => {
  const queryClient = useQueryClient();
  const musicInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // State for Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "name_asc" | "duration_desc">("date_desc");
  const [playingId, setPlayingId] = useState<number | null>(null);

  // State for Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadThumb, setUploadThumb] = useState<File | null>(null);
  const [customName, setCustomName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Queries
  const { data: musicData, isLoading } = useQuery<{ success: boolean; music: MusicObject[] }>({
    queryKey: ["music"],
    queryFn: () => fetchApi("/music"),
  });

  const { data: categoriesData } = useQuery<{ success: boolean; categories: string[] }>({
    queryKey: ["musicCategories"],
    queryFn: () => fetchApi("/music/categories"),
  });

  const musicList = musicData?.music || [];
  const categories = categoriesData?.categories || [];

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE}/admin/music`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || errorData.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["music"] });
      queryClient.invalidateQueries({ queryKey: ["musicCategories"] });
      toast.success("Music uploaded successfully");
      setIsUploadModalOpen(false);
      resetUploadForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Upload failed");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetchApi(`/music/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["music"] });
      toast.success("Music deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete music")
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this music?")) {
      deleteMutation.mutate(id);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadThumb(null);
    setCustomName("");
    setNewCategoryName("");
    setUploadCategory("");
    setIsCreatingNewCategory(false);
  };

  const handleUpload = () => {
    if (!uploadFile) return toast.error("Please select a music file");
    
    const finalCategory = isCreatingNewCategory ? newCategoryName.trim() : uploadCategory;
    if (!finalCategory && !isCreatingNewCategory && categories.length > 0) {
        // if not creating new and nothing selected, but categories exist, maybe use first one or require selection
    }

    const formData = new FormData();
    formData.append("music", uploadFile);
    if (uploadThumb) formData.append("thumbnail", uploadThumb);
    formData.append("name", customName || uploadFile.name.replace(/\.[^/.]+$/, ""));
    formData.append("category", finalCategory || "Uncategorized");

    uploadMutation.mutate(formData);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = (music: MusicObject) => {
    if (playingId === music.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = music.music_url;
        audioRef.current.play();
        setPlayingId(music.id);
      }
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const filtered = musicList
    .filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) || 
                            m.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = selectedCategory === "all" || m.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "duration_desc") return b.duration - a.duration;
      return 0;
    });

  const totalSize = musicList.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="space-y-8">
      {/* Mini Stats & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-white/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-lg">
                <Music className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total Tracks</p>
                <p className="text-sm font-black text-slate-900 leading-none">{musicList.length}</p>
              </div>
            </div>
            
            <div className="bg-white/60 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                <HardDrive className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Music Storage</p>
                <p className="text-sm font-black text-slate-900 leading-none">{formatSize(totalSize)}</p>
              </div>
            </div>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2.5 px-8 py-3.5 rounded-[1.25rem] bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:scale-105 active:scale-95 transition-all"
        >
          <UploadIcon className="w-4 h-4" /> Add New Music
        </button>
      </div>

      {/* Toolbar: Search + Categories */}
      <div className="space-y-5 bg-white/40 p-6 rounded-[2.5rem] border border-white shadow-md">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search music by name or category..."
              className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/80 border border-slate-200 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
            />
          </div>
          
          <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50 overflow-x-auto whitespace-nowrap no-scrollbar max-w-full">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === "all" 
                ? "bg-white text-primary shadow-sm border border-slate-200/50" 
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat 
                  ? "bg-white text-primary shadow-sm border border-slate-200/50" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sort By:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[10px] font-black text-slate-600 uppercase tracking-widest outline-none cursor-pointer"
              >
                <option value="date_desc">Recently Added</option>
                <option value="date_asc">Oldest First</option>
                <option value="name_asc">Name (A-Z)</option>
                <option value="duration_desc">Longest First</option>
              </select>
            </div>
          </div>

          <p className="text-[10px] font-black text-primary/60 uppercase tracking-widest">
            Showing {filtered.length} of {musicList.length} Tracks
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
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Music Library</p>
            </div>
         </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((music) => (
            <div key={music.id} className="group bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
               <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 flex-shrink-0 group-hover:shadow-lg transition-all">
                     {music.thumbnail_url ? (
                        <img src={music.thumbnail_url} className="w-full h-full object-cover" alt="" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary">
                           <FileAudio className="w-8 h-8" />
                        </div>
                     )}
                     <button 
                       onClick={() => togglePlay(music)}
                       className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                     >
                       {playingId === music.id ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                     </button>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                     <h4 className="text-sm font-black text-slate-800 truncate mb-1" title={music.name}>{music.name}</h4>
                     <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[8px] font-black text-slate-500 uppercase tracking-widest">
                           {music.category}
                        </span>
                     </div>
                     <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        <div className="flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           {formatDuration(music.duration)}
                        </div>
                        <div className="flex items-center gap-1">
                           <Database className="w-3 h-3" />
                           {formatSize(music.size)}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                     Added {format(new Date(music.created_at), "MMM dd, yyyy")}
                  </span>
                  <div className="flex items-center gap-2">
                     <a href={music.music_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all">
                        <ExternalLink className="w-4 h-4" />
                     </a>
                     <button 
                       onClick={() => handleDelete(music.id)}
                       className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-12 bg-white/30 rounded-[4rem] border-4 border-dashed border-white shadow-inner">
           <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mb-8 shadow-xl shadow-slate-200/50">
             <Music className="w-10 h-10 text-slate-200" />
           </div>
           <h3 className="text-3xl font-black text-slate-800 uppercase tracking-[0.2em] mb-2">Library Empty</h3>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest max-w-sm text-center leading-relaxed">No music tracks found in your vault.</p>
           <button 
             onClick={() => { setIsUploadModalOpen(true); }}
             className="mt-10 px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
           >
             Add First Track
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
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <UploadIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Add Music</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">S3 Music Vault Provisioning</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsUploadModalOpen(false)}
                    className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    {/* Music File Selection */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <FileAudio className="w-3 h-3" /> Music File
                       </label>
                       <div 
                         onClick={() => musicInputRef.current?.click()}
                         className={`relative aspect-video rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${uploadFile ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'}`}
                       >
                         <input 
                           type="file" 
                           ref={musicInputRef}
                           className="hidden" 
                           accept="audio/*"
                           onChange={(e) => {
                             const file = e.target.files?.[0] || null;
                             setUploadFile(file);
                             if (file && !customName) {
                               setCustomName(file.name.replace(/\.[^/.]+$/, ""));
                             }
                           }}
                         />
                         {uploadFile ? (
                           <div className="flex flex-col items-center gap-3 p-4 text-center">
                             <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                               <Music className="w-6 h-6" />
                             </div>
                             <p className="text-xs font-bold text-slate-700 break-all">{uploadFile.name}</p>
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{formatSize(uploadFile.size)}</p>
                           </div>
                         ) : (
                           <>
                             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 mb-2">
                               <Plus className="w-5 h-5" />
                             </div>
                             <p className="text-[10px] font-bold text-slate-500">Upload Track</p>
                             <p className="text-[8px] font-medium text-slate-400 mt-1 uppercase tracking-widest">MP3, WAV, AAC up to 50MB</p>
                           </>
                         )}
                       </div>
                    </div>

                    {/* Thumbnail Selection */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <ImageIcon className="w-3 h-3" /> Thumbnail (Optional)
                       </label>
                       <div 
                         onClick={() => thumbInputRef.current?.click()}
                         className={`relative h-24 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${uploadThumb ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'}`}
                       >
                          <input 
                            type="file" 
                            ref={thumbInputRef}
                            className="hidden" 
                            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) {
                                setUploadThumb(null);
                                return;
                              }
                              const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
                              const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
                              const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
                              if (!allowedExts.includes(ext) && !allowedMimes.includes(file.type.toLowerCase())) {
                                toast.error("Please upload a JPG, PNG, WEBP, or GIF image.");
                                if (thumbInputRef.current) thumbInputRef.current.value = "";
                                return;
                              }
                              setUploadThumb(file);
                            }}
                          />
                         {uploadThumb ? (
                           <div className="flex items-center gap-3 px-4">
                             <img src={URL.createObjectURL(uploadThumb)} className="w-12 h-12 rounded-lg object-cover border border-white shadow-sm" />
                             <div className="flex flex-col">
                               <p className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">{uploadThumb.name}</p>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setUploadThumb(null); }}
                                 className="text-[8px] font-black text-rose-500 uppercase tracking-widest text-left"
                               >
                                 Remove
                               </button>
                             </div>
                           </div>
                         ) : (
                           <div className="flex flex-col items-center">
                              <Plus className="w-4 h-4 text-slate-300 mb-1" />
                              <p className="text-[9px] font-bold text-slate-400">Select Image</p>
                           </div>
                         )}
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                     {/* Track Name */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Track Display Name</label>
                        <input 
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g. Romantic Wedding Bells"
                          className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
                        />
                     </div>

                     {/* Category selection */}
                     <div className="space-y-4">
                       <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <Folder className="w-3 h-3" /> Category
                         </label>
                         <button 
                           onClick={() => setIsCreatingNewCategory(!isCreatingNewCategory)}
                           className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                         >
                           {isCreatingNewCategory ? <Check className="w-3 h-3" /> : <FolderPlus className="w-3 h-3" />}
                           {isCreatingNewCategory ? "Use Existing" : "Create New"}
                         </button>
                       </div>

                       {isCreatingNewCategory ? (
                         <div className="relative animate-in slide-in-from-top-2 duration-300">
                           <input 
                             autoFocus
                             value={newCategoryName}
                             onChange={(e) => setNewCategoryName(e.target.value)}
                             placeholder="Enter new category name..."
                             className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
                           />
                         </div>
                       ) : (
                         <div className="relative">
                           <select
                             value={uploadCategory}
                             onChange={(e) => setUploadCategory(e.target.value)}
                             className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all appearance-none cursor-pointer"
                           >
                             <option value="">Select Category</option>
                             {categories.map(cat => (
                               <option key={cat} value={cat}>{cat}</option>
                             ))}
                           </select>
                           <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                             <ChevronDown className="w-4 h-4" />
                           </div>
                         </div>
                       )}
                     </div>
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
                        <RefreshCw className="w-4 h-4 animate-spin" /> Uploading Track...
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

export default S3MusicManager;
