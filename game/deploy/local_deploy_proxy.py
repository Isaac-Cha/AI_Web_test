"""Local reverse proxy that simulates production Nginx routing (3 locations).

Serves on http://127.0.0.1:3003

  - /game/api/<rest>   --> http://127.0.0.1:8001/game/api/<rest>  (HTTP proxy)
  - /game/ws/<rest>    --> ws://127.0.0.1:8001/game/ws/<rest>    (HTTP -> WebSocket upgrade)
  - /game/<rest>       --> STATIC_ROOT = d:\\Aiproject1\\EA\\website\\game\\frontend\\build
                         (try_files $uri $uri/ /game/index.html)
  - /                  --> 302 to /game/
"""
from __future__ import annotations

import mimetypes
import os
import socket
import sys
import time as _time
import traceback as _tb
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

# ---- config ----
BACKEND_HTTP = "http://127.0.0.1:8001"
STATIC_ROOT = Path(__file__).resolve().parent.parent / "frontend" / "build"
LISTEN = ("127.0.0.1", 3003)
BACKEND_WS = "ws://127.0.0.1:8001"
LOG_FILE = str(Path(__file__).resolve().parent / "proxy-dev.log")

# ---- boot banner (always write log) ----
try:
    with open(LOG_FILE, "a", encoding="utf-8") as _f:
        _f.write(f"\n=== local_deploy_proxy starting at {__import__('datetime').datetime.now()} ===\n")
except Exception:  # noqa: BLE001
    pass

# ---- ensure static dir has index.html ----
if not (STATIC_ROOT / "index.html").exists():
    print(f"[deploy-proxy] ERROR static index.html missing at {STATIC_ROOT}",
          file=sys.stderr)
    sys.exit(2)


def _proxy_http(method: str, path: str, headers: dict, body: bytes):
    """Forward a normal HTTP request to backend and return (status, rheaders, rbody)."""
    url = BACKEND_HTTP + path
    req = urllib.request.Request(url=url, data=body or None, method=method)
    for k, v in headers.items():
        if k.lower() in ("host", "content-length", "connection",
                         "keep-alive", "upgrade", "proxy-connection", "te",
                         "trailer", "transfer-encoding"):
            continue
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            rheaders = {k: v for k, v in resp.headers.items()}
            return resp.status, rheaders, resp.read()
    except urllib.error.HTTPError as e:
        rheaders = {k: v for k, v in (e.headers or {}).items()}
        return e.code, rheaders, e.read() or b""
    except Exception as e:  # noqa: BLE001
        return 502, {"Content-Type": "application/json"}, \
               f'{{"ok":false,"error":"backend_connect_failed:{e}"}}'.encode()


def _relay_sock(left: socket.socket, right: socket.socket):
    """Tee bytes between two sockets until both close; each-direction thread."""
    def _pump(src: socket.socket, dst: socket.socket):
        try:
            while True:
                chunk = src.recv(1 << 15)
                if not chunk:
                    break
                dst.sendall(chunk)
        except OSError:
            pass
        finally:
            try:
                src.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            try:
                dst.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass

    import threading
    t1 = threading.Thread(target=_pump, args=(left, right), daemon=True)
    t2 = threading.Thread(target=_pump, args=(right, left), daemon=True)
    t1.start()
    t2.start()
    t1.join(timeout=3600)
    t2.join(timeout=3600)


def _proxy_ws(path: str, handler: BaseHTTPRequestHandler):
    """WebSocket upgrade relay. handler has already sent 101 switching."""
    try:
        # connect to backend via raw socket + issue upgrade request
        parsed = urlparse(BACKEND_WS)
        host = parsed.hostname or "127.0.0.1"
        port = parsed.port or 80
        tag = f"[proxy-ws {path}]"
        with open(LOG_FILE, "a", encoding="utf-8") as _f:
            _f.write(tag + f" connect backend {host}:{port}\n")
        be = socket.create_connection((host, port), timeout=10)
        # build upgrade request to backend
        req_lines = [f"GET {path} HTTP/1.1"]
        req_lines.append(f"Host: {host}:{port}")
        # copy upgrade headers from client
        for k, v in handler.headers.items():
            kl = k.lower()
            if kl in ("host", "content-length",):
                continue
            if kl in ("upgrade", "connection", "sec-websocket-key",
                      "sec-websocket-version", "sec-websocket-protocol",
                      "sec-websocket-extensions", "origin",
                      "user-agent", "accept-encoding", "accept-language"):
                req_lines.append(f"{k}: {v}")
        req_lines.append("Connection: Upgrade")
        req_lines.append("\r\n")
        req_bytes = ("\r\n".join(req_lines)).encode()
        with open(LOG_FILE, "a", encoding="utf-8") as _f:
            _f.write(tag + f" send upgrade req {len(req_bytes)} bytes\n")
        be.sendall(req_bytes)
        # read backend 101 response line and headers
        buf = b""
        start_ts = _time.time()
        while b"\r\n\r\n" not in buf and _time.time() - start_ts < 12:
            try:
                be.settimeout(2.0)
                chunk = be.recv(4096)
            except socket.timeout:
                continue
            if not chunk:
                break
            buf += chunk
            if len(buf) > 65536:
                break
        if b"\r\n\r\n" not in buf:
            with open(LOG_FILE, "a", encoding="utf-8") as _f:
                _f.write(tag + f" backend no 101, head buf={buf[:300]!r}\n")
            return
        head, extra = buf.split(b"\r\n\r\n", 1)
        with open(LOG_FILE, "a", encoding="utf-8") as _f:
            _f.write(tag + f" backend upgrade: {head.decode('utf-8', errors='replace')[:300]!r} extra={len(extra)}\n")
        client = handler.request
        if extra:
            client.sendall(extra)
        _relay_sock(client, be)
    except Exception as e:  # noqa: BLE001
        with open(LOG_FILE, "a", encoding="utf-8") as _f:
            _f.write(f"[proxy-ws {path}] EXCEPTION: {e}\n")
            _f.write(_tb.format_exc() + "\n")
        try:
            handler.request.sendall(
                f"HTTP/1.1 502 Bad Gateway\r\n"
                f"Content-Type: text/plain\r\n"
                f"Content-Length: {len(str(e))}\r\n\r\n{e}".encode()
            )
        except OSError:
            pass


def _serve_static(rel: str, handler: BaseHTTPRequestHandler):
    # rel like "", "index.html", "static/js/xxx.chunk.js"
    target = STATIC_ROOT / rel if rel else STATIC_ROOT / "index.html"
    try:
        # safety: prevent escape
        target_resolved = target.resolve()
        if not str(target_resolved).startswith(str(STATIC_ROOT.resolve())):
            handler.send_error(403)
            return
        if target_resolved.is_dir():
            target_resolved = target_resolved / "index.html"
        if not target_resolved.exists():
            # SPA fallback -> /game/index.html
            target_resolved = STATIC_ROOT / "index.html"
        data = target_resolved.read_bytes()
        ctype, _ = mimetypes.guess_type(str(target_resolved))
        ctype = ctype or "application/octet-stream"
        handler.send_response(200)
        handler.send_header("Content-Type", ctype)
        handler.send_header("Content-Length", str(len(data)))
        handler.send_header("Cache-Control",
                            "no-cache" if target_resolved.name == "index.html"
                            else "public, max-age=31536000, immutable")
        handler.end_headers()
        handler.wfile.write(data)
    except Exception as e:  # noqa: BLE001
        handler.send_error(500, f"static error: {e}")


class Handler(BaseHTTPRequestHandler):
    server_version = "DeploySimulator/1.0"

    def log_message(self, fmt, *args):  # noqa: D401
        line = "[proxy] " + (fmt % args) + "\n"
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line)
        except Exception:  # noqa: BLE001
            pass
        sys.stderr.write(line)
        sys.stderr.flush()
        return

    def log_error(self, fmt, *args):  # noqa: D401
        line = "[proxy-err] " + (fmt % args) + "\n"
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line)
        except Exception:  # noqa: BLE001
            pass
        sys.stderr.write(line)
        sys.stderr.flush()
        return

    # -------- HTTP verbs --------
    def do_GET(self):  # noqa: N802
        self._route()

    def do_POST(self):  # noqa: N802
        self._route()

    def do_PUT(self):  # noqa: N802
        self._route()

    def do_DELETE(self):  # noqa: N802
        self._route()

    def do_PATCH(self):  # noqa: N802
        self._route()

    def do_OPTIONS(self):  # noqa: N802
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods",
                         "GET,POST,PUT,DELETE,PATCH,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type,Authorization")
        self.end_headers()

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0:
            return b""
        return self.rfile.read(length)

    def _is_upgrade(self) -> bool:
        conn = (self.headers.get("Connection") or "").lower()
        up = (self.headers.get("Upgrade") or "").lower()
        return "upgrade" in conn and "websocket" in up

    def _route(self):
        path = self.path.split("?", 1)[0]
        # ---- root redirect ----
        if path in ("", "/"):
            self.send_response(302)
            self.send_header("Location", "/game/")
            self.end_headers()
            return
        # ---- WS ----
        if path.startswith("/game/ws/") and self._is_upgrade():
            with open(LOG_FILE, "a", encoding="utf-8") as _f:
                _f.write(f"[proxy] UPGRADE {path} from {self.client_address}\n")
            # reply 101 switching protocols to client, then relay
            key = self.headers.get("Sec-WebSocket-Key", "")
            self.send_response(101)
            self.send_header("Upgrade", "websocket")
            self.send_header("Connection", "Upgrade")
            # just echo the computed accept via minimal calculation (optional but kind)
            import base64, hashlib  # local to save startup
            guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
            acc = base64.b64encode(hashlib.sha1(
                (key + guid).encode()).digest()).decode()
            self.send_header("Sec-WebSocket-Accept", acc)
            proto = self.headers.get("Sec-WebSocket-Protocol")
            if proto:
                self.send_header("Sec-WebSocket-Protocol", proto.split(",")[0].strip())
            self.end_headers()
            with open(LOG_FILE, "a", encoding="utf-8") as _f:
                _f.write(f"[proxy] UPGRADE REPLIED 101 {path}, relay begin\n")
            _proxy_ws(self.path, self)
            with open(LOG_FILE, "a", encoding="utf-8") as _f:
                _f.write(f"[proxy] UPGRADE EXIT {path}\n")
            return
        # ---- HTTP API proxy ----
        if path.startswith("/game/api/"):
            body = self._read_body()
            headers = {k: v for k, v in self.headers.items()}
            status, rheaders, rbody = _proxy_http(self.command, self.path,
                                                  headers, body)
            try:
                self.send_response(status)
                for k, v in rheaders.items():
                    if k.lower() in ("transfer-encoding", "connection",
                                     "keep-alive"):
                        continue
                    # urllib may return multiple headers under same key; flatten
                    vals = v if isinstance(v, list) else [v]
                    for single in vals:
                        self.send_header(k, str(single))
                if "Content-Length" not in [k.lower() for k in rheaders.keys()]:
                    self.send_header("Content-Length", str(len(rbody)))
                self.end_headers()
                self.wfile.write(rbody)
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        # ---- static /game/* ----
        if path == "/game" or path == "/game/":
            _serve_static("index.html", self)
            return
        if path.startswith("/game/"):
            rel = path[len("/game/"):]
            _serve_static(rel, self)
            return
        # anything else 302 to /game/
        self.send_response(302)
        self.send_header("Location", "/game/")
        self.end_headers()


def main():
    server = ThreadingHTTPServer(LISTEN, Handler)
    for line in [
        f"[deploy-proxy] listening on http://{LISTEN[0]}:{LISTEN[1]}/game/",
        f"[deploy-proxy] static root = {STATIC_ROOT}",
        f"[deploy-proxy] /game/api/* -> {BACKEND_HTTP}/game/api/*",
        f"[deploy-proxy] /game/ws/*  -> {BACKEND_WS}/game/ws/*",
    ]:
        print(line, flush=True)
        try:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line + "\n")
        except Exception:  # noqa: BLE001
            pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
