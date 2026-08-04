import { Clock3, Globe2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { storage } from "../services/storageService";
import type { Lang } from "../types";
export function PageHeader() {
  const { t, i18n } = useTranslation();
  const loc = useLocation();
  const setLang = (v: Lang) => {
    void i18n.changeLanguage(v);
    storage.setLanguage(v);
  };
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/tool-request" className="brand">
          {t("brand")}
          <small>GAME TOOLS</small>
        </Link>
        <nav>
          <Link className="nav-link" to="/tool-request/history">
            <Clock3 size={17} />
            {t("history")}
          </Link>
          <label className="lang">
            <Globe2 size={16} />
            <select
              aria-label="Language"
              value={i18n.language}
              onChange={(e) => setLang(e.target.value as Lang)}
            >
              <option value="zh-CN">简体中文</option>
              <option value="zh-TW">繁體中文</option>
              <option value="en">English</option>
            </select>
          </label>
        </nav>
      </div>
      {loc.pathname === "/tool-request" && (
        <div className="hero-copy">
          <span className="eyebrow">COMMUNITY TOOL REQUEST</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      )}
    </header>
  );
}
