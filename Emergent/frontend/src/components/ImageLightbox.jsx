import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function ImageLightbox({ images, activeIndex, onChange, onClose, altPrefix = "Image" }) {
  const isOpen = Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < images.length;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && images.length > 1) {
        onChange((activeIndex - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight" && images.length > 1) {
        onChange((activeIndex + 1) % images.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, images.length, isOpen, onChange, onClose]);

  if (!isOpen) return null;

  const showPrevious = () => onChange((activeIndex - 1 + images.length) % images.length);
  const showNext = () => onChange((activeIndex + 1) % images.length);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="图片放大查看"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-white hover:text-black transition-colors"
        aria-label="关闭图片"
        title="关闭"
      >
        <X size={24} />
      </button>

      {images.length > 1 && (
        <button
          type="button"
          onClick={showPrevious}
          className="absolute left-3 md:left-6 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-white hover:text-black transition-colors"
          aria-label="上一张图片"
          title="上一张"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      <div className="flex max-h-full max-w-full flex-col items-center gap-3">
        <img
          src={images[activeIndex]}
          alt={`${altPrefix} ${activeIndex + 1}`}
          className="max-h-[84vh] max-w-[94vw] object-contain shadow-2xl"
        />
        <div className="rounded-full bg-black/60 px-4 py-1.5 text-sm text-white/80">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      {images.length > 1 && (
        <button
          type="button"
          onClick={showNext}
          className="absolute right-3 md:right-6 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-white hover:text-black transition-colors"
          aria-label="下一张图片"
          title="下一张"
        >
          <ChevronRight size={28} />
        </button>
      )}
    </div>
  );
}
