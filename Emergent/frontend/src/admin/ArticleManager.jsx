import React, { useEffect, useState } from "react";
import { Edit, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "./api";

const emptyForm = {
  slug: "",
  title: "",
  summary: "",
  content: "",
  type: "foundation",
  status: "draft",
  research_id: "",
  cover: "",
  source_refs: "[]",
  related_eas: "",
  related_indicators: "",
};

export default function ArticleManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/admin/articles?limit=500");
      setItems(res.data);
    } catch {
      toast.error("获取文章失败");
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing(false);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (item) => {
    setEditing(true);
    setForm({
      slug: item.slug || "",
      title: item.title || "",
      summary: item.summary || "",
      content: item.content || "",
      type: item.type || "foundation",
      status: item.status || "draft",
      research_id: item.research_id || "",
      cover: item.cover || "",
      source_refs: JSON.stringify(item.source_refs || [], null, 2),
      related_eas: (item.related_eas || []).join(","),
      related_indicators: (item.related_indicators || []).join(","),
    });
    setOpen(true);
  };

  const save = async () => {
    let sourceRefs;
    try { sourceRefs = JSON.parse(form.source_refs || "[]"); } catch { toast.error("来源 JSON 格式错误"); return; }
    if (!form.slug.trim() || !form.title.trim() || !form.summary.trim()) { toast.error("请填写 slug、标题和摘要"); return; }
    const payload = {
      ...form,
      slug: form.slug.trim(),
      research_id: form.research_id.trim() || null,
      cover: form.cover.trim() || null,
      source_refs: sourceRefs,
      related_eas: form.related_eas.split(",").map((v) => v.trim()).filter(Boolean),
      related_indicators: form.related_indicators.split(",").map((v) => v.trim()).filter(Boolean),
    };
    try {
      await api.put(`/admin/articles/${payload.slug}`, payload);
      toast.success("文章已保存");
      setOpen(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "保存失败");
    }
  };

  const remove = async (slug) => {
    if (!window.confirm("确定删除这篇文章吗？")) return;
    try { await api.delete(`/admin/articles/${slug}`); load(); } catch { toast.error("删除失败"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-bold">文章与研究内容</h2><p className="mt-1 text-sm text-neutral-400">只有 published 状态会出现在公开网站。</p></div>
        <button onClick={startCreate} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium">新增文章</button>
      </div>
      <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900/70 text-neutral-400"><tr><th className="px-5 py-3">标题</th><th>类型</th><th>研究编号</th><th>状态</th><th className="px-5 text-right">操作</th></tr></thead>
          <tbody className="divide-y divide-neutral-700">
            {items.map((item) => <tr key={item.slug}>
              <td className="px-5 py-4"><div className="font-medium">{item.title}</div><div className="mt-1 text-xs text-neutral-500">{item.slug}</div></td>
              <td>{item.type}</td><td>{item.research_id || "-"}</td><td>{item.status}</td>
              <td className="px-5 text-right"><button onClick={() => startEdit(item)} className="p-2 text-blue-300" title="编辑"><Edit size={17} /></button><button onClick={() => remove(item.slug)} className="p-2 text-red-400" title="删除"><Trash2 size={17} /></button></td>
            </tr>)}
            {items.length === 0 && <tr><td colSpan="5" className="px-5 py-12 text-center text-neutral-500"><FileText className="mx-auto mb-2" />暂无文章</td></tr>}
          </tbody>
        </table>
      </div>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5">
        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-6">
          <div className="flex items-center justify-between"><h3 className="text-xl font-bold">{editing ? "编辑文章" : "新增文章"}</h3><button onClick={() => setOpen(false)} className="text-neutral-400">关闭</button></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Slug"><input disabled={editing} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input" /></Field>
            <Field label="标题"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>
            <Field label="类型"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input"><option value="foundation">交易基础</option><option value="system">核心系统</option><option value="research">研究日志</option><option value="guide">指南</option><option value="case">案例</option></select></Field>
            <Field label="状态"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input"><option value="draft">草稿</option><option value="reviewed">已审核</option><option value="published">已发布</option><option value="archived">已归档</option></select></Field>
            <Field label="研究编号"><input value={form.research_id} onChange={(e) => setForm({ ...form, research_id: e.target.value })} className="input" /></Field>
            <Field label="封面 URL"><input value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} className="input" /></Field>
            <Field label="关联 EA（逗号分隔）"><input value={form.related_eas} onChange={(e) => setForm({ ...form, related_eas: e.target.value })} className="input" /></Field>
            <Field label="关联指标（逗号分隔）"><input value={form.related_indicators} onChange={(e) => setForm({ ...form, related_indicators: e.target.value })} className="input" /></Field>
          </div>
          <Field label="摘要" wide><textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} className="input h-24" /></Field>
          <Field label="正文（支持 # / ## / ### 标题）" wide><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input h-80 font-mono" /></Field>
          <Field label="来源引用 JSON" wide><textarea value={form.source_refs} onChange={(e) => setForm({ ...form, source_refs: e.target.value })} className="input h-36 font-mono" /></Field>
          <div className="mt-6 flex justify-end gap-3"><button onClick={() => setOpen(false)} className="rounded-lg border border-neutral-700 px-4 py-2">取消</button><button onClick={save} className="rounded-lg bg-green-600 px-4 py-2">保存</button></div>
        </div>
      </div>}
      <style>{`.input{width:100%;border:1px solid rgb(64 64 64);background:rgb(10 10 10);border-radius:.5rem;padding:.6rem .75rem;color:white;font-size:.875rem}.input:disabled{opacity:.55}`}</style>
    </div>
  );
}

function Field({ label, children, wide }) {
  return <label className={`block ${wide ? "mt-4" : ""}`}><span className="mb-1 block text-xs text-neutral-400">{label}</span>{children}</label>;
}
