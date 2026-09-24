import axios from "axios";

// 生产期（同域下 /game/api）、开发期由 craco proxy 反代 :8001
export const API_BASE = "/game/api";
export const WS_URL_BASE =
  (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/game/ws";

export const http = axios.create({ baseURL: API_BASE, timeout: 8000 });
