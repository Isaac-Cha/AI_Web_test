import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const VERSIONS = [
  { path: "/", label: "Sci-Fi", prefix: "" },
  { path: "/apple", label: "Apple", prefix: "/apple" },
  { path: "/hybrid", label: "Hybrid", prefix: "/hybrid" },
];

/**
 * Figure out the active version based on the current path's prefix.
 */
function activeVersion(pathname) {
  if (pathname.startsWith("/apple")) return VERSIONS[1];
  if (pathname.startsWith("/hybrid")) return VERSIONS[2];
  return VERSIONS[0];
}

/**
 * Re-map the current path so the sub-route is preserved across versions.
 * "/ea/foo"       -> "/apple/ea/foo"
 * "/hybrid/ea"    -> "/ea"
 * "/apple"        -> "/"
 */
function remapPath(currentPath, fromPrefix, toPrefix) {
  let rest = currentPath;
  if (fromPrefix && rest.startsWith(fromPrefix)) {
    rest = rest.slice(fromPrefix.length);
  }
  if (!rest || rest === "") rest = "/";
  if (toPrefix === "") return rest;
  if (rest === "/") return toPrefix;
  return toPrefix + rest;
}

export default function VersionSwitcher({ dark = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = activeVersion(pathname);

  const go = (target) => {
    if (target.path === active.path && pathname === active.path) return;
    const newPath = remapPath(pathname, active.prefix, target.prefix);
    navigate(newPath);
  };

  return (
    <div
      data-testid="version-switcher"
      className={`inline-flex items-center rounded-full p-1 border ${
        dark ? "bg-black/40 border-white/10 backdrop-blur" : "bg-black/5 border-black/10"
      }`}
    >
      {VERSIONS.map((v) => {
        const isActive = v.path === active.path;
        return (
          <button
            key={v.path}
            onClick={() => go(v)}
            data-testid={`version-link-${v.label.toLowerCase()}`}
            className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-widest uppercase transition-colors ${
              isActive
                ? dark ? "bg-white text-black" : "bg-black text-white"
                : dark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-black"
            }`}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

/** Hook exposing the current variant for use by sub-pages. */
export function useVariant() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/apple")) return "apple";
  if (pathname.startsWith("/hybrid")) return "hybrid";
  return "scifi";
}

/** Helper: prefix an internal path with the current variant prefix. */
export function useHref() {
  const variant = useVariant();
  const prefix = variant === "apple" ? "/apple" : variant === "hybrid" ? "/hybrid" : "";
  return (to) => {
    if (!to) return to;
    if (to === "/") return prefix || "/";
    return prefix + to;
  };
}
