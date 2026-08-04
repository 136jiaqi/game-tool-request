from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import json
import os
import re
import sqlite3

from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
import requests

load_dotenv(Path(__file__).with_name(".env"))
ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.getenv("DATABASE_PATH", ROOT / "data" / "xmodhub.db"))
WEB_DIR = Path(os.getenv("FRONTEND_DIR", ROOT / "dist"))
WEBHOOK = os.getenv("DINGTALK_WEBHOOK_URL", "").strip()
TRUST_PROXY = os.getenv("TRUST_PROXY_HEADERS", "true").lower() == "true"
ORIGINS = [x.strip() for x in os.getenv("ALLOWED_ORIGINS", "").split(",") if x.strip()]

LANG_CODES = {
    "english": "en", "simplified chinese": "zh-CN", "traditional chinese": "zh-TW",
    "japanese": "ja", "korean": "ko", "french": "fr", "german": "de",
    "spanish - spain": "es-ES", "spanish - latin america": "es-419",
    "portuguese - brazil": "pt-BR", "portuguese": "pt-PT",
    "portuguese - portugal": "pt-PT", "russian": "ru", "polish": "pl",
    "italian": "it", "dutch": "nl", "turkish": "tr", "thai": "th",
    "vietnamese": "vi", "indonesian": "id", "arabic": "ar",
}
LANG_NAMES = {
    "zh-CN": "简体中文", "zh-TW": "繁体中文", "en": "英语", "ja": "日语",
    "ko": "韩语", "fr": "法语", "de": "德语", "es-ES": "西班牙语（西班牙）",
    "es-419": "西班牙语（拉丁美洲）", "pt-BR": "葡萄牙语（巴西）",
    "pt-PT": "葡萄牙语（葡萄牙）", "ru": "俄语", "pl": "波兰语",
    "it": "意大利语", "nl": "荷兰语", "tr": "土耳其语", "th": "泰语",
    "vi": "越南语", "id": "印度尼西亚语", "ar": "阿拉伯语",
}
TOOL_NAMES = {
    "mod_install": "MOD一键安装", "interactive_map": "游戏互动地图",
    "screenshot_translation": "截图翻译", "memory_cleanup": "内存清理",
    "fps_graphics_master": "帧率画质大师", "win11_stutter_fix": "Win11卡顿修复",
    "runtime_error_fix": "C++/DX11异常修复", "stutter_diagnosis": "卡顿检测修复",
    "other": "其他工具",
}
CONTACT_NAMES = {"phone": "手机号", "wechat": "微信", "qq": "QQ", "email": "Email", "discord": "Discord"}
HEADERS = {"User-Agent": "Mozilla/5.0 XMODhubToolRequest/2.0"}

app = FastAPI(title="XMODhub Tool Request API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS or ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


def now_iso():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


@contextmanager
def db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=15)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    con.execute("PRAGMA busy_timeout=15000")
    try:
        yield con
    finally:
        con.close()


with db() as con:
    con.executescript(Path(__file__).with_name("schema.sql").read_text(encoding="utf-8"))
    con.commit()


def steam_details(app_id: str, language: str):
    res = requests.get(
        "https://store.steampowered.com/api/appdetails",
        params={"appids": app_id, "l": language, "cc": "us"},
        headers=HEADERS,
        timeout=15,
    )
    res.raise_for_status()
    result = res.json().get(app_id, {})
    if not result.get("success") or not result.get("data", {}).get("name"):
        raise ValueError("Steam game was not found")
    return result["data"]


def interface_languages(app_id: str):
    res = requests.get(
        f"https://store.steampowered.com/app/{app_id}/",
        params={"l": "english", "cc": "us"},
        headers=HEADERS,
        cookies={"birthtime": "568022401", "lastagecheckage": "1-January-1988", "wants_mature_content": "1"},
        timeout=20,
    )
    res.raise_for_status()
    table = BeautifulSoup(res.text, "html.parser").select_one("table.game_language_options")
    if table is None:
        raise ValueError("Steam language table was not returned")
    result = []
    for row in table.select("tr"):
        cells = row.select("td")
        if len(cells) < 2:
            continue
        cell = cells[1]
        checked = bool(
            cell.select_one("img") or cell.select_one(".checkmark")
            or "checkmark" in " ".join(cell.get("class", []))
            or "✔" in cell.get_text(" ", strip=True)
        )
        code = LANG_CODES.get(cells[0].get_text(" ", strip=True).lower()) if checked else None
        if code and code not in result:
            result.append(code)
    if not result:
        raise ValueError("No Steam interface languages were recognized")
    return result


def lookup_game(app_id: str):
    if not re.fullmatch(r"\d{1,12}", app_id):
        raise ValueError("Invalid Steam App ID")
    en = steam_details(app_id, "english")
    try:
        zh = steam_details(app_id, "schinese")
    except Exception:
        zh = None
    try:
        tw = steam_details(app_id, "tchinese")
    except Exception:
        tw = None
    return {
        "appId": app_id, "gameKey": f"steam-{app_id}", "nameEn": en["name"],
        "nameZhCn": (zh or en)["name"], "nameZhTw": (tw or zh or en)["name"],
        "coverUrl": "", "steamUrl": f"https://store.steampowered.com/app/{app_id}/",
        "releaseStatus": "coming_soon" if en.get("release_date", {}).get("coming_soon") else "released",
        "supportedLanguages": interface_languages(app_id), "publishedTools": [],
    }


def get_ip(request: Request):
    if TRUST_PROXY:
        for name in ("cf-connecting-ip", "x-real-ip"):
            if request.headers.get(name):
                return request.headers[name].strip()
        if request.headers.get("x-forwarded-for"):
            return request.headers["x-forwarded-for"].split(",", 1)[0].strip()
    return request.client.host if request.client else ""


def validate(payload):
    for key in ("submissionId", "anonymousId", "appId", "contactType", "contactValue"):
        if not str(payload.get(key, "")).strip():
            raise HTTPException(422, f"Missing field: {key}")
    items = payload.get("items")
    if not isinstance(items, list) or not items:
        raise HTTPException(422, "At least one request item is required")
    for item in items:
        if not isinstance(item, dict) or not item.get("requestId") or not item.get("toolType"):
            raise HTTPException(422, "Invalid request item")
    return payload.get("gameSnapshot") or {}, items


def save_submission(payload, request: Request):
    game, items = validate(payload)
    sid = str(payload["submissionId"])
    with db() as con:
        try:
            con.execute("BEGIN IMMEDIATE")
            con.execute(
                """INSERT INTO submissions (
                  submission_id,anonymous_id,app_id,game_name_zh_cn,game_name_zh_tw,
                  game_name_en,contact_type,contact_value,additional_note,source,
                  page_language,created_at,client_ip,client_country,payload_json
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (sid, str(payload["anonymousId"]), str(payload["appId"]),
                 str(game.get("nameZhCn") or game.get("nameEn") or ""),
                 str(game.get("nameZhTw") or game.get("nameEn") or ""),
                 str(game.get("nameEn") or ""), str(payload["contactType"]),
                 str(payload["contactValue"]), str(payload.get("additionalNote") or ""),
                 str(payload.get("source") or "web"), str(payload.get("pageLanguage") or "en"),
                 str(payload.get("createdAt") or now_iso()), get_ip(request), "",
                 json.dumps(payload, ensure_ascii=False)),
            )
            for item in items:
                con.execute(
                    """INSERT INTO request_items (
                      request_id,submission_id,tool_type,target_language,other_description,
                      user_status,internal_status,created_at,updated_at
                    ) VALUES (?,?,?,?,?,?,?,?,?)""",
                    (str(item["requestId"]), sid, str(item["toolType"]),
                     str(item.get("targetLanguage") or ""), str(item.get("otherDescription") or ""),
                     str(item.get("userStatus") or "submitted"), str(item.get("internalStatus") or "pending"),
                     str(item.get("createdAt") or payload.get("createdAt") or now_iso()),
                     str(item.get("updatedAt") or payload.get("createdAt") or now_iso())),
                )
            con.commit()
        except sqlite3.IntegrityError as exc:
            con.rollback()
            raise HTTPException(409, "Submission already exists") from exc
    return items


def ding_payload(payload, item):
    game = payload.get("gameSnapshot") or {}
    code = str(item.get("toolType") or "")
    language = str(item.get("targetLanguage") or "")
    tool = f"游戏翻译:{LANG_NAMES.get(language, language)}" if code == "game_translation" else TOOL_NAMES.get(code, "其他工具")
    ctype, cvalue = str(payload.get("contactType") or ""), str(payload.get("contactValue") or "")
    return {
        "event": "提交需求", "submission_id": str(payload.get("submissionId") or ""),
        "request_id": str(item.get("requestId") or ""), "anonymous_id": str(payload.get("anonymousId") or ""),
        "app_id": str(payload.get("appId") or ""),
        "game_name": str(game.get("nameZhCn") or game.get("nameEn") or ""),
        "game_name_en": str(game.get("nameEn") or ""),
        "steam_url": f"https://store.steampowered.com/app/{payload.get('appId') or ''}/",
        "tool_type": tool, "target_language": language,
        "other_description": str(item.get("otherDescription") or ""),
        "contact_type": ctype, "contact_value": cvalue,
        "contact": f"{CONTACT_NAMES.get(ctype, ctype)}:{cvalue}",
        "additional_note": str(payload.get("additionalNote") or ""),
        "page_language": str(payload.get("pageLanguage") or ""),
        "source": str(payload.get("source") or "web"),
        "user_status": str(item.get("userStatus") or "submitted"),
        "internal_status": str(item.get("internalStatus") or "pending"),
        "created_at": str(item.get("createdAt") or payload.get("createdAt") or now_iso()),
    }


def sync_dingtalk(payload, items):
    if not WEBHOOK:
        return "not_configured", "DINGTALK_WEBHOOK_URL is not configured", 0
    synced, errors = 0, []
    for item in items:
        try:
            res = requests.post(WEBHOOK, json=ding_payload(payload, item), headers=HEADERS, timeout=15)
            res.raise_for_status()
            synced += 1
        except Exception as exc:
            errors.append(str(exc)[:300])
    status = "success" if synced == len(items) else "partial" if synced else "failed"
    return status, " | ".join(errors)[:1000], synced


def sync_dingtalk_in_background(payload, items):
    """Synchronize after the database commit without blocking the browser response."""
    status, error, _ = sync_dingtalk(payload, items)
    with db() as con:
        con.execute(
            "UPDATE submissions SET webhook_status=?, webhook_error=? WHERE submission_id=?",
            (status, error, str(payload["submissionId"])),
        )
        con.commit()


@app.get("/api/health")
def health():
    with db() as con:
        con.execute("SELECT 1").fetchone()
    return {"ok": True, "database": "ok", "time": now_iso()}


@app.get("/api/steam/game/{app_id}")
def steam_game(app_id: str):
    try:
        return lookup_game(app_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    except requests.RequestException as exc:
        raise HTTPException(502, "Steam is temporarily unavailable") from exc


@app.post("/api/tool-requests")
async def submit(request: Request, background_tasks: BackgroundTasks):
    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(400, "Invalid JSON") from exc
    if not isinstance(payload, dict):
        raise HTTPException(400, "Invalid submission")
    items = save_submission(payload, request)
    background_tasks.add_task(sync_dingtalk_in_background, payload, items)
    return {"success": True, "saved": len(items), "webhookStatus": "pending"}


@app.get("/tool-request", include_in_schema=False)
def web_redirect():
    return RedirectResponse("/tool-request/", status_code=308)


@app.get("/tool-request/{asset_path:path}", include_in_schema=False)
def web(asset_path: str):
    index = WEB_DIR / "index.html"
    candidate = (WEB_DIR / asset_path).resolve()
    try:
        candidate.relative_to(WEB_DIR.resolve())
    except ValueError as exc:
        raise HTTPException(404) from exc
    if asset_path and candidate.is_file():
        return FileResponse(candidate)
    if not index.is_file():
        return JSONResponse(status_code=503, content={"error": "Frontend build missing; run npm run build"})
    return FileResponse(index)
