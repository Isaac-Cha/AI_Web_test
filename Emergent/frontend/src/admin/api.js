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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      window.location.pathname !== "/admin/login"
    ) {
      localStorage.removeItem("admin_token");
      sessionStorage.setItem(
        "admin_auth_notice",
        "管理员凭据已失效，请使用当前服务器的 ADMIN_TOKEN 重新登录"
      );
      window.location.assign("/admin/login");
    }
    return Promise.reject(error);
  }
);

export default api;
