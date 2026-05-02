import React, { useEffect, useState } from "react";
import api from "./api";
import { format } from "date-fns";

export default function SubmissionsManager() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const res = await api.get("/submissions?limit=500");
      setSubmissions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getKindLabel = (kind) => {
    switch (kind) {
      case "contact": return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md text-xs font-medium border border-blue-500/30">联系我们</span>;
      case "join": return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-md text-xs font-medium border border-green-500/30">加入我们</span>;
      case "account_open": return <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-md text-xs font-medium border border-purple-500/30">开户申请</span>;
      default: return <span className="px-2 py-1 bg-neutral-500/20 text-neutral-400 rounded-md text-xs font-medium border border-neutral-500/30">{kind}</span>;
    }
  };

  if (loading) return <div className="text-neutral-400">加载中...</div>;

  return (
    <div className="bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-700 flex justify-between items-center bg-neutral-800/50">
        <h2 className="text-xl font-bold text-white">所有留言与申请</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-900/50 text-neutral-400 text-sm border-b border-neutral-700">
              <th className="px-6 py-4 font-medium">类型</th>
              <th className="px-6 py-4 font-medium">姓名</th>
              <th className="px-6 py-4 font-medium">联系方式</th>
              <th className="px-6 py-4 font-medium">邮箱</th>
              <th className="px-6 py-4 font-medium">留言内容</th>
              <th className="px-6 py-4 font-medium">提交时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700/50">
            {submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-neutral-700/20 transition-colors">
                <td className="px-6 py-4">{getKindLabel(sub.kind)}</td>
                <td className="px-6 py-4 font-medium text-neutral-200">{sub.name}</td>
                <td className="px-6 py-4 text-neutral-300">{sub.contact}</td>
                <td className="px-6 py-4 text-neutral-400">{sub.email || "-"}</td>
                <td className="px-6 py-4 text-neutral-400 max-w-xs truncate" title={sub.message}>
                  {sub.message || "-"}
                </td>
                <td className="px-6 py-4 text-neutral-400 text-sm whitespace-nowrap">
                  {format(new Date(sub.created_at), "yyyy-MM-dd HH:mm:ss")}
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-neutral-500">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
