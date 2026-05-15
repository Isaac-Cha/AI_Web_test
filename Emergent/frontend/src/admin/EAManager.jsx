import React, { useEffect, useState } from "react";
import api from "./api";
import { Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function EAManager() {
  const [eas, setEas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [form, setForm] = useState({
    id: "",
    sort: 1000,
    status: "draft",
    name_zh: "",
    name_en: "",
    symbol: "XAUUSD",
    platform: "MT5",
    profit_monthly: "",
    max_drawdown: "",
    risk_level: "",
    min_capital: "",
    strategy_zh: "",
    strategy_en: "",
    cooperation_zh: "",
    cooperation_en: "",
    cover: "",
    features_zh: "",
    features_en: "",
    setup_zh: "",
    setup_en: "",
  });
  const [importText, setImportText] = useState(
    JSON.stringify(
      {
        id: "ea-sample-1",
        sort: 100,
        status: "draft",
        name_zh: "示例EA",
        name_en: "Sample EA",
        symbol: "XAUUSD",
        platform: "MT5",
        profit_monthly: "0%",
        max_drawdown: "0%",
        risk_level: "中",
        strategy_zh: "",
        strategy_en: "",
        min_capital: "",
        cooperation_zh: "",
        cooperation_en: "",
        cover: "",
        features_zh: [],
        features_en: [],
        setup_zh: "",
        setup_en: "",
        accounts: [],
      },
      null,
      2
    )
  );

  useEffect(() => {
    fetchEAs();
  }, []);

  const fetchEAs = async () => {
    try {
      const res = await api.get("/eas?limit=500&include_draft=true");
      setEas(res.data);
    } catch (err) {
      toast.error("获取EA列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("确定要删除该 EA 吗？操作不可逆！")) return;
    try {
      await api.delete(`/admin/eas/${id}`);
      toast.success("删除成功");
      fetchEAs();
    } catch (err) {
      toast.error("删除失败");
    }
  };

  const handleImport = async () => {
    let payload;
    try {
      payload = JSON.parse(importText);
    } catch (e) {
      toast.error("JSON 格式错误");
      return;
    }
    if (!payload?.id) {
      toast.error("缺少 id 字段");
      return;
    }
    try {
      await api.post("/admin/eas", payload);
      toast.success("已创建");
    } catch (err) {
      try {
        await api.put(`/admin/eas/${payload.id}`, payload);
        toast.success("已更新");
      } catch (err2) {
        toast.error("导入失败");
        return;
      }
    }
    setImportOpen(false);
    fetchEAs();
  };

  const openCreate = () => {
    setFormMode("create");
    setForm({
      id: "",
      sort: 1000,
      status: "draft",
      name_zh: "",
      name_en: "",
      symbol: "XAUUSD",
      platform: "MT5",
      profit_monthly: "",
      max_drawdown: "",
      risk_level: "",
      min_capital: "",
      strategy_zh: "",
      strategy_en: "",
      cooperation_zh: "",
      cooperation_en: "",
      cover: "",
      features_zh: "",
      features_en: "",
      setup_zh: "",
      setup_en: "",
    });
    setFormOpen(true);
  };

  const openEdit = (ea) => {
    setFormMode("edit");
    setForm({
      id: ea.id || "",
      sort: ea.sort ?? 1000,
      status: ea.status || "draft",
      name_zh: ea.name_zh || "",
      name_en: ea.name_en || "",
      symbol: ea.symbol || "XAUUSD",
      platform: ea.platform || "MT5",
      profit_monthly: ea.profit_monthly || "",
      max_drawdown: ea.max_drawdown || "",
      risk_level: ea.risk_level || "",
      min_capital: ea.min_capital || "",
      strategy_zh: ea.strategy_zh || "",
      strategy_en: ea.strategy_en || "",
      cooperation_zh: ea.cooperation_zh || "",
      cooperation_en: ea.cooperation_en || "",
      cover: ea.cover || "",
      features_zh: Array.isArray(ea.features_zh) ? ea.features_zh.join(",") : "",
      features_en: Array.isArray(ea.features_en) ? ea.features_en.join(",") : "",
      setup_zh: ea.setup_zh || "",
      setup_en: ea.setup_en || "",
    });
    setFormOpen(true);
  };

  const handleFormSave = async () => {
    if (!form.id?.trim()) {
      toast.error("缺少 id");
      return;
    }
    if (!form.name_zh?.trim()) {
      toast.error("缺少名称");
      return;
    }
    const payload = {
      id: form.id.trim(),
      sort: Number(form.sort) || 1000,
      status: form.status,
      name_zh: form.name_zh,
      name_en: form.name_en,
      symbol: form.symbol,
      platform: form.platform,
      profit_monthly: form.profit_monthly,
      max_drawdown: form.max_drawdown,
      risk_level: form.risk_level,
      min_capital: form.min_capital,
      strategy_zh: form.strategy_zh,
      strategy_en: form.strategy_en,
      cooperation_zh: form.cooperation_zh,
      cooperation_en: form.cooperation_en,
      cover: form.cover,
      setup_zh: form.setup_zh,
      setup_en: form.setup_en,
      features_zh: form.features_zh
        ? form.features_zh.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      features_en: form.features_en
        ? form.features_en.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };
    try {
      if (formMode === "create") {
        await api.post("/admin/eas", payload);
        toast.success("已创建");
      } else {
        await api.put(`/admin/eas/${payload.id}`, payload);
        toast.success("已更新");
      }
      setFormOpen(false);
      fetchEAs();
    } catch (e) {
      toast.error("保存失败");
    }
  };

  if (loading) return <div className="text-neutral-400">加载中...</div>;

  return (
    <>
      <div className="bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50">
          <h2 className="text-xl font-bold text-white">EA 策略管理</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 rounded-xl bg-green-500/15 text-green-300 border border-green-500/30 hover:bg-green-500/20 transition-colors text-sm"
            >
              手动新增
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-colors text-sm"
            >
              导入 JSON
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-900/50 text-neutral-400 text-sm border-b border-neutral-700">
                <th className="px-6 py-4 font-medium">名称</th>
                <th className="px-6 py-4 font-medium">品种</th>
                <th className="px-6 py-4 font-medium">平台</th>
                <th className="px-6 py-4 font-medium">月化收益</th>
                <th className="px-6 py-4 font-medium">最大回撤</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-700/50">
              {eas.map((ea) => (
                <tr key={ea.id} className="hover:bg-neutral-700/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-200">{ea.name_zh}</td>
                  <td className="px-6 py-4 text-neutral-300">{ea.symbol}</td>
                  <td className="px-6 py-4 text-neutral-400">{ea.platform}</td>
                  <td className="px-6 py-4 text-green-400">{ea.profit_monthly}</td>
                  <td className="px-6 py-4 text-red-400">{ea.max_drawdown}</td>
                  <td className="px-6 py-4 text-neutral-400">
                    <span
                      className={`px-2 py-1 rounded-md text-xs border ${
                        ea.status === "published"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }`}
                    >
                      {ea.status === "published" ? "已发布" : "草稿"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-400 text-sm whitespace-nowrap space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                      openEdit(ea);
                      }}
                      className="text-blue-300 hover:text-blue-200 transition-colors"
                      title="编辑"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ea.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {eas.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-neutral-500">
                    暂无 EA 数据，请使用分析工具导入或通过 API 创建
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl rounded-2xl bg-neutral-900 border border-neutral-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between">
              <div className="text-white font-semibold">导入/更新 EA（JSON）</div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                关闭
              </button>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full h-80 bg-neutral-950 border border-neutral-700 rounded-xl p-4 font-mono text-xs text-neutral-200"
                spellCheck={false}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setImportOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  className="px-4 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-400"
                >
                  导入
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl rounded-2xl bg-neutral-900 border border-neutral-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between">
              <div className="text-white font-semibold">
                {formMode === "create" ? "手动新增 EA" : "编辑 EA"}
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                关闭
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-400 mb-1">id</div>
                  <input
                    value={form.id}
                    disabled={formMode === "edit"}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200 disabled:opacity-60"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">状态</div>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  >
                    <option value="draft">草稿</option>
                    <option value="published">已发布</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">名称(中文)</div>
                  <input
                    value={form.name_zh}
                    onChange={(e) => setForm({ ...form, name_zh: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">名称(英文)</div>
                  <input
                    value={form.name_en}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">品种</div>
                  <input
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">平台</div>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  >
                    <option value="MT4">MT4</option>
                    <option value="MT5">MT5</option>
                  </select>
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">月化收益</div>
                  <input
                    value={form.profit_monthly}
                    onChange={(e) => setForm({ ...form, profit_monthly: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">最大回撤</div>
                  <input
                    value={form.max_drawdown}
                    onChange={(e) => setForm({ ...form, max_drawdown: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">风险等级</div>
                  <input
                    value={form.risk_level}
                    onChange={(e) => setForm({ ...form, risk_level: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">起投资金</div>
                  <input
                    value={form.min_capital}
                    onChange={(e) => setForm({ ...form, min_capital: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">排序 sort</div>
                  <input
                    value={form.sort}
                    onChange={(e) => setForm({ ...form, sort: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">封面 URL</div>
                  <input
                    value={form.cover}
                    onChange={(e) => setForm({ ...form, cover: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-400 mb-1">亮点(中文, 逗号分隔)</div>
                  <input
                    value={form.features_zh}
                    onChange={(e) => setForm({ ...form, features_zh: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">亮点(英文, 逗号分隔)</div>
                  <input
                    value={form.features_en}
                    onChange={(e) => setForm({ ...form, features_en: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-400 mb-1">策略说明(中文)</div>
                  <textarea
                    value={form.strategy_zh}
                    onChange={(e) => setForm({ ...form, strategy_zh: e.target.value })}
                    className="w-full h-28 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">策略说明(英文)</div>
                  <textarea
                    value={form.strategy_en}
                    onChange={(e) => setForm({ ...form, strategy_en: e.target.value })}
                    className="w-full h-28 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">合作方式(中文)</div>
                  <textarea
                    value={form.cooperation_zh}
                    onChange={(e) => setForm({ ...form, cooperation_zh: e.target.value })}
                    className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">合作方式(英文)</div>
                  <textarea
                    value={form.cooperation_en}
                    onChange={(e) => setForm({ ...form, cooperation_en: e.target.value })}
                    className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">安装说明(中文)</div>
                  <textarea
                    value={form.setup_zh}
                    onChange={(e) => setForm({ ...form, setup_zh: e.target.value })}
                    className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">安装说明(英文)</div>
                  <textarea
                    value={form.setup_en}
                    onChange={(e) => setForm({ ...form, setup_en: e.target.value })}
                    className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleFormSave}
                  className="px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-400"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
