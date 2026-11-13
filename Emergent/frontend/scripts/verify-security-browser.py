"""Optional production smoke test. Requires Python Playwright + Chromium.

All API calls are mocked; no connection to the production site or probe host.
Run after npm run build, from any directory.
"""
import json
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright


class SPAHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?", 1)[0].startswith("/admin"):
            self.path = "/index.html"
        super().do_GET()

    def log_message(self, *args):
        pass


def main():
    build = Path(__file__).resolve().parents[1] / "build"
    if not (build / "index.html").exists():
        raise RuntimeError("Run npm run build first")
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(SPAHandler, directory=str(build)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    probe = '<sCRiPt src=//probe.invalid/check></sCrIpT>'
    image = '<img src=x onerror="window.__xss=1">'
    row = {"id": "legacy", "kind": "contact", "name": probe, "contact": image,
           "email": "&lt;svg/onload=alert(1)&gt;", "message": probe + "\n" + image,
           "created_at": "2026-11-13T01:37:03Z"}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            try:
                page = browser.new_page()
                # Fail closed for every nonlocal request, including fonts.
                def route_request(route):
                    if "/api/" in route.request.url:
                        route.fulfill(status=200, content_type="application/json", body=json.dumps([row]))
                    elif route.request.url.startswith(f"http://127.0.0.1:{server.server_port}/"):
                        route.continue_()
                    else:
                        route.abort()
                page.route("**/*", route_request)
                page.add_init_script("""localStorage.setItem('admin_token', 'local-test-token');
                    window.__violations = [];
                    document.addEventListener('securitypolicyviolation', e =>
                        window.__violations.push({directive:e.effectiveDirective, blocked:e.blockedURI}));
                """)
                page.goto(f"http://127.0.0.1:{server.server_port}/admin/submissions")
                page.locator("tbody tr").first.wait_for()
                assert probe in page.locator("tbody").inner_text()
                assert image in page.locator("tbody").inner_text()
                page.get_by_title("查看完整内容").click()
                dialog = page.get_by_role("dialog")
                assert probe in dialog.inner_text()
                assert image in dialog.inner_text()
                assert dialog.locator("script, img, [onerror], [onload]").count() == 0
                assert page.evaluate("window.__xss === undefined")
                # Deliberately insert inert proof-of-execution markers. CSP must
                # block both inline JS and an external script before fetching it.
                page.evaluate("""() => {
                    let inline = document.createElement('script');
                    inline.textContent = 'window.__inlineXss = 1';
                    document.body.appendChild(inline);
                    let external = document.createElement('script');
                    external.src = 'https://probe.invalid/check';
                    document.body.appendChild(external);
                    let image = document.createElement('img');
                    image.setAttribute('onerror', 'window.__handlerXss = 1');
                    document.body.appendChild(image);
                    image.dispatchEvent(new Event('error'));
                }""")
                page.wait_for_function("window.__violations.filter(v => v.directive.startsWith('script-src')).length >= 3")
                assert page.evaluate("window.__inlineXss === undefined && window.__handlerXss === undefined")
                violations = page.evaluate("window.__violations")
                assert any(v["blocked"] == "https://probe.invalid/check" for v in violations)
                assert any(v["directive"] == "script-src-attr" for v in violations)
                print("PASS: production app loaded; historical probes are text; CSP blocked external JS, inline JS and handlers.")
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == "__main__":
    main()
