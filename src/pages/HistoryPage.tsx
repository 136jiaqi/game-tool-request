import { useMemo, useState } from "react";
import { ArrowLeft, Inbox, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { storage } from "../services/storageService";
import { toolName } from "../components/ToolGrid";
export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const items = useMemo(
    () =>
      storage
        .getSubmissions()
        .flatMap((s) => s.items.map((i) => ({ s, i })))
        .filter(
          ({ s }) =>
            `${s.gameSnapshot.nameEn}${s.gameSnapshot.nameZhCn}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        ),
    [search],
  );
  return (
    <main>
      <div className="history-head">
        <div>
          <Link to="/tool-request" className="back">
            <ArrowLeft size={16} />
            {t("back")}
          </Link>
          <h1>{t("history")}</h1>
          <p>{t("historyHint")}</p>
        </div>
        <div className="history-count">
          <b>{items.length}</b>
          <span>{t("requestItems")}</span>
        </div>
      </div>
      <div className="filterbar">
        <label className="search">
          <Search size={17} />
          <input
            aria-label={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
          />
        </label>
      </div>
      {!items.length ? (
        <div className="empty">
          <Inbox size={36} />
          <h2>{t("empty")}</h2>
          <Link to="/tool-request">{t("submit")}</Link>
        </div>
      ) : (
        <div className="history-list">
          {items.map(({ s, i }) => {
            const name =
              i18n.language === "en"
                ? s.gameSnapshot.nameEn
                : i18n.language === "zh-TW"
                  ? s.gameSnapshot.nameZhTw
                  : s.gameSnapshot.nameZhCn;
            return (
              <article className="history-card" key={i.requestId}>
                <div className="history-body">
                  <div className="history-top">
                    <div>
                      <span>
                        {name} · APP {s.appId}
                      </span>
                      <h2>
                        {toolName(i.toolType, i18n.language)}
                        {i.targetLanguage && <small>{i.targetLanguage}</small>}
                      </h2>
                    </div>
                  </div>
                  <div className="history-meta">
                    <span>#{i.requestId.slice(0, 8).toUpperCase()}</span>
                    <span>{new Date(i.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
