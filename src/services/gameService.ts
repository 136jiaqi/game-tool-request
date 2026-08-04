import type { GameInfo } from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const extractSteamAppId = (url: string) =>
  url.match(
    /^https?:\/\/store\.steampowered\.com\/app\/(\d+)(?:\/[^?]*)?(?:\?.*)?$/i,
  )?.[1] || null;

export async function getGameByAppId(id: string): Promise<GameInfo | null> {
  try {
    const response = await fetch(
      `${API_BASE}/api/steam/game/${encodeURIComponent(id)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    return (await response.json()) as GameInfo;
  } catch {
    return null;
  }
}

export async function getGameBySteamUrl(url: string) {
  const id = extractSteamAppId(url.trim());
  return id ? getGameByAppId(id) : null;
}
