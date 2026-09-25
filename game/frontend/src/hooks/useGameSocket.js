import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { WS_URL_BASE } from "@/lib/api";
import { toast } from "sonner";

/**
 * 游戏 WebSocket Hook（独立于主站）
 * 连接地址: /game/ws/{roomId}/{playerId}
 * 消息格式（client -> server）: {"type": "...", "payload": {...}}
 * 消息格式（server -> client）: {"type": "state_update"|"error"|"chat"|"message", "data": {...}}
 *   其中 state_update.data.state 就是 mask_state_for_viewer 之后的 GameState
 */
export function useGameSocket({ roomId, playerId, onState, onMessage, onError, onOpen }) {
  const wsRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const reconnectTimer = useRef(null);
  const pingTimerRef = useRef(null);
  const [readyState, setReadyState] = useState(-1); // 0:connecting 1:open 2:closing 3:closed

  // 用 refs 保存最新回调，避免 connect 因依赖变化反复重建导致 WS 重连风暴
  const onStateRef = useRef(onState);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);
  useEffect(() => { onStateRef.current = onState; }, [onState]);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);

  const clearReconnect = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

/**
 * 后端 state 可能有两种 players 形式：{0:p0, 1:p1, ...} 或 [p0,p1,...]
 * 统一转成数组，方便前端 .find(p => p.seat === seat)
 */
function normalizeState(rawState) {
  if (!rawState) return null;
  const s = { ...rawState };
  if (s.players && !Array.isArray(s.players)) {
    s.players = Object.values(s.players);
  }
  return s;
}

const connect = useCallback(() => {
    if (!roomId || !playerId) return;
    clearReconnect();
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    const url = `${WS_URL_BASE}/${roomId}/${playerId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setReadyState(0);

    ws.onopen = () => {
      setReadyState(1);
      // 立即发一个 ping，服务端会回 pong，同时触发 AI tick 推进
      try { ws.send(JSON.stringify({ type: "ping" })); } catch {}
      // 每 1.5 秒主动 ping，保持 WS 活跃并驱动后端 AI tick（后端 pong 分支调用 maybe_trigger_ai_actions）
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === 1) {
          try { ws.send(JSON.stringify({ type: "ping" })); } catch {}
        }
      }, 1500);
      onOpenRef.current?.();
    };
    ws.onerror = () => {
      try { setReadyState(wsRef.current?.readyState ?? 3); } catch {}
    };
    ws.onclose = (e) => {
      setReadyState(3);
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      if (shouldReconnectRef.current) {
        reconnectTimer.current = setTimeout(connect, 1400);
      }
    };
    ws.onmessage = (evt) => {
      let msg = null;
      try { msg = JSON.parse(evt.data); } catch { return; }
      if (!msg) return;
      if (msg.type === "state_update") {
        const rawState =
          (msg.payload && msg.payload.game_state) ||
          (msg.data && msg.data.state) ||
          msg.game_state ||
          msg.state;
        const viewerSeat =
          (msg.payload && msg.payload.viewer_seat) ??
          (msg.data && msg.data.viewer_seat) ??
          msg.viewer_seat;
        onStateRef.current?.(normalizeState(rawState), viewerSeat);
      } else if (msg.type === "action_result") {
        const ok = msg.payload?.ok ?? msg.data?.ok ?? true;
        const err = msg.payload?.error ?? msg.data?.error;
        if (!ok && err) {
          toast.error(err);
          onErrorRef.current?.(err);
        }
      } else if (msg.type === "error") {
        const text = (msg.data?.message) || (msg.payload?.message) || msg.message || "操作失败";
        toast.error(text);
        onErrorRef.current?.(text);
      } else if (msg.type === "message") {
        const text = (msg.data?.message) || (msg.payload?.message) || msg.message || "";
        if (text) toast.info(text);
        onMessageRef.current?.({ ...(msg.data || msg.payload || {}), message: text });
      } else if (msg.type === "chat") {
        onMessageRef.current?.({ ...(msg.data || msg.payload || {}), chat: true });
      }
    };
  }, [roomId, playerId]);

  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();
    return () => {
      shouldReconnectRef.current = false;
      clearReconnect();
      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }
      try { wsRef.current?.close(); } catch {}
    };
  }, [connect]);

  /** 发送 client -> server 消息 */
  const send = useCallback((type, payload = {}) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) {
      toast.warning("连接未就绪，请稍候…");
      return false;
    }
    ws.send(JSON.stringify({ type, payload }));
    return true;
  }, []);

  /** 业务动作封装（与 routes_ws.py 对应） */
  const actions = useMemo(() => ({
    start: () => send("start_game"),
    drawCard: () => send("draw_card"),
    declareBan2: (cardId) => send("declare_ban2", { card_id: cardId }),
    flipBottom: () => send("flip_bottom"),
    discardBottom: (cardIds) => send("discard_bottom", { card_ids: cardIds }),
    selectTribute: (cardIds) => send("select_tribute", { card_ids: cardIds }),
    distributeTribute: (distMap) => send("distribute_tribute", { distribution: distMap }),
    selectReturn: (cardIds) => send("select_return", { card_ids: cardIds }),
    declineCards: () => send("decline_cards"),
    playCards: (cardIds) => send("play_cards", { card_ids: cardIds }),
    revealNext: () => send("reveal_next"),
    ready: () => send("ready"),
    nextRound: () => send("next_round"),
    leaveRoom: () => send("leave_room"),
  }), [send]);

  return { readyState, send, actions };
}
