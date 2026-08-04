import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GameInfo } from "../types";
export function GameCard({ game, onEdit }: { game: GameInfo; onEdit: () => void }) {
  const { t, i18n } = useTranslation();
  const name =
    i18n.language === "en"
      ? game.nameEn
      : i18n.language === "zh-TW"
        ? game.nameZhTw
        : game.nameZhCn;
  return (
    <section className="game-card">
      <div className="game-info">
        <div className="game-title-row">
          <div>
            <h2>{t("game")}</h2>
            <p className="identified-game-name">{name}</p>
          </div>
        </div>
        <div className="meta">
          <span>
            {t("appId")} <strong>{game.appId}</strong>
          </span>
          <button type="button" className="edit-game" onClick={onEdit}>
            <Pencil size={14} />
            {t("editSteam")}
          </button>
        </div>
      </div>
    </section>
  );
}
