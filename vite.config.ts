import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const steamLanguageCodes: Record<string, string> = {
  english: "en",
  "simplified chinese": "zh-CN",
  "traditional chinese": "zh-TW",
  japanese: "ja",
  korean: "ko",
  french: "fr",
  german: "de",
  "spanish - spain": "es-ES",
  "spanish - latin america": "es-419",
  "portuguese - brazil": "pt-BR",
  portuguese: "pt-PT",
  russian: "ru",
  polish: "pl",
  italian: "it",
  dutch: "nl",
  turkish: "tr",
  thai: "th",
  vietnamese: "vi",
  indonesian: "id",
  arabic: "ar",
};

interface SteamDetails {
  name: string;
  header_image?: string;
  supported_languages?: string;
  release_date?: { coming_soon?: boolean };
}

async function getSteamDetails(appId: string, language: string) {
  const response = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${appId}&l=${language}&cc=us`,
    { headers: { "User-Agent": "Mozilla/5.0 XMODhubToolRequest/1.0" } },
  );
  if (!response.ok) throw new Error(`Steam returned ${response.status}`);
  const payload = (await response.json()) as Record<
    string,
    { success?: boolean; data?: SteamDetails }
  >;
  const data = payload[appId]?.data;
  if (!payload[appId]?.success || !data?.name) {
    throw new Error("Steam game was not found");
  }
  return data;
}

function steamLanguagesPlugin() {
  return {
    name: "steam-interface-languages",
    configureServer(server: {
      middlewares: {
        use: (
          handler: (
            req: { url?: string },
            res: {
              statusCode: number;
              setHeader: (name: string, value: string) => void;
              end: (body: string) => void;
            },
            next: () => void,
          ) => void,
        ) => void;
      };
    }) {
      server.middlewares.use(async (req, res, next) => {
        const gameMatch = req.url?.match(/^\/api\/steam\/game\/(\d+)/);
        if (gameMatch) {
          try {
            const [english, simplified, traditional] = await Promise.all([
              getSteamDetails(gameMatch[1], "english"),
              getSteamDetails(gameMatch[1], "schinese").catch(() => null),
              getSteamDetails(gameMatch[1], "tchinese").catch(() => null),
            ]);
            const supportedLanguages = (english.supported_languages || "")
              .replace(/<[^>]+>/g, "")
              .split(",")
              .map((name) => name.replace(/\*/g, "").trim().toLowerCase())
              .map((name) => steamLanguageCodes[name])
              .filter((code): code is string => Boolean(code));
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
              JSON.stringify({
                appId: gameMatch[1],
                gameKey: `steam-${gameMatch[1]}`,
                nameEn: english.name,
                nameZhCn: simplified?.name || english.name,
                nameZhTw:
                  traditional?.name || simplified?.name || english.name,
                coverUrl: english.header_image || "",
                steamUrl: `https://store.steampowered.com/app/${gameMatch[1]}/`,
                releaseStatus: english.release_date?.coming_soon
                  ? "coming_soon"
                  : "released",
                supportedLanguages,
                publishedTools: [],
              }),
            );
          } catch (error) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(
              JSON.stringify({
                error:
                  error instanceof Error
                    ? error.message
                    : "Steam lookup failed",
              }),
            );
          }
          return;
        }
        const match = req.url?.match(/^\/api\/steam\/languages\/(\d+)/);
        if (!match) return next();
        try {
          const response = await fetch(
            `https://store.steampowered.com/app/${match[1]}/?l=english&cc=us`,
            {
              headers: { "User-Agent": "Mozilla/5.0 XMODhubToolRequest/1.0" },
            },
          );
          if (!response.ok)
            throw new Error(`Steam returned ${response.status}`);
          const html = await response.text();
          const table = html.match(
            /<table[^>]*class="[^"]*game_language_options[^"]*"[^>]*>([\s\S]*?)<\/table>/i,
          )?.[1];
          if (!table) throw new Error("Steam language table not found");
          const languages: string[] = [];
          for (const row of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
            const cells = [
              ...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi),
            ].map((cell) => cell[1]);
            if (cells.length < 2 || !/(?:<img|checkmark|✔)/i.test(cells[1]))
              continue;
            const name = cells[0]
              .replace(/<[^>]+>/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/\s+/g, " ")
              .trim()
              .toLowerCase();
            const code = steamLanguageCodes[name];
            if (code && !languages.includes(code)) languages.push(code);
          }
          if (!languages.length)
            throw new Error("No interface languages found");
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              appId: match[1],
              languages,
              source: "steam-store-interface",
            }),
          );
        } catch (error) {
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              error:
                error instanceof Error ? error.message : "Steam lookup failed",
            }),
          );
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/tool-request/",
  build: { outDir: "dist" },
  plugins: [react(), tailwindcss(), steamLanguagesPlugin()],
}));
