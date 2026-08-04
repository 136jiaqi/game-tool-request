import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { tools } from "../config/toolOptions";
import type { GameInfo, ToolType } from "../types";
const copy: {
  [k: string]: { zh: string; tw: string; en: string; dzh: string; dtw: string; den: string };
} = {
  mod_install: {
    zh: "MOD 一键安装",
    tw: "MOD 一鍵安裝",
    en: "One-click MOD install",
    dzh: "热门 MOD 的安装、启用与管理。",
    dtw: "熱門 MOD 的安裝、啟用與管理。",
    den: "Install, enable and manage popular mods.",
  },
  game_translation: {
    zh: "游戏翻译",
    tw: "遊戲翻譯",
    en: "Game translation",
    dzh: "翻译为游戏原本不支持的语言。",
    dtw: "翻譯為遊戲原本不支援的語言。",
    den: "Translate into languages not natively supported.",
  },
  interactive_map: {
    zh: "游戏互动地图",
    tw: "遊戲互動地圖",
    en: "Interactive map",
    dzh: "查看资源、任务、Boss 和收集品位置。",
    dtw: "查看資源、任務、Boss 和收藏品位置。",
    den: "Explore resources, quests, bosses and collectibles.",
  },
  screenshot_translation: {
    zh: "截图翻译",
    tw: "截圖翻譯",
    en: "Screenshot translation",
    dzh: "识别并翻译截图中的文本。",
    dtw: "辨識並翻譯截圖中的文字。",
    den: "Recognize and translate text in screenshots.",
  },
  memory_cleanup: {
    zh: "内存清理优化",
    tw: "記憶體清理最佳化",
    en: "Memory cleanup",
    dzh: "降低运行时的无效内存占用。",
    dtw: "降低執行時不必要的記憶體占用。",
    den: "Reduce unnecessary memory usage.",
  },
  fps_graphics_master: {
    zh: "帧率画质大师",
    tw: "幀率畫質大師",
    en: "FPS & graphics master",
    dzh: "兼顾帧率与画面表现。",
    dtw: "兼顧幀率與畫面表現。",
    den: "Balance frame rate and visual quality.",
  },
  win11_stutter_fix: {
    zh: "Win11 卡顿修复",
    tw: "Win11 卡頓修復",
    en: "Win11 stutter fix",
    dzh: "检测 Windows 11 环境卡顿。",
    dtw: "檢測 Windows 11 環境卡頓。",
    den: "Diagnose stutter on Windows 11.",
  },
  runtime_error_fix: {
    zh: "C++ / DX11 异常修复",
    tw: "C++ / DX11 異常修復",
    en: "Runtime error fix",
    dzh: "修复组件缺失与启动异常。",
    dtw: "修復元件缺失與啟動異常。",
    den: "Fix missing runtimes and launch errors.",
  },
  stutter_diagnosis: {
    zh: "卡顿检测修复",
    tw: "卡頓檢測修復",
    en: "Stutter diagnosis",
    dzh: "定位常见卡顿原因并修复。",
    dtw: "定位常見卡頓原因並修復。",
    den: "Find and fix common stutter causes.",
  },
  graphics_performance_optimization: {
    zh: "画质性能优化",
    tw: "畫質效能最佳化",
    en: "Graphics optimization",
    dzh: "优化画质、延迟与稳定性。",
    dtw: "最佳化畫質、延遲與穩定性。",
    den: "Tune visuals, latency and stability.",
  },
  save_tool: {
    zh: "存档工具",
    tw: "存檔工具",
    en: "Save tool",
    dzh: "查找、备份、恢复和管理存档。",
    dtw: "尋找、備份、還原和管理存檔。",
    den: "Find, back up and restore saves.",
  },
  other: {
    zh: "其他工具",
    tw: "其他工具",
    en: "Other tool",
    dzh: "提交列表之外的工具想法。",
    dtw: "提交清單之外的工具想法。",
    den: "Request a tool not listed here.",
  },
};
export const toolName = (id: ToolType, language = "zh-CN") =>
  copy[id][language === "en" ? "en" : language === "zh-TW" ? "tw" : "zh"];
export function ToolGrid({
  game,
  selected,
  onToggle,
  submitted,
}: {
  game: GameInfo | null;
  selected: ToolType[];
  onToggle: (id: ToolType) => void;
  submitted: ToolType[];
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  return (
    <div className="tool-grid">
      {tools.map(({ id, icon: Icon }) => {
        const pub = game?.publishedTools.find((p) => p.toolType === id);
        const done = submitted.includes(id);
        const disabled = !game || !!pub || done;
        const active = selected.includes(id);
        return (
          <button
            type="button"
            key={id}
            className={`tool-card ${active ? "selected" : ""} ${disabled ? "disabled" : ""}`}
            disabled={disabled}
            onClick={() => onToggle(id)}
          >
            <div className="tool-icon">
              <Icon size={22} />
            </div>
            <div>
              <h3>{toolName(id, language)}</h3>
              <p>{copy[id][language === "en" ? "den" : language === "zh-TW" ? "dtw" : "dzh"]}</p>
            </div>
            {active && (
              <span className="check">
                <Check size={14} />
              </span>
            )}
            {done && (
              <span className="card-state submitted">{t("submitted")}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
