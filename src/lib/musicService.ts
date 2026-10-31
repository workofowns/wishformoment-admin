/**
 * Music Service for 30s Audio Previews (Bollywood, Tollywood, Hollywood, Birthday, DJ)
 * Uses Apple iTunes Search API with in-memory caching and fallback resilience.
 */

export interface MusicTrack {
  id: number;
  name: string;
  music_url: string;
  thumbnail_url: string | null;
  duration: number; // in seconds (30s)
  category: string;
  artist?: string;
}

export interface PresetCategory {
  id: string;
  label: string;
  query: string;
  country: 'IN' | 'US';
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    id: "bollywood",
    label: "Bollywood",
    query: "bollywood romantic hindi hits",
    country: "IN"
  },
  {
    id: "tollywood",
    label: "Tollywood",
    query: "tollywood telugu hits",
    country: "IN"
  },
  {
    id: "english",
    label: "Hollywood & English",
    query: "billboard top pop hits",
    country: "US"
  },
  {
    id: "birthday",
    label: "Birthday Special",
    query: "happy birthday song",
    country: "IN"
  },
  {
    id: "party_dj",
    label: "DJ & Party",
    query: "bollywood party remix dj",
    country: "IN"
  },
  {
    id: "lovely",
    label: "Romantic",
    query: "romantic love songs",
    country: "IN"
  }
];

// Fallback tracks if network or offline
const FALLBACKS: Record<string, MusicTrack[]> = {
  bollywood: [
    {
      id: 101,
      name: "Tum Se Hi - Pritam & Mohit Chauhan",
      music_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e7/39/b8/e739b870-54a1-8f33-57d5-3817108b8bd9/mzaf_16925921654959290990.plus.aac.p.m4a",
      thumbnail_url: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/3d/c7/43/3dc74387-e7f4-2342-397c-4cf2037c69a5/8902894623223_cover.jpg/200x200bb.jpg",
      duration: 30,
      category: "Bollywood"
    },
    {
      id: 102,
      name: "Kesariya - Pritam & Arijit Singh",
      music_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/c6/bd/86/c6bd86f7-c253-3bc3-7a7d-b58693c0bc57/mzaf_10526645931221379796.plus.aac.p.m4a",
      thumbnail_url: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/a4/0c/33/a40c33a9-a9a3-5c5a-7ec8-d9d30ca789d7/196589247390.jpg/200x200bb.jpg",
      duration: 30,
      category: "Bollywood"
    }
  ],
  tollywood: [
    {
      id: 201,
      name: "Chuttamalle - Anirudh Ravichander & Shilpa Rao",
      music_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f9/28/29/f92829b4-5473-17a9-879a-2efe96b8f95b/mzaf_4766756883763132198.plus.aac.p.m4a",
      thumbnail_url: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/86/7c/53/867c53cc-4efe-faef-a20e-8d9c896053db/8903431011411_cover.jpg/200x200bb.jpg",
      duration: 30,
      category: "Tollywood"
    }
  ],
  english: [
    {
      id: 301,
      name: "Perfect - Ed Sheeran",
      music_url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c7/ba/bc/c7babc66-f598-aaa6-bcf6-307281795817/mzaf_16337361235117168274.plus.aac.p.m4a",
      thumbnail_url: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/15/e6/e8/15e6e8a4-4190-6a8b-86c3-ab4a51b88288/190295851286.jpg/200x200bb.jpg",
      duration: 30,
      category: "Hollywood & English"
    }
  ]
};

// In-memory cache to prevent repeat API calls & rate limits
const cache = new Map<string, { data: MusicTrack[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch tracks by preset category
 */
export async function fetchPresetCategoryTracks(categoryId: string): Promise<MusicTrack[]> {
  const preset = PRESET_CATEGORIES.find(c => c.id === categoryId);
  if (!preset) return [];

  const cacheKey = `cat_${categoryId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(preset.query)}&country=${preset.country}&entity=song&limit=25`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const tracks: MusicTrack[] = (data.results || [])
      .filter((t: any) => t.previewUrl)
      .map((t: any) => ({
        id: t.trackId,
        name: `${t.trackName} - ${t.artistName}`,
        artist: t.artistName,
        music_url: t.previewUrl,
        thumbnail_url: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '200x200bb') : null,
        duration: 30,
        category: preset.label
      }));

    if (tracks.length > 0) {
      cache.set(cacheKey, { data: tracks, timestamp: Date.now() });
      return tracks;
    }
  } catch (err) {
    console.warn("iTunes API fetch failed, using fallback:", err);
  }

  return FALLBACKS[categoryId] || FALLBACKS.bollywood;
}

/**
 * Live search across iTunes songs
 */
export async function searchOnlineTracks(query: string, categoryId?: string): Promise<MusicTrack[]> {
  const clean = query.trim();
  if (!clean) return [];

  const preset = categoryId ? PRESET_CATEGORIES.find(c => c.id === categoryId) : null;
  const country = preset?.country || (categoryId === 'english' ? 'US' : 'IN');

  const cacheKey = `search_${country}_${clean.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(clean)}&country=${country}&entity=song&limit=20`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const tracks: MusicTrack[] = (data.results || [])
      .filter((t: any) => t.previewUrl)
      .map((t: any) => ({
        id: t.trackId,
        name: `${t.trackName} - ${t.artistName}`,
        artist: t.artistName,
        music_url: t.previewUrl,
        thumbnail_url: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb', '200x200bb') : null,
        duration: 30,
        category: t.primaryGenreName || "Music"
      }));

    cache.set(cacheKey, { data: tracks, timestamp: Date.now() });
    return tracks;
  } catch (err) {
    console.warn("Online search failed:", err);
    return [];
  }
}
