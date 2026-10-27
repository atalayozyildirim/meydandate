import { useCallback } from "react";
import { env } from "@/infrastructure/config/env";

type GifResult = {
  id: string;
  url: string;
  preview?: string;
};

export const useGifSearch = () => {
  const tenorKey = env.tenorApiKey || "";
  const giphyKey = env.giphyApiKey || "";

  const searchTenor = async (query: string, limit = 24): Promise<GifResult[]> => {
    if (!tenorKey) return [];
    try {
      const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${encodeURIComponent(tenorKey)}&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      const results = (json.results || []) as any[];

      return results
        .map((r) => {
          const media = r.media_formats ?? r.media ?? [];
          const gif = media.gif?.url || media.mediumgif?.url || (Array.isArray(media) && media[0]?.gif?.url) || r.itemurl || null;
          const preview = media.nanogif?.url || media.tinygif?.url || (Array.isArray(media) && media[0]?.nanogif?.url) || null;
          return gif ? { id: r.id || r.result_id || gif, url: gif, preview: preview ?? gif } : null;
        })
        .filter(Boolean) as GifResult[];
    } catch (e) {
      return [];
    }
  };

  const searchGiphy = async (query: string, limit = 24): Promise<GifResult[]> => {
    if (!giphyKey) return [];
    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(giphyKey)}&q=${encodeURIComponent(query)}&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      const data = (json.data || []) as any[];

      return data
        .map((d) => {
          const gif = d.images?.original?.url || d.images?.downsized?.url || d.url;
          const preview = d.images?.fixed_width_small_still?.url || d.images?.downsized_small?.mp4 || gif;
          return gif ? { id: d.id || gif, url: gif, preview } : null;
        })
        .filter(Boolean) as GifResult[];
    } catch (e) {
      return [];
    }
  };

  const search = useCallback(async (query: string, limit = 24): Promise<GifResult[]> => {
    if (!query) return [];

    const tenorResults = await searchTenor(query, limit);
    if (tenorResults.length > 0) return tenorResults;

    const giphyResults = await searchGiphy(query, limit);
    return giphyResults;
  }, [tenorKey, giphyKey]);

  return { search };
};
