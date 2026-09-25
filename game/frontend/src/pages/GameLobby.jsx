import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  PlayCircle, Users, Bot, Crown, Search, ArrowRight, UserPlus, Info
} from "lucide-react";
import { http } from "@/lib/api";
import { toast } from "sonner";
import { savePlayerMap } from "@/utils/cardUtils";

/**
 * 游戏大厅：创建房间、加入房间、带 AI 创建
 * 独立前端，不依赖主站任何组件
 */
export default function GameLobby() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [roomId, setRoomId] = useState(params.get("room") || "");
  const [myName, setMyName] = useState(() => localStorage.getItem("show-thumb:name") || "玩家" + Math.floor(Math.random()*900+100));
  const [busy, setBusy] = useState(null); // create | join | ai1 | ai2 | ai3
  const [health, setHealth] = useState(null); // {ok, message}

  useEffect(() => {
    (async () => {
      try {
        const r = await http.get("/health");
        setHealth(r.data);
      } catch { setHealth({ ok: false, message: "未连接后端，请先启动 :8001" }); }
    })();
  }, []);

  const goPlay = (room_id, seat, player_id, name) => {
    savePlayerMap(room_id, seat, player_id, name);
    localStorage.setItem("show-thumb:name", name);
    navigate(`/play/${room_id}`);
  };

  const createRoom = async (aiCount) => {
    setBusy(aiCount == null ? "create" : ("ai" + aiCount));
    try {
      const payload = { player_name: myName };
      if (aiCount != null) payload.with_ai_count = aiCount;
      const { data } = await http.post("/room/create", payload);
      toast.success(aiCount ? `已创建带 ${aiCount} AI 的房间：${data.room_id}` : `房间 ${data.room_id} 已创建`);
      goPlay(data.room_id, data.seat, data.player_id, myName);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "创建失败");
    } finally {
      setBusy(null);
    }
  };
  const joinRoom = async () => {
    const r = roomId.trim();
    if (!r) return toast.warning("请输入房间号");
    setBusy("join");
    try {
      const { data } = await http.post("/room/join", { room_id: r, player_name: myName });
      toast.success(`已加入 ${r}（P${data.seat + 1}）`);
      goPlay(data.room_id, data.seat, data.player_id, myName);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "加入失败");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-8 flex flex-col gap-6 items-stretch max-w-5xl mx-auto">
      <header className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Crown className="w-9 h-9 text-poker-gold" />
            <h1 className="text-2xl md:text-3xl font-black tracking-wide">
              办二 <span className="text-poker-gold">Show Thumb</span>
            </h1>
          </div>
          <p className="text-white/70 text-sm mt-1">
            54 张扑克 4 人上供娱乐游戏 · 支持 AI 陪练
          </p>
        </div>
        <div className={"chip px-3 py-1.5 text-sm " + (health?.ok ? "bg-emerald-600/30 text-emerald-100" : "bg-rose-600/30 text-rose-100")}>
          {health == null ? "检查后端中…" : health.ok ? "后端连接 OK " + (health.message || "") : "后端未连接"}
        </div>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <Card title="创建公开房间" icon={<PlayCircle className="w-5 h-5"/>}>
          <Field label="我的昵称" value={myName} onChange={setMyName} />
          <button className="btn btn-primary w-full mt-3" onClick={() => createRoom(null)} disabled={!!busy}>
            {busy === "create" ? "创建中…" : <> <PlayCircle className="w-4 h-4"/> 创建房间 </>}
          </button>
          <p className="text-xs text-white/60 mt-2">
            最多 4 人加入，满人后任意玩家点「开始游戏」。
          </p>
        </Card>

        <Card title="加入房间" icon={<UserPlus className="w-5 h-5"/>}>
          <Field label="我的昵称" value={myName} onChange={setMyName} />
          <Field label="房间号" value={roomId} onChange={setRoomId} placeholder="如：R-A1B2C3"/>
          <button className="btn btn-info w-full mt-3" onClick={joinRoom} disabled={!!busy}>
            {busy === "join" ? "加入中…" : <> <UserPlus className="w-4 h-4"/> 加入房间 </>}
          </button>
          <p className="text-xs text-white/60 mt-2">
            把 <code className="bg-white/10 px-1 rounded">?room=房间号</code> 发给朋友即可直达。
          </p>
        </Card>

        <Card title="带 AI 陪练创建（推荐）" icon={<Bot className="w-5 h-5"/>} highlight>
          <Field label="我的昵称" value={myName} onChange={setMyName} />
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button className="btn btn-ghost" onClick={() => createRoom(1)} disabled={!!busy}>
              +1 AI
            </button>
            <button className="btn btn-ghost" onClick={() => createRoom(2)} disabled={!!busy}>
              +2 AI
            </button>
            <button className="btn btn-primary" onClick={() => createRoom(3)} disabled={!!busy}>
              {busy === "ai3" ? "创建中…" : <> +3 AI <Bot className="w-4 h-4"/> </>}
            </button>
          </div>
          <p className="text-xs text-white/70 mt-3">
            线上凑不齐 4 人时可以加 AI；AI 全部按启发式规则操作。
          </p>
        </Card>
      </section>

      <section className="panel p-4 md:p-5 text-sm text-white/80">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-poker-gold flex-shrink-0 mt-0.5"/>
          <ul className="list-disc list-inside space-y-1">
            <li>规则：摸牌 → 办二（摸到 2 可选择办二，同花色 2 成为主花色）→ 翻底定主 → 扣底 6 张 → 上供（副家得分≥35 则供 0-3 张最大主非分）→ 庄家分配 → 庄家与对家等量还牌（对家花色互不相同）→ 13 轮出牌（可甩牌/杀）→ 翻底 → 结算查上供表 → 下一局</li>
            <li>输赢：庄家队 vs 副家队（对家搭档同队）；副家得分 &lt; 35 庄家胜；副家最后一手全主赢即取得底牌分</li>
          </ul>
        </div>
      </section>

      <footer className="text-center text-white/40 text-xs pb-4">
        <Link to="/" className="hover:text-poker-gold">← 返回主站</Link>
      </footer>
    </div>
  );
}

function Card({ title, icon, highlight, children }) {
  return (
    <div className={"panel p-4 md:p-5 " + (highlight ? "ring-1 ring-poker-gold/40" : "")}>
      <div className="flex items-center gap-2 mb-3">
        <span className="chip bg-white/10 text-white">{icon}{title}</span>
      </div>
      {children}
    </div>
  );
}
function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="block mt-2">
      <span className="text-xs text-white/70">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 focus:border-poker-gold focus:outline-none text-white"
      />
    </label>
  );
}
