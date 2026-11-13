import React, { act } from "react";
import { createRoot } from "react-dom/client";
import SubmissionsManager from "./SubmissionsManager";
import api from "./api";

jest.mock("./api", () => ({ __esModule: true, default: { get: jest.fn() } }));

global.IS_REACT_ACT_ENVIRONMENT = true;

test("historical XSS probes stay literal text in the table AND detail dialog", async () => {
  const probe = '<sCRiPt src=//probe.invalid/check></sCrIpT>';
  const handler = '<img src=x onerror="window.__xss=1">';
  const encoded = '&lt;svg/onload=alert(1)&gt;';
  api.get.mockResolvedValue({ data: [{
    id: "legacy-probe", kind: "contact", name: probe, contact: handler,
    email: encoded, message: `${probe}\n${handler}\n${encoded}`,
    created_at: "2026-11-13T01:37:03Z",
  }] });
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<SubmissionsManager />); });
    expect(host.querySelector("tbody").textContent).toContain(probe);
    expect(host.querySelector("tbody").textContent).toContain(handler);
    expect(host.querySelector("tbody").textContent).toContain(encoded);
    await act(async () => { host.querySelector('button[title="查看完整内容"]').click(); });
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog.textContent).toContain(probe);
    expect(dialog.textContent).toContain(handler);
    expect(dialog.textContent).toContain(encoded);
    expect(host.querySelector("script, img, svg[onload], [onerror]")).toBeNull();
    expect(window.__xss).toBeUndefined();
  } finally {
    await act(async () => { root.unmount(); });
    host.remove();
  }
});
