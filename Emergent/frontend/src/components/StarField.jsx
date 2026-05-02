import React, { useEffect, useRef } from "react";

/**
 * Canvas starry sky with subtle parallax & mouse interaction.
 * No external deps — lightweight and performant.
 */
export default function StarField({ className = "" }) {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let w = 0, h = 0, dpr = window.devicePixelRatio || 1;
    const stars = [];
    const STAR_COUNT = 180;
    const shootingStars = [];

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pickHue = () => {
      const roll = Math.random();
      if (roll > 0.9) return "gold";
      if (roll > 0.75) return "cyan";
      return "white";
    };

    const starColor = (hue, alpha) => {
      if (hue === "cyan") return `rgba(103, 232, 249, ${alpha})`;
      if (hue === "gold") return `rgba(252, 211, 77, ${alpha})`;
      return `rgba(255, 255, 255, ${alpha})`;
    };

    const initStars = () => {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.4 + 0.3,
          baseAlpha: Math.random() * 0.7 + 0.15,
          tw: Math.random() * Math.PI * 2,
          twSpeed: Math.random() * 0.02 + 0.005,
          z: Math.random() * 0.8 + 0.2,
          hue: pickHue(),
        });
      }
    };

    const maybeShoot = () => {
      if (Math.random() < 0.004 && shootingStars.length < 2) {
        const startX = Math.random() * w;
        const startY = Math.random() * h * 0.4;
        shootingStars.push({
          x: startX, y: startY,
          vx: (Math.random() * 4 + 5),
          vy: (Math.random() * 2 + 2),
          life: 1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // subtle nebula gradient
      const g = ctx.createRadialGradient(w * 0.2, h * 0.2, 0, w * 0.2, h * 0.2, Math.max(w, h) * 0.6);
      g.addColorStop(0, "rgba(245, 158, 11, 0.045)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createRadialGradient(w * 0.85, h * 0.6, 0, w * 0.85, h * 0.6, Math.max(w, h) * 0.55);
      g2.addColorStop(0, "rgba(0, 240, 255, 0.045)");
      g2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const s of stars) {
        s.tw += s.twSpeed;
        const alpha = s.baseAlpha * (0.6 + Math.sin(s.tw) * 0.4);
        const px = s.x + (mx - w / 2) * 0.02 * s.z;
        const py = s.y + (my - h / 2) * 0.02 * s.z;
        const color = starColor(s.hue, alpha);
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      // shooting stars
      maybeShoot();
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life -= 0.012;
        if (ss.life <= 0 || ss.x > w || ss.y > h) {
          shootingStars.splice(i, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 8, ss.y - ss.vy * 8);
        grad.addColorStop(0, `rgba(0, 240, 255, ${ss.life})`);
        grad.addColorStop(1, "rgba(0, 240, 255, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(ss.x - ss.vx * 8, ss.y - ss.vy * 8);
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const onResize = () => { resize(); initStars(); };

    resize();
    initStars();
    draw();
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="hero-starfield-canvas"
      className={`absolute inset-0 w-full h-full ${className}`}
      aria-hidden
    />
  );
}
