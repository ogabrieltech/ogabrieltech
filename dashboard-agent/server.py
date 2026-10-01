from __future__ import annotations

import json
import os
import platform
import socket
import subprocess
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from pathlib import Path
from typing import Any

import psutil
import requests
from flask import Flask, abort, jsonify, request, send_file

BASE_DIR = Path(__file__).resolve().parent
DASHBOARD_FILE = BASE_DIR.parent / "dashboard" / "index.html"
SETUP_FILE = BASE_DIR / "setup.html"
CONFIG_FILE = BASE_DIR / "config.local.json"
PORT = int(os.environ.get("GTECH_DESK_PORT", "8765"))

DEFAULT_CONFIG: dict[str, Any] = {
    "todoist_token": "",
    "services": [
        {"name": "PuxAI", "platform": "Railway", "url": ""},
        {"name": "Nort", "platform": "Railway", "url": ""},
        {"name": "PCP360", "platform": "Railway", "url": ""},
        {"name": "ogabrieltech", "platform": "Railway", "url": "https://ogabrieltech.com.br"},
        {"name": "Vercel", "platform": "Vercel", "url": ""},
    ],
}

app = Flask(__name__)


def load_config() -> dict[str, Any]:
    if not CONFIG_FILE.exists():
        CONFIG_FILE.write_text(json.dumps(DEFAULT_CONFIG, ensure_ascii=False, indent=2), encoding="utf-8")
        return json.loads(json.dumps(DEFAULT_CONFIG))
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("invalid config")
        data.setdefault("todoist_token", "")
        data.setdefault("services", [])
        return data
    except Exception:
        return json.loads(json.dumps(DEFAULT_CONFIG))


def save_config(data: dict[str, Any]) -> None:
    CONFIG_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def is_local_request() -> bool:
    return request.remote_addr in {"127.0.0.1", "::1", None}


def lan_ip() -> str:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"


def get_temperature() -> dict[str, Any]:
    try:
        sensors = psutil.sensors_temperatures(fahrenheit=False)
        if sensors:
            preferred = ["coretemp", "k10temp", "cpu_thermal", "acpitz"]
            keys = preferred + [k for k in sensors if k not in preferred]
            for key in keys:
                entries = sensors.get(key) or []
                values = [float(x.current) for x in entries if getattr(x, "current", None) is not None]
                values = [v for v in values if 0 < v < 120]
                if values:
                    return {"value": round(max(values), 1), "source": "CPU"}
    except Exception:
        pass

    if platform.system() == "Windows":
        try:
            out = subprocess.check_output(
                [
                    "powershell",
                    "-NoProfile",
                    "-Command",
                    "(Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty CurrentTemperature)",
                ],
                text=True,
                timeout=3,
                stderr=subprocess.DEVNULL,
            ).strip()
            if out:
                value = (float(out) / 10.0) - 273.15
                if 0 < value < 120:
                    return {"value": round(value, 1), "source": "CPU/ACPI"}
        except Exception:
            pass

        try:
            out = subprocess.check_output(
                ["nvidia-smi", "--query-gpu=temperature.gpu", "--format=csv,noheader,nounits"],
                text=True,
                timeout=3,
                stderr=subprocess.DEVNULL,
            ).strip().splitlines()
            if out:
                value = float(out[0].strip())
                if 0 < value < 120:
                    return {"value": round(value, 1), "source": "GPU"}
        except Exception:
            pass

    return {"value": None, "source": "sensor indisponível"}


def get_system_metrics() -> dict[str, Any]:
    return {
        "cpu": round(psutil.cpu_percent(interval=0.15), 1),
        "ram": round(psutil.virtual_memory().percent, 1),
        "temperature": get_temperature(),
        "uptime_seconds": int(max(0, __import__("time").time() - psutil.boot_time())),
    }


def get_todoist(token: str) -> dict[str, Any]:
    token = (token or "").strip()
    if not token:
        return {"enabled": False, "tasks": [], "overdue": 0}
    try:
        response = requests.get(
            "https://api.todoist.com/api/v1/tasks/filter",
            headers={"Authorization": f"Bearer {token}"},
            params={"query": "today | overdue", "limit": 50},
            timeout=6,
        )
        response.raise_for_status()
        payload = response.json()
        items = payload.get("results", []) if isinstance(payload, dict) else payload
        today = date.today().isoformat()
        overdue = 0
        tasks = []
        priority_map = {4: "P1", 3: "P2", 2: "P3", 1: ""}
        for item in items or []:
            due = item.get("due") or {}
            due_date = str(due.get("date") or "")[:10]
            if due_date and due_date < today:
                overdue += 1
            tasks.append(
                {
                    "id": str(item.get("id", "")),
                    "content": item.get("content") or "Tarefa",
                    "due": due.get("string") or due_date or "hoje",
                    "priority": priority_map.get(int(item.get("priority") or 1), ""),
                }
            )
        tasks.sort(key=lambda x: (0 if x.get("priority") == "P1" else 1, x.get("due", "")))
        return {"enabled": True, "tasks": tasks[:12], "overdue": overdue}
    except Exception as exc:
        return {"enabled": True, "tasks": [], "overdue": 0, "error": str(exc)[:160]}


def check_one_service(service: dict[str, Any]) -> dict[str, Any]:
    name = str(service.get("name") or "Serviço")
    platform_name = str(service.get("platform") or "Serviço")
    url = str(service.get("url") or "").strip()
    if not url:
        return {"name": name, "platform": platform_name, "status": "CONFIGURAR", "url": ""}
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        response = requests.get(url, timeout=5, allow_redirects=True, headers={"User-Agent": "GTECH-Desk/1.0"})
        if 200 <= response.status_code < 400:
            status = "ONLINE"
        elif 400 <= response.status_code < 500:
            status = "ONLINE"
        else:
            status = "ERRO"
        return {"name": name, "platform": platform_name, "status": status, "url": url, "http": response.status_code}
    except Exception:
        return {"name": name, "platform": platform_name, "status": "OFFLINE", "url": url}


def check_services(services: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not services:
        return []
    with ThreadPoolExecutor(max_workers=min(8, max(1, len(services)))) as pool:
        return list(pool.map(check_one_service, services))


def weather_for(lat: str | None, lon: str | None) -> dict[str, Any] | None:
    if not lat or not lon:
        return None
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,weather_code",
                "timezone": "auto",
            },
            timeout=5,
        )
        response.raise_for_status()
        current = response.json().get("current") or {}
        code = int(current.get("weather_code", -1))
        labels = {
            0: "céu limpo",
            1: "quase limpo",
            2: "parcialmente nublado",
            3: "nublado",
            45: "neblina",
            48: "neblina",
            51: "garoa",
            53: "garoa",
            55: "garoa",
            61: "chuva",
            63: "chuva",
            65: "chuva forte",
            80: "pancadas",
            81: "pancadas",
            82: "pancadas fortes",
            95: "trovoadas",
        }
        temp = current.get("temperature_2m")
        return {"temperature": temp, "label": labels.get(code, "agora")}
    except Exception:
        return None


@app.get("/")
def dashboard():
    if not DASHBOARD_FILE.exists():
        return "dashboard/index.html não encontrado", 404
    return send_file(DASHBOARD_FILE)


@app.get("/setup")
def setup_page():
    if not is_local_request():
        abort(403)
    return send_file(SETUP_FILE)


@app.route("/api/config", methods=["GET", "POST"])
def config_api():
    if not is_local_request():
        abort(403)
    config = load_config()
    if request.method == "GET":
        return jsonify(
            {
                "todoist_configured": bool(config.get("todoist_token")),
                "services": config.get("services", []),
            }
        )

    payload = request.get_json(silent=True) or {}
    token = str(payload.get("todoist_token") or "").strip()
    if token:
        config["todoist_token"] = token
    if payload.get("clear_todoist") is True:
        config["todoist_token"] = ""

    services = payload.get("services")
    if isinstance(services, list):
        cleaned = []
        for service in services[:20]:
            if not isinstance(service, dict):
                continue
            cleaned.append(
                {
                    "name": str(service.get("name") or "Serviço")[:60],
                    "platform": str(service.get("platform") or "Outro")[:30],
                    "url": str(service.get("url") or "")[:500],
                }
            )
        config["services"] = cleaned

    save_config(config)
    return jsonify({"ok": True})


@app.get("/api/status")
def status_api():
    config = load_config()
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    with ThreadPoolExecutor(max_workers=3) as pool:
        todo_future = pool.submit(get_todoist, config.get("todoist_token", ""))
        services_future = pool.submit(check_services, config.get("services", []))
        weather_future = pool.submit(weather_for, lat, lon)
        system = get_system_metrics()
        todoist = todo_future.result()
        services = services_future.result()
        weather = weather_future.result()
    return jsonify({"system": system, "todoist": todoist, "services": services, "weather": weather})


@app.get("/api/ping")
def ping():
    return jsonify({"ok": True, "name": "GTECH Desk Agent"})


if __name__ == "__main__":
    ip = lan_ip()
    print("\nGTECH Desk Agent")
    print(f"PC:   http://127.0.0.1:{PORT}")
    print(f"Echo: http://{ip}:{PORT}")
    print("Configuração: abra /setup no próprio PC.\n")
    app.run(host="0.0.0.0", port=PORT, threaded=True, debug=False, use_reloader=False)
