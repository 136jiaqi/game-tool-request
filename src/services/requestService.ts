import type { RequestItem, Submission } from "../types";
import { storage } from "./storageService";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export function checkDuplicateRequests(
  existing: Submission[],
  items: RequestItem[],
  appId: string,
) {
  const old = existing.filter((s) => s.appId === appId).flatMap((s) => s.items);
  const duplicates = items.filter((n) =>
    old.some(
      (o) =>
        o.toolType === n.toolType &&
        (n.toolType !== "game_translation" ||
          o.targetLanguage === n.targetLanguage) &&
        (n.toolType !== "other" || o.otherDescription === n.otherDescription),
    ),
  );
  return { duplicates, unique: items.filter((i) => !duplicates.includes(i)) };
}
export async function saveSubmission(s: Submission) {
  const response = await fetch(`${API_BASE}/api/tool-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(s),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as
      | { detail?: string; error?: string }
      | null;
    throw new Error(
      result?.detail || result?.error || `提交失败（HTTP ${response.status}）`,
    );
  }
  storage.saveSubmissions([s, ...storage.getSubmissions()]);
}
export async function getSubmissions() {
  return storage.getSubmissions();
} // TODO: 后续替换为 GET /api/tool-requests/my
