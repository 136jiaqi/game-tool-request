import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Link2, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { GameCard } from "../components/GameCard";
import { ToolGrid, toolName } from "../components/ToolGrid";
import { languages } from "../config/toolOptions";
import { getGameBySteamUrl } from "../services/gameService";
import {
  checkDuplicateRequests,
  saveSubmission,
} from "../services/requestService";
import { storage } from "../services/storageService";
import { createId } from "../utils/id";
import type {
  GameInfo,
  Lang,
  RequestItem,
  Submission,
  ToolType,
} from "../types";
const languageNames: Record<string, string> = {
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  "es-ES": "Español",
  "es-419": "Español (LatAm)",
  "pt-BR": "Português (Brasil)",
  "pt-PT": "Português",
  ru: "Русский",
  pl: "Polski",
  it: "Italiano",
  nl: "Nederlands",
  tr: "Türkçe",
  th: "ไทย",
  vi: "Tiếng Việt",
  id: "Bahasa Indonesia",
  ar: "العربية",
};
const languageNamesEn: Record<string, string> = {
  "zh-CN": "Simplified Chinese",
  "zh-TW": "Traditional Chinese",
  en: "English",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  de: "German",
  "es-ES": "Spanish (Spain)",
  "es-419": "Spanish (Latin America)",
  "pt-BR": "Portuguese (Brazil)",
  "pt-PT": "Portuguese (Portugal)",
  ru: "Russian",
  pl: "Polish",
  it: "Italian",
  nl: "Dutch",
  tr: "Turkish",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ar: "Arabic",
};
const languageNamesTw: Record<string, string> = {
  ...languageNames,
  "zh-CN": "簡體中文",
  "zh-TW": "繁體中文",
};
export function ToolRequestPage() {
  const { t, i18n } = useTranslation();
  const [game, setGame] = useState<GameInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [steam, setSteam] = useState("");
  const [steamError, setSteamError] = useState("");
  const [selected, setSelected] = useState<ToolType[]>([]);
  const [targetLangs, setTargetLangs] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [note, setNote] = useState("");
  const [contactType, setContactType] = useState(
    i18n.language === "en" ? "email" : "phone",
  );
  const [contact, setContact] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const existing = useMemo(
    () =>
      game
        ? storage
            .getSubmissions()
            .filter((s) => s.appId === game.appId)
            .flatMap((s) => s.items)
        : [],
    [game],
  );
  const submitted = existing
    .filter((i) => i.userStatus !== "unsupported")
    .map((i) => i.toolType);
  const contactOptions =
    i18n.language === "zh-CN"
      ? ["phone", "wechat", "qq", "email"]
      : ["email", "discord"];
  const displayLanguageName = (code: string) =>
    i18n.language === "en"
      ? languageNamesEn[code]
      : i18n.language === "zh-TW"
        ? languageNamesTw[code]
        : languageNames[code];
  useEffect(() => {
    if (!contactOptions.includes(contactType)) {
      setContactType(contactOptions[0]);
      setContact("");
    }
  }, [i18n.language]);
  const toggle = (id: ToolType) => {
    if (!game) return;
    setSelected((v) =>
      v.includes(id) ? v.filter((x) => x !== id) : [...v, id],
    );
    if (id === "game_translation" && selected.includes(id)) setTargetLangs([]);
    if (id === "other" && selected.includes(id)) setOther("");
  };
  const identify = async () => {
    setSteamError("");
    setLoading(true);
    const found = await getGameBySteamUrl(steam);
    setLoading(false);
    if (found) setGame(found);
    else setSteamError(t("invalidSteam"));
  };
  const editSteamLink = () => {
    setGame(null);
    setSelected([]);
    setTargetLangs([]);
    setOther("");
    setNote("");
    setErrors({});
    setDuplicateNames([]);
  };
  const validate = () => {
    const e: Record<string, string> = {};
    if (!selected.length) e.tools = t("requiredTool");
    if (selected.includes("game_translation") && !targetLangs.length)
      e.languages = t("requiredLanguage");
    if (selected.includes("other") && other.trim().length < 2)
      e.other = t("requiredOther");
    const valid =
      contactType === "email"
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim())
        : contact.trim().length >= 5;
    if (!valid) e.contact = t("requiredContact");
    setErrors(e);
    return !Object.keys(e).length;
  };
  const submit = async () => {
    if (!game || submitting || !confirmed) return;
    if (!validate()) {
      window.setTimeout(() => {
        document
          .querySelector(".field-error")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setSubmitting(true);
    try {
    const now = new Date().toISOString();
    const base = (toolType: ToolType): RequestItem => ({
      requestId: createId(),
      toolType,
      userStatus: "submitted",
      internalStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
    const items = selected.flatMap((id) =>
      id === "game_translation"
        ? targetLangs.map((l) => ({ ...base(id), targetLanguage: l }))
        : id === "other"
          ? [{ ...base(id), otherDescription: other.trim() }]
          : [base(id)],
    );
    const checked = checkDuplicateRequests(
      storage.getSubmissions(),
      items,
      game.appId,
    );
    if (checked.duplicates.length)
      setDuplicateNames(
        checked.duplicates.map(
          (i) =>
            `${toolName(i.toolType, i18n.language)}${i.targetLanguage ? ` · ${displayLanguageName(i.targetLanguage)}` : ""}`,
        ),
      );
    if (!checked.unique.length) {
      return;
    }
    const submission: Submission = {
      submissionId: createId(),
      anonymousId: storage.anonymousId(),
      appId: game.appId,
      gameSnapshot: game,
      contactType,
      contactValue: contact.trim(),
      additionalNote: note.trim() || undefined,
        source: "web",
      pageLanguage: i18n.language as Lang,
      createdAt: now,
      items: checked.unique,
    };
      await saveSubmission(submission);
      window.alert(t("success"));
      window.location.reload();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : t("submitFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main>
      {loading ? (
        <div className="loading">
          <span />
          {t("game")}…
        </div>
      ) : !game ? (
        <section className="panel resolve">
          <div className="section-heading">
            <Link2 />
            <div>
              <h2>{t("steamTitle")}</h2>
              <p>{t("steamHint")}</p>
            </div>
          </div>
          <div className="resolve-row">
            <label className="sr-only" htmlFor="steam-url">
              Steam URL
            </label>
            <input
              id="steam-url"
              value={steam}
              onChange={(e) => setSteam(e.target.value)}
              placeholder={t("steamPlaceholder")}
            />
            <button onClick={identify}>{t("identify")}</button>
          </div>
          {steamError && (
            <p className="field-error" aria-live="polite">
              {steamError}
            </p>
          )}
        </section>
      ) : (
        <GameCard game={game} onEdit={editSteamLink} />
      )}
          <section className="panel">
            <div className="section-heading">
              <span className="step">03</span>
              <div>
                <h2>{t("toolsTitle")}</h2>
                <p>{t("toolsHint")}</p>
              </div>
            </div>
            <ToolGrid
              game={game}
              selected={selected}
              onToggle={toggle}
              submitted={submitted}
            />
            {errors.tools && (
              <p className="field-error" aria-live="polite">
                {errors.tools}
              </p>
            )}
            {game && selected.includes("game_translation") && (
              <div className="secondary">
                <h3>{t("translationTitle")}</h3>
                <p>{t("translationHint")}</p>
                <div className="language-grid">
                  {languages.map((l) => {
                    const disabled =
                      game.supportedLanguages.includes(l) ||
                      game.publishedTools.some(
                        (p) =>
                          p.toolType === "game_translation" &&
                          p.languageCode === l,
                      );
                    const active = targetLangs.includes(l);
                    return (
                      <button
                        type="button"
                        key={l}
                        disabled={disabled}
                        className={active ? "active" : ""}
                        onClick={() =>
                          setTargetLangs((v) =>
                            v.includes(l)
                              ? v.filter((x) => x !== l)
                              : [...v, l],
                          )
                        }
                      >
                        <span>{displayLanguageName(l)}</span>
                        {disabled ? (
                          <small>{t("native")}</small>
                        ) : active ? (
                          <Check size={15} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                {errors.languages && (
                  <p className="field-error">{errors.languages}</p>
                )}
              </div>
            )}
            {selected.includes("other") && (
              <div className="secondary">
                <label htmlFor="other">
                  <h3>{t("otherTitle")}</h3>
                </label>
                <textarea
                  id="other"
                  maxLength={500}
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  placeholder={t("otherPlaceholder")}
                />
                <div className="counter">{other.length}/500</div>
                {errors.other && <p className="field-error">{errors.other}</p>}
              </div>
            )}
            <div className="field">
              <label htmlFor="note">{t("note")}</label>
              <textarea
                id="note"
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("notePlaceholder")}
              />
              <div className="counter">{note.length}/500</div>
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <span className="step">04</span>
              <div>
                <h2>{t("contact")}</h2>
                <p>{t("contactHint")}</p>
              </div>
            </div>
            <div className="contact-row">
              <label>
                <span>{t("contactType")}</span>
                <select
                  value={contactType}
                  onChange={(e) => setContactType(e.target.value)}
                >
                  {contactOptions.map((x) => (
                    <option value={x} key={x}>
                      {t(`contactOption.${x}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("contact")}</span>
                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={
                    contactType === "email"
                      ? "name@example.com"
                      : t("contactPlaceholder")
                  }
                />
              </label>
            </div>
            {errors.contact && <p className="field-error">{errors.contact}</p>}
          </section>
          {duplicateNames.length > 0 && (
            <div className="duplicate">
              <AlertCircle size={18} />
              <div>
                {t("duplicate")} {duplicateNames.join("、")}
              </div>
            </div>
          )}
          <div className="submit-zone">
            <label className="confirm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>{t("confirm")}</span>
            </label>
            <button
              className="submit"
              disabled={!game || !confirmed || submitting}
              onClick={submit}
            >
              <Send size={18} />
              {submitting ? t("submitting") : t("submit")}
            </button>
          </div>
    </main>
  );
}
