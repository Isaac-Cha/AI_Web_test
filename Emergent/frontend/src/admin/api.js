import axios from "axios";
import { getBackendBase } from "@/lib/api";

const API_URL = getBackendBase();

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers["x-admin-token"] = token;
  }
  return config;
});

export default api;
