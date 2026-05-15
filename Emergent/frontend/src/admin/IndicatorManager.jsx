import React, { useEffect, useState } from "react";
import api from "./api";
import { Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { autoEnglishFromZh, autoId } from "./textAuto";

export default function IndicatorManager() {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [idTouched, setIdTouched] = useState(false);
  const [nameEnTouched, setNameEnTouched] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingScreens, setUploadingScreens] = useState(false);
  const [form, setForm] = useState({
    id: "",
    sort: 1000,
    status: "draft",
    name_zh: "",
    name_en: "",
    category_zh: "",
    category_en: "",
    desc_zh: "",
    desc_en: "",
    cover: "",
    usage_zh: "",
    usage_en: "",
    features_zh: "",
    features_en: "",
    screenshots: "",
    source_url: "",
  });
  const [importText, setImportText] = useState(
    JSON.stringify(
      {
        id: "ind-tianyan-1",
        sort: 30,
        status: "published",
        name_zh: "天眼一号",
        name_en: "Tianyan No.1",
        category_zh: "趋势系统",
        category_en: "Trend System",
        desc_zh: "基于均线思路的趋势提示系统（来源帖作者宣称命中率>95%，需自行验证）。",
        desc_en: "A trend-following indicator based on MA concepts (author claims >95% accuracy; verify independently).",
        cover: "",
        usage_zh: "主图：紫色双轨之上只做多，天蓝双轨之下只做空；信号与变色以收线确认。",
        usage_en: "Main chart: trade long above the purple bands, short below the blue bands; confirm signals after candle close.",
        features_zh: ["不提前进场（收线确认）", "避免频繁交易", "适合黄金 M15（作者建议）"],
        features_en: ["Close-confirmed signals", "Encourages fewer trades", "Best on XAUUSD M15 (per author)"],
        screenshots: [],
        source_url: "https://www.eahub.cn/thread-70924-1-1.html",
      },
      null,
      2
    )
  );

  useEffect(() => {
    fetchIndicators();
  }, []);

  const uploadImage = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/admin/uploads/images", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.url;
  };

  const fetchIndicators = async () => {
    try {
      const res = await api.get("/indicators?limit=500&include_draft=true");
      setIndicators(res.data);
    } catch (err) {
      toast.error("获取指标列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("确定要删除该指标吗？操作不可逆！")) return;
    try {
      await api.delete(`/admin/indicators/${id}`);
      toast.success("删除成功");
      fetchIndicators();
    } catch (err) {
      toast.error("删除失败");
    }
  };

  if (loading) return <div className="text-neutral-400">加载中...</div>;

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
      await api.post("/admin/indicators", payload);
      toast.success("已创建");
    } catch (err) {
      try {
        await api.put(`/admin/indicators/${payload.id}`, payload);
        toast.success("已更新");
      } catch (err2) {
        toast.error("导入失败");
        return;
      }
    }
    setImportOpen(false);
    fetchIndicators();
  };

  const openCreate = () => {
    setFormMode("create");
    setIdTouched(false);
    setNameEnTouched(false);
    setForm({
      id: "",
      sort: 1000,
      status: "draft",
      name_zh: "",
      name_en: "",
      category_zh: "",
      category_en: "",
      desc_zh: "",
      desc_en: "",
      cover: "",
      usage_zh: "",
      usage_en: "",
      features_zh: "",
      features_en: "",
      screenshots: "",
      source_url: "",
    });
    setFormOpen(true);
  };

  const openEdit = (ind) => {
    setFormMode("edit");
    setIdTouched(true);
    setNameEnTouched(true);
    setForm({
      id: ind.id || "",
      sort: ind.sort ?? 1000,
      status: ind.status || "draft",
      name_zh: ind.name_zh || "",
      name_en: ind.name_en || "",
      category_zh: ind.category_zh || "",
      category_en: ind.category_en || "",
      desc_zh: ind.desc_zh || "",
      desc_en: ind.desc_en || "",
      cover: ind.cover || "",
      usage_zh: ind.usage_zh || "",
      usage_en: ind.usage_en || "",
      features_zh: Array.isArray(ind.features_zh) ? ind.features_zh.join(",") : "",
      features_en: Array.isArray(ind.features_en) ? ind.features_en.join(",") : "",
      screenshots: Array.isArray(ind.screenshots) ? ind.screenshots.join("\n") : "",
      source_url: ind.source_url || "",
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
      name_en: form.name_en || "",
      category_zh: form.category_zh || "",
      category_en: form.category_en || "",
      desc_zh: form.desc_zh || "",
      desc_en: form.desc_en || "",
      cover: form.cover || "",
      usage_zh: form.usage_zh || "",
      usage_en: form.usage_en || "",
      source_url: form.source_url || "",
      features_zh: form.features_zh
        ? form.features_zh.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      features_en: form.features_en
        ? form.features_en.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      screenshots: form.screenshots
        ? form.screenshots.split("\n").map((s) => s.trim()).filter(Boolean)
        : [],
    };
    try {
      if (formMode === "create") {
        await api.post("/admin/indicators", payload);
        toast.success("已创建");
      } else {
        await api.put(`/admin/indicators/${payload.id}`, payload);
        toast.success("已更新");
      }
      setFormOpen(false);
      fetchIndicators();
    } catch (e) {
      toast.error("保存失败");
    }
  };

  return (
    <>
      <div className="bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50">
        <h2 className="text-xl font-bold text-white">指标管理</h2>
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
              <th className="px-6 py-4 font-medium">分类</th>
              <th className="px-6 py-4 font-medium">简述</th>
              <th className="px-6 py-4 font-medium">状态</th>
              <th className="px-6 py-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700/50">
            {indicators.map((ind) => (
              <tr key={ind.id} className="hover:bg-neutral-700/20 transition-colors">
                <td className="px-6 py-4 font-medium text-neutral-200">{ind.name_zh}</td>
                <td className="px-6 py-4 text-neutral-300">{ind.category_zh}</td>
                <td className="px-6 py-4 text-neutral-400 max-w-xs truncate" title={ind.desc_zh}>{ind.desc_zh}</td>
                <td className="px-6 py-4 text-neutral-400">
                  <span className={`px-2 py-1 rounded-md text-xs border ${
                    ind.status === 'published' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {ind.status === 'published' ? '已发布' : '草稿'}
                  </span>
                </td>
                <td className="px-6 py-4 text-neutral-400 text-sm whitespace-nowrap space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      openEdit(ind);
                    }}
                    className="text-blue-300 hover:text-blue-200 transition-colors"
                    title="编辑"
                  >
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(ind.id)} className="text-red-400 hover:text-red-300 transition-colors" title="删除">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {indicators.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-neutral-500">
                  暂无指标数据
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
            <div className="text-white font-semibold">导入/更新指标（JSON）</div>
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
                {formMode === "create" ? "手动新增指标" : "编辑指标"}
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
                  <div className="text-xs text-neutral-400 mb-1">名称(中文)</div>
                  <input
                    value={form.name_zh}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next = { ...form, name_zh: v };
                      if (
                        formMode === "create" &&
                        !idTouched &&
                        (!next.id || next.id.startsWith("ind-"))
                      ) {
                        next.id = autoId("ind", v);
                      }
                      if (!nameEnTouched && !next.name_en) {
                        next.name_en = autoEnglishFromZh(v);
                      }
                      setForm(next);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">名称(英文)</div>
                  <input
                    value={form.name_en}
                    onChange={(e) => {
                      setNameEnTouched(true);
                      setForm({ ...form, name_en: e.target.value });
                    }}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">分类(中文)</div>
                  <input
                    value={form.category_zh}
                    onChange={(e) => setForm({ ...form, category_zh: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">分类(英文)</div>
                  <input
                    value={form.category_en}
                    onChange={(e) => setForm({ ...form, category_en: e.target.value })}
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
                  <div className="flex items-center gap-2">
                    <input
                      value={form.cover}
                      onChange={(e) => setForm({ ...form, cover: e.target.value })}
                      className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                    />
                    <label className="px-3 py-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-colors text-sm cursor-pointer whitespace-nowrap">
                      {uploadingCover ? "上传中" : "上传"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingCover}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (!f) return;
                          try {
                            setUploadingCover(true);
                            const url = await uploadImage(f);
                            if (url) {
                              setForm((prev) => ({ ...prev, cover: url }));
                              toast.success("封面已上传");
                            } else {
                              toast.error("上传失败");
                            }
                          } catch (err) {
                            toast.error("上传失败");
                          } finally {
                            setUploadingCover(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-400 mb-1">简介(中文)</div>
                  <textarea
                    value={form.desc_zh}
                    onChange={(e) => setForm({ ...form, desc_zh: e.target.value })}
                    className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-400 mb-1">简介(英文)</div>
                  <textarea
                    value={form.desc_en}
                    onChange={(e) => setForm({ ...form, desc_en: e.target.value })}
                    className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-400 mb-1">使用说明(中文)</div>
                  <textarea
                    value={form.usage_zh}
                    onChange={(e) => setForm({ ...form, usage_zh: e.target.value })}
                    className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-400 mb-1">使用说明(英文)</div>
                  <textarea
                    value={form.usage_en}
                    onChange={(e) => setForm({ ...form, usage_en: e.target.value })}
                    className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">特点(中文, 逗号分隔)</div>
                  <input
                    value={form.features_zh}
                    onChange={(e) => setForm({ ...form, features_zh: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div>
                  <div className="text-xs text-neutral-400 mb-1">特点(英文, 逗号分隔)</div>
                  <input
                    value={form.features_en}
                    onChange={(e) => setForm({ ...form, features_en: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-400 mb-1">截图 URLs（每行一个）</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-colors text-sm cursor-pointer whitespace-nowrap">
                        {uploadingScreens ? "上传中" : "上传截图"}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          disabled={uploadingScreens}
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            e.target.value = "";
                            if (files.length === 0) return;
                            try {
                              setUploadingScreens(true);
                              const urls = [];
                              for (const f of files) {
                                const url = await uploadImage(f);
                                if (url) urls.push(url);
                              }
                              if (urls.length) {
                                setForm((prev) => {
                                  const existing = (prev.screenshots || "").trim();
                                  const next = existing ? `${existing}\n${urls.join("\n")}` : urls.join("\n");
                                  return { ...prev, screenshots: next };
                                });
                                toast.success("截图已上传");
                              } else {
                                toast.error("上传失败");
                              }
                            } catch (err) {
                              toast.error("上传失败");
                            } finally {
                              setUploadingScreens(false);
                            }
                          }}
                        />
                      </label>
                      <div className="text-xs text-neutral-500">会自动把链接追加到下方文本框</div>
                    </div>
                    <textarea
                      value={form.screenshots}
                      onChange={(e) => setForm({ ...form, screenshots: e.target.value })}
                      className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-neutral-200"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-neutral-400 mb-1">来源链接 source_url</div>
                  <input
                    value={form.source_url}
                    onChange={(e) => setForm({ ...form, source_url: e.target.value })}
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
