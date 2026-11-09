import React, { useEffect, useState } from "react";
import api from "./api";
import { format } from "date-fns";
import { Eye, X } from "lucide-react";

export default function SubmissionsManager() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

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
        <table className="w-full min-w-[980px] text-left border-collapse">
          <thead>
            <tr className="bg-neutral-900/50 text-neutral-400 text-sm border-b border-neutral-700">
              <th className="px-6 py-4 font-medium">类型</th>
              <th className="px-6 py-4 font-medium">姓名</th>
              <th className="px-6 py-4 font-medium">联系方式</th>
              <th className="px-6 py-4 font-medium">邮箱</th>
              <th className="px-6 py-4 font-medium">留言内容</th>
              <th className="px-6 py-4 font-medium">提交时间</th>
              <th className="px-6 py-4 font-medium text-center">查看</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-700/50">
            {submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-neutral-700/20 transition-colors">
                <td className="px-6 py-4">{getKindLabel(sub.kind)}</td>
                <td className="px-6 py-4 font-medium text-neutral-200">{sub.name}</td>
                <td className="px-6 py-4 text-neutral-300 max-w-[12rem] break-words">{sub.contact}</td>
                <td className="px-6 py-4 text-neutral-400 max-w-[14rem] break-all">{sub.email || "-"}</td>
                <td className="px-6 py-4 text-neutral-400 max-w-xs">
                  <div
                    className="overflow-hidden whitespace-pre-wrap break-words"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {sub.message || "-"}
                  </div>
                </td>
                <td className="px-6 py-4 text-neutral-400 text-sm whitespace-nowrap">
                  {format(new Date(sub.created_at), "yyyy-MM-dd HH:mm:ss")}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(sub)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-300 hover:bg-blue-500/10 hover:text-blue-200 transition-colors"
                    title="查看完整内容"
                    aria-label={`查看 ${sub.name} 的完整留言`}
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-neutral-500">
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedSubmission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-detail-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedSubmission(null);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-700 px-6 py-4">
              <div>
                <h3 id="submission-detail-title" className="text-lg font-semibold text-white">
                  留言与申请详情
                </h3>
                <p className="mt-1 text-sm text-neutral-400">
                  {format(new Date(selectedSubmission.created_at), "yyyy-MM-dd HH:mm:ss")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800 hover:text-white"
                title="关闭"
                aria-label="关闭详情"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto p-6">
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-neutral-500">类型</dt>
                  <dd className="mt-2">{getKindLabel(selectedSubmission.kind)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">姓名</dt>
                  <dd className="mt-1 break-words text-neutral-200">{selectedSubmission.name || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">联系方式</dt>
                  <dd className="mt-1 break-words text-neutral-200">{selectedSubmission.contact || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">邮箱</dt>
                  <dd className="mt-1 break-all text-neutral-200">{selectedSubmission.email || "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-neutral-500">完整留言内容</dt>
                  <dd className="mt-2 min-h-[7rem] whitespace-pre-wrap break-words rounded-md border border-neutral-700 bg-neutral-950 p-4 leading-7 text-neutral-200 select-text">
                    {selectedSubmission.message || "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
