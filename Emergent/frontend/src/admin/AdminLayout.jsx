import React, { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { MessageSquare, LayoutDashboard, Settings2, BarChart2, BookOpen, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    toast.success("已登出");
    navigate("/admin/login");
  };

  const navItems = [
    { path: "/admin", icon: <LayoutDashboard size={20} />, label: "总览 (Overview)" },
    { path: "/admin/submissions", icon: <MessageSquare size={20} />, label: "留言与申请" },
    { path: "/admin/eas", icon: <Settings2 size={20} />, label: "EA 管理" },
    { path: "/admin/indicators", icon: <BarChart2 size={20} />, label: "指标管理" },
    { path: "/admin/tutorials", icon: <BookOpen size={20} />, label: "教程管理" },
  ];

  return (
    <div className="flex h-screen bg-neutral-900 text-white font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-neutral-800">
          <span className="text-lg font-bold text-blue-400">Emergent Admin</span>
        </div>
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-neutral-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">退出登录</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center px-8 shadow-sm">
          <h2 className="text-xl font-semibold text-white">
            {navItems.find((i) => i.path === location.pathname)?.label || "管理控制台"}
          </h2>
        </header>
        <main className="flex-1 overflow-y-auto p-8 bg-neutral-900">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
