// Refactored MusicSelector using shared categories and iTunes 30s preview integration
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { X, Search, Music as MusicIcon, RefreshCw, Check, Play, Pause } from "lucide-react";
import {
  PRESET_CATEGORIES,
  fetchPresetCategoryTracks,
  searchOnlineTracks,
  MusicTrack
} from "@/lib/musicService";

export interface Music {
  id: number;
  name: string;
  music_url: string;
  thumbnail_url: string | null;
  duration: number;
  category: string | null;
}

interface MusicSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (music: Music) => void;
  title?: string;
  selectedValue?: string;
}

const MusicSelector = ({
  isOpen,
  onClose,
  onSelect,
  title = "Select Background Music",
  selectedValue
}: MusicSelectorProps) => {
  const [activeTab, setActiveTab] = useState<string>("bollywood");
  const [search, setSearch] = useState("");
  const [categoryTracks, setCategoryTracks] = useState<Music[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audio] = useState<HTMLAudioElement | null>(typeof Audio !== "undefined" ? new Audio() : null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const { data: dbData, isLoading: isDbLoading } = useQuery<{ success: boolean; music: Music[] }>({
    queryKey: ["adminMusicList"],
    queryFn: () => fetchApi("/music"),
    enabled: isOpen,
  });

  const dbMusicList = dbData?.music || [];

  // Audio setup
  useEffect(() => {
    if (audio) {
      audio.loop = true;
    }
    return () => {
      audio?.pause();
    };
  }, [audio]);

  // Pause audio when modal closes
  useEffect(() => {
    if (!isOpen && audio) {
      audio.pause();
      setPlayingId(null);
    }
  }, [isOpen, audio]);

  // Load preset category songs when active tab changes
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === "custom") {
      setIsCategoryLoading(false);
      return;
    }

    setIsCategoryLoading(true);
    fetchPresetCategoryTracks(activeTab)
      .then((tracks) => {
        setCategoryTracks(tracks);
        setIsCategoryLoading(false);
      })
      .catch(() => {
        setIsCategoryLoading(false);
      });
  }, [activeTab, isOpen]);

  // Handle live search
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === "custom") {
      return;
    }

    if (!search.trim()) {
      fetchPresetCategoryTracks(activeTab).then((tracks) => setCategoryTracks(tracks));
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setIsCategoryLoading(true);
      searchOnlineTracks(search, activeTab).then((results) => {
        setCategoryTracks(results);
        setIsCategoryLoading(false);
      });
    }, 350);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search, activeTab, isOpen]);

  const handlePlay = (m: Music) => {
    if (!audio) return;
    if (playingId === m.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.src = m.music_url;
      audio.play().catch(() => {});
      setPlayingId(m.id);
    }
  };

  const handleSelectTrack = async (m: Music) => {
    // Sync external track to database in background
    fetchApi("/music/sync", {
      method: "POST",
      body: JSON.stringify({
        name: m.name,
        music_url: m.music_url,
        thumbnail_url: m.thumbnail_url,
        category: m.category,
        duration: m.duration || 30,
      }),
    }).catch(() => {});

    onSelect(m);
  };

  if (!isOpen) return null;

  const currentList = activeTab === "custom" ? dbMusicList : categoryTracks;
  const filtered = currentList.filter((m) => {
    if (activeTab === "custom" && search.trim()) {
      return m.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const isLoading = activeTab === "custom" ? isDbLoading : isCategoryLoading;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl flex flex-col border border-slate-200 overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
              <MusicIcon className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Choose a 30-second default track for this template
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Categories & Search */}
        <div className="p-6 border-b border-slate-50 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveTab(cat.id);
                  setSearch("");
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === cat.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setActiveTab("custom");
                setSearch("");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === "custom"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Uploaded Library ({dbMusicList.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === "custom"
                  ? "Search uploaded songs..."
                  : `Search songs in ${PRESET_CATEGORIES.find((c) => c.id === activeTab)?.label || "music"}...`
              }
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-200 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/60 animate-pulse"
                >
                  <div className="w-14 h-14 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div
                      className="h-3.5 bg-slate-200 rounded"
                      style={{ width: i % 2 === 0 ? "70%" : "55%" }}
                    />
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 bg-slate-200 rounded w-16" />
                      <div className="h-2.5 bg-slate-200 rounded w-12" />
                    </div>
                  </div>
                  <div className="h-7 w-16 bg-slate-200 rounded-xl shrink-0" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-8">
              <MusicIcon className="w-10 h-10 text-slate-200 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No songs found</h3>
              <p className="text-xs text-slate-400 mt-1">Try another search or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filtered.map((m) => {
                const cleanSelected = selectedValue?.trim().toLowerCase();
                const cleanUrl = m.music_url?.trim().toLowerCase();
                const isSelected = Boolean(
                  cleanSelected && cleanUrl && (cleanSelected === cleanUrl || cleanSelected.includes(cleanUrl) || cleanUrl.includes(cleanSelected))
                );
                const isPlaying = playingId === m.id;

                return (
                  <div
                    key={m.id}
                    className={`group relative flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20"
                        : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      {m.thumbnail_url ? (
                        <img src={m.thumbnail_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MusicIcon className="w-5 h-5 text-slate-300" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlay(m);
                        }}
                        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                          isPlaying ? "bg-black/50 opacity-100" : "bg-black/40 opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-white fill-current" />
                        ) : (
                          <Play className="w-5 h-5 text-white fill-current" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isSelected ? "text-indigo-600" : "text-slate-800"}`}>
                        {m.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-black uppercase text-slate-500">
                          {m.category || "Audio"}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          30s preview
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectTrack(m)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MusicSelector;
