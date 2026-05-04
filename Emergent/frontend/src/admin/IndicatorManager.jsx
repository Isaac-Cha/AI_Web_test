import React, { useEffect, useState } from "react";
import api from "./api";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function IndicatorManager() {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
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

  return (
    <>
      <div className="bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50">
        <h2 className="text-xl font-bold text-white">指标管理</h2>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-colors text-sm"
        >
          导入 JSON
        </button>
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
    </>
  );
}
