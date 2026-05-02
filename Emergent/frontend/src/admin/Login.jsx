import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import api from "./api";

export default function Login() {
  const [token, setToken] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;

    try {
      // Test token by fetching submissions or something that requires admin
      const res = await api.get("/submissions", {
        headers: { "x-admin-token": token },
      });
      if (res.status === 200) {
        localStorage.setItem("admin_token", token);
        toast.success("登录成功");
        navigate("/admin");
      }
    } catch (err) {
      toast.error("登录失败：Token 无效");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="bg-neutral-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-neutral-700">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">Emergent Admin</h1>
          <p className="text-neutral-400 mt-2 text-sm">请输入管理员 Token 进行身份验证</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ADMIN_TOKEN"
              className="w-full bg-neutral-900 border border-neutral-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors"
          >
            进入系统
          </button>
        </form>
      </div>
    </div>
  );
}
