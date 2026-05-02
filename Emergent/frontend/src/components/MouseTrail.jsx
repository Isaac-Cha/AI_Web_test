import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// Route-aware trail colors. Each entry must contrast with its page background.
const TRAIL = {
  "/":       { core: "245, 158, 11",  glow: "252, 211, 77",  alpha: 1,   radius: 4 },   // gold on obsidian
  "/hybrid": { core: "245, 158, 11",  glow: "252, 211, 77",  alpha: 1,   radius: 4 },   // gold on obsidian
  "/apple":  { core: "10, 132, 255",  glow: "147, 197, 253", alpha: 0.9, radius: 2.6 }, // apple blue + sky blue glow on white
};

export default function MouseTrail() {
  const canvasRef = useRef(null);
  const pointsRef = useRef([]);
  const { pathname } = useLocation();
  const paletteRef = useRef(TRAIL["/"]);

  // Update palette when route changes
  useEffect(() => {
    paletteRef.current = TRAIL[pathname] || TRAIL["/"];
  }, [pathname]);

  useEffect(() => {
    const isFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isFine) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let w, h, dpr = window.devicePixelRatio || 1, raf;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMove = (e) => {
      pointsRef.current.push({ x: e.clientX, y: e.clientY, life: 1 });
      if (pointsRef.current.length > 60) pointsRef.current.shift();
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const { core, glow, alpha, radius: rMul } = paletteRef.current;
      const pts = pointsRef.current;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.life -= 0.028;
        if (p.life <= 0) continue;
        const radius = 1 + p.life * 7;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * rMul);
        grad.addColorStop(0, `rgba(${core}, ${0.55 * p.life * alpha})`);
        grad.addColorStop(0.5, `rgba(${glow}, ${0.12 * p.life * alpha})`);
        grad.addColorStop(1, `rgba(${core}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * rMul, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (b.life <= 0) continue;
        ctx.strokeStyle = `rgba(${core}, ${0.45 * b.life * alpha})`;
        ctx.lineWidth = 1.2 + b.life * 1.4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      pointsRef.current = pts.filter((p) => p.life > 0);
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="mouse-trail-canvas"
      className="fixed inset-0 pointer-events-none z-[9998]"
      aria-hidden
    />
  );
}
