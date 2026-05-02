import React, { useEffect, useState } from "react";
import api from "./api";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function IndicatorManager() {
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50">
        <h2 className="text-xl font-bold text-white">指标管理</h2>
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
  );
}
