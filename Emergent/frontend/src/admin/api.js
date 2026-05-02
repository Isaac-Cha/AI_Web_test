import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";

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
