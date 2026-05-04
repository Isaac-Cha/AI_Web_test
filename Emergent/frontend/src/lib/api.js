export function getBackendBase() {
  const raw = (process.env.REACT_APP_BACKEND_URL || "").trim();
  if (!raw || raw === "undefined" || raw === "null") return "";
  return raw.replace(/\/+$/, "");
}

export const API = `${getBackendBase()}/api`;
