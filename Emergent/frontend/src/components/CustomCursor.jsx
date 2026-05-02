import React, { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isFine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setEnabled(isFine);
    if (!isFine) return;

    let mx = -100, my = -100, rx = -100, ry = -100;
    let raf;

    const onMove = (e) => { mx = e.clientX; my = e.clientY; };

    const onOver = (e) => {
      const target = e.target;
      if (!ringRef.current) return;
      if (target.closest('a, button, [role="button"], input, textarea, [data-cursor-hover]')) {
        ringRef.current.classList.add("cursor-hover");
      } else {
        ringRef.current.classList.remove("cursor-hover");
      }
    };

    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dotRef.current) dotRef.current.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <div ref={ringRef} className="cursor-ring" data-testid="custom-cursor-ring" />
      <div ref={dotRef} className="cursor-dot" data-testid="custom-cursor-dot" />
    </>
  );
}
