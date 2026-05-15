import React, { useEffect, useState } from "react";
import api from "./api";
import { Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { autoEnglishFromZh, autoId } from "./textAuto";

export default function TutorialManager() {
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [idTouched, setIdTouched] = useState(false);
  const [titleEnTouched, setTitleEnTouched] = useState(false);
  const [form, setForm] = useState({
    id: "",
    sort: 1000,
    status: "draft",
    title_zh: "",
    title_en: "",
    cloud_zh: "",
    cloud_en: "",
    url: "",
    tags: "",
  });
  const [importText, setImportText] = useState(
    JSON.stringify(
      {
        id: "t-sample-1",
        sort: 100,
        status: "draft",
        title_zh: "示例教程",
        title_en: "Sample Tutorial",
        cloud_zh: "百度云盘",
        cloud_en: "Baidu Pan",
        url: "https://example.com",
        tags: ["新手"],
      },
      null,
      2
    )
  );

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    try {
      const res = await api.get("/tutorials?limit=500&include_draft=true");
      setTutorials(res.data);
    } catch (err) {
      toast.error("获取教程列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("确定要删除该教程吗？操作不可逆！")) return;
    try {
      await api.delete(`/admin/tutorials/${id}`);
      toast.success("删除成功");
      fetchTutorials();
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
      await api.post("/admin/tutorials", payload);
      toast.success("已创建");
    } catch (err) {
      try {
        await api.put(`/admin/tutorials/${payload.id}`, payload);
        toast.success("已更新");
      } catch (err2) {
        toast.error("导入失败");
        return;
      }
    }
    setImportOpen(false);
    fetchTutorials();
  };

  const openCreate = () => {
    setFormMode("create");
    setIdTouched(false);
    setTitleEnTouched(false);
    setForm({
      id: "",
      sort: 1000,
      status: "draft",
      title_zh: "",
      title_en: "",
      cloud_zh: "",
      cloud_en: "",
      url: "",
      tags: "",
    });
    setFormOpen(true);
  };

  const openEdit = (tut) => {
    setFormMode("edit");
    setIdTouched(true);
    setTitleEnTouched(true);
    setForm({
      id: tut.id || "",
      sort: tut.sort ?? 1000,
      status: tut.status || "draft",
      title_zh: tut.title_zh || "",
      title_en: tut.title_en || "",
      cloud_zh: tut.cloud_zh || "",
      cloud_en: tut.cloud_en || "",
      url: tut.url || "",
      tags: Array.isArray(tut.tags) ? tut.tags.join(",") : "",
    });
    setFormOpen(true);
  };

  const handleFormSave = async () => {
    if (!form.id?.trim()) {
      toast.error("缺少 id");
      return;
    }
    if (!form.title_zh?.trim()) {
      toast.error("缺少标题");
      return;
    }
    if (!form.url?.trim()) {
      toast.error("缺少链接");
      return;
    }
    const payload = {
      id: form.id.trim(),
      sort: Number(form.sort) || 1000,
      status: form.status,
      title_zh: form.title_zh,
      title_en: form.title_en || "",
      cloud_zh: form.cloud_zh || "",
      cloud_en: form.cloud_en || "",
      url: form.url,
      tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
    };
    try {
      if (formMode === "create") {
        await api.post("/admin/tutorials", payload);
        toast.success("已创建");
      } else {
        await api.put(`/admin/tutorials/${payload.id}`, payload);
        toast.success("已更新");
      }
      setFormOpen(false);
      fetchTutorials();
    } catch (e) {
      toast.error("保存失败");
    }
  };

  if (loading) return <div className="text-neutral-400">加载中...</div>;

  return (
    <>
      <div className="bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50">
          <h2 className="text-xl font-bold text-white">教程管理</h2>
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
                <th className="px-6 py-4 font-medium">标题</th>
                <th className="px-6 py-4 font-medium">标签</th>
                <th className="px-6 py-4 font-medium">来源</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-700/50">
              {tutorials.map((tut) => (
                <tr key={tut.id} className="hover:bg-neutral-700/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-200">{tut.title_zh}</td>
                  <td className="px-6 py-4 text-neutral-400">
                    {(tut.tags || []).slice(0, 4).join("、") || "-"}
                  </td>
                  <td className="px-6 py-4 text-blue-400 hover:underline">
                    <a href={tut.url} target="_blank" rel="noopener noreferrer">
                      {tut.cloud_zh || "查看链接"}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-neutral-400">
                    <span
                      className={`px-2 py-1 rounded-md text-xs border ${
                        tut.status === "published"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                      }`}
                    >
                      {tut.status === "published" ? "已发布" : "草稿"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-neutral-400 text-sm whitespace-nowrap space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                      openEdit(tut);
                      }}
                      className="text-blue-300 hover:text-blue-200 transition-colors"
                      title="编辑"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tut.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {tutorials.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-neutral-500">
                    暂无教程数据
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
              <div className="text-white font-semibold">导入/更新教程（JSON）</div>
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
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-neutral-900 border border-neutral-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between">
              <div className="text-white font-semibold">
                {formMode === "create" ? "手动新增教程" : "编辑教程"}
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                关闭
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-neutral-400 mb-1">id</div>
                  <input
                    value={form.id}
                    disabled={formMode === "edit"}
                    onChange={(e) => {
                      setIdTouched(true);
                      setForm({ ...form, id: e.target.value });
                    }}
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
                  <div className="text-xs text-neutral-400 mb-1">标题(中文)</div>
                  <input
                    value={form.title_zh}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next = { ...form, title_zh: v };
                      if (formMode === "create" && !idTouched && (!next.id || next.id.startsWith("t-"))) {
                        next.id = autoId("t", v);
                      }
                      if (!titleEnTouched && !next.title_en) {
                        next.title_en = autoEnglishFromZh(v);
                      }
                      setForm(next);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">标题(英文)</div>
                  <input
                    value={form.title_en}
                    onChange={(e) => {
                      setTitleEnTouched(true);
                      setForm({ ...form, title_en: e.target.value });
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">来源(中文)</div>
                  <input
                    value={form.cloud_zh}
                    onChange={(e) => setForm({ ...form, cloud_zh: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">来源(英文)</div>
                  <input
                    value={form.cloud_en}
                    onChange={(e) => setForm({ ...form, cloud_en: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-400 mb-1">链接 URL</div>
                  <input
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-400 mb-1">标签(逗号分隔)</div>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
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
