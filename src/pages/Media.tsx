import { useState } from "react";

import { Image as ImageIcon, Music } from "lucide-react";
import S3ImageManager from "@/components/dashboard/S3ImageManager";
import S3MusicManager from "@/components/dashboard/S3MusicManager";

const Media = () => {
  const [mediaType, setMediaType] = useState<"images" | "music">("images");

  return (

      <div className="flex flex-col gap-8 pb-20">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
              <ImageIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Infrastructure Control</p>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">S3 Vault</h1>
            </div>
          </div>
        </div>

        {/* Media Type Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200/50 w-fit shadow-sm">
          {[
            { id: "images", label: "Images", icon: ImageIcon },
            { id: "music", label: "Music", icon: Music }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setMediaType(tab.id as any)}
              className={`flex items-center gap-2.5 px-8 py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${mediaType === tab.id 
                ? "bg-white text-primary shadow-lg shadow-primary/5 border border-slate-200/50" 
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}
            >
              <tab.icon className={`w-4 h-4 transition-transform duration-300 ${mediaType === tab.id ? "scale-110" : "scale-100"}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Content */}
        {mediaType === "images" ? (
          <S3ImageManager />
        ) : (
          <S3MusicManager />
        )}
      </div>

  );
};

export default Media;
