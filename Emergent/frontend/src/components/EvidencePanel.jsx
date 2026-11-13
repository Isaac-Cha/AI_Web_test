import React from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileCheck2, Image as ImageIcon, ShieldAlert } from "lucide-react";

const STATUS_LABELS = {
  inbox: ["新收集", "Inbox"],
  screened: ["已基础排查", "Screened"],
  testable: ["可测试", "Testable"],
  testing: ["测试中", "Testing"],
  reviewed: ["已完成线下测试", "Offline review completed"],
  approved: ["已批准展示", "Approved"],
  rejected: ["未通过", "Rejected"],
  archived: ["已归档", "Archived"],
};

const MEDIA_LABELS = {
  cover: ["封面海报", "Cover"],
  product_screenshot: ["真实产品截图", "Real product screenshot"],
  report_chart: ["真实测试数据图表", "Test-data chart"],
  diagram: ["原理示意图", "Diagram"],
  source_image: ["第三方来源图片", "Third-party source image"],
};

function SectionTitle({ icon: Icon, children, tone }) {
  return (
    <h3 className={`flex items-center gap-2 text-sm font-semibold ${tone}`}>
      <Icon size={16} />
      {children}
    </h3>
  );
}

export default function EvidencePanel({ item, isApple, lang = "zh" }) {
  const idx = lang === "zh" ? 0 : 1;
  const status = item.verification_status || "inbox";
  const media = Array.isArray(item.media_assets) ? item.media_assets : [];
  const legacyMedia = media.length === 0 && Array.isArray(item.screenshots)
    ? item.screenshots.map((url) => ({ url, kind: "source_image", source: "third_party", legacy: true }))
    : [];
  const visibleMedia = [...media, ...legacyMedia];
  const sourceRefs = Array.isArray(item.source_refs) ? item.source_refs : [];
  const evidenceRefs = Array.isArray(item.evidence_refs) ? item.evidence_refs : [];
  const claims = Array.isArray(item.claim_evidence) ? item.claim_evidence : [];
  const limitations = Array.isArray(item.limitations) ? item.limitations : [];
  const risks = Array.isArray(item.risk_notes) ? item.risk_notes : [];
  const text = isApple ? "text-black/70" : "text-gray-300";
  const border = isApple ? "border-black/10" : "border-white/10";
  const panel = isApple ? "bg-white" : "bg-white/[0.025]";
  const accent = isApple ? "text-[#0071E3]" : "text-cyan2";

  return (
    <section className={`max-w-7xl mx-auto px-6 md:px-10 pb-20`} data-testid="evidence-panel">
      <div className={`rounded-lg border ${border} ${panel} p-6 md:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className={`text-xs font-mono uppercase ${accent}`}>Evidence & limitations</div>
            <h2 className="mt-1 text-2xl font-bold">{lang === "zh" ? "证据、来源与边界" : "Evidence, sources and limits"}</h2>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${border}`}>
            <FileCheck2 size={14} className={accent} />
            {STATUS_LABELS[status]?.[idx] || status}
          </div>
        </div>

        <p className={`mt-4 text-sm leading-relaxed ${text}`}>
          {lang === "zh"
            ? "海报仅用于视觉表达；真实产品截图和报告图必须来自实际运行或保留的测试数据。历史结果不构成收益承诺。"
            : "Covers are visual assets only. Product screenshots and report charts must come from actual operation or retained test data. Historical results are not a profit guarantee."}
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="space-y-7">
            <div>
              <SectionTitle icon={FileCheck2} tone={accent}>{lang === "zh" ? "来源与测试档案" : "Sources and test records"}</SectionTitle>
              <div className={`mt-3 space-y-3 text-sm ${text}`}>
                {[...sourceRefs, ...evidenceRefs].length === 0 && <p>{lang === "zh" ? "公开证据索引待补充。" : "Public evidence index pending."}</p>}
                {[...sourceRefs, ...evidenceRefs].map((ref, i) => (
                  <div key={`${ref.title}-${i}`} className={`border-l-2 pl-3 ${border}`}>
                    {ref.url ? (
                      <a href={ref.url} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 font-medium ${accent}`}>
                        {ref.title} <ExternalLink size={12} />
                      </a>
                    ) : <div className="font-medium">{ref.title}</div>}
                    {ref.note && <p className="mt-1 text-xs leading-relaxed opacity-80">{ref.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            {claims.length > 0 && (
              <div>
                <SectionTitle icon={CheckCircle2} tone={accent}>{lang === "zh" ? "数字证据状态" : "Claim evidence status"}</SectionTitle>
                <div className="mt-3 space-y-2">
                  {claims.map((claim) => (
                    <div key={claim.claim_key} className={`flex items-start justify-between gap-3 border-b pb-2 text-sm ${border}`}>
                      <div><span className="font-medium">{claim.display_value}</span><div className={`text-xs ${text}`}>{claim.evidence_ref}</div></div>
                      <span className={claim.status === "verified" ? "text-emerald-500" : "text-amber-500"}>
                        {claim.status === "verified" ? (lang === "zh" ? "已核验" : "Verified") : (lang === "zh" ? "待补证" : "Pending")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-7">
            {limitations.length > 0 && (
              <div>
                <SectionTitle icon={AlertTriangle} tone="text-amber-500">{lang === "zh" ? "已知限制" : "Known limitations"}</SectionTitle>
                <ul className={`mt-3 space-y-2 text-sm ${text}`}>{limitations.map((v, i) => <li key={i}>• {v}</li>)}</ul>
              </div>
            )}
            {risks.length > 0 && (
              <div>
                <SectionTitle icon={ShieldAlert} tone="text-rose-500">{lang === "zh" ? "风险说明" : "Risk notes"}</SectionTitle>
                <ul className={`mt-3 space-y-2 text-sm ${text}`}>{risks.map((v, i) => <li key={i}>• {v}</li>)}</ul>
              </div>
            )}
          </div>
        </div>

        {visibleMedia.length > 0 && (
          <div className={`mt-8 border-t pt-6 ${border}`}>
            <SectionTitle icon={ImageIcon} tone={accent}>{lang === "zh" ? "已分类图片" : "Classified media"}</SectionTitle>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleMedia.map((asset, i) => (
                <a key={`${asset.url}-${i}`} href={asset.url} target="_blank" rel="noreferrer" className={`overflow-hidden rounded-lg border ${border}`}>
                  <div className="aspect-video bg-black/10"><img src={asset.url} alt={asset.title || MEDIA_LABELS[asset.kind]?.[idx]} className="h-full w-full object-cover" loading="lazy" /></div>
                  <div className="p-3 text-xs">
                    <div className="font-medium">{asset.title || MEDIA_LABELS[asset.kind]?.[idx] || asset.kind}</div>
                    <div className={`mt-1 ${text}`}>{asset.legacy ? (lang === "zh" ? "历史图片尚未分类，不作为本站实测证据" : "Legacy image, not classified as first-party test evidence") : MEDIA_LABELS[asset.kind]?.[idx]}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
