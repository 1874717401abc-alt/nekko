"use client";

import { useEffect, useRef, useState } from "react";

const VIEWPORT = 240;
const OUTPUT = 320;

export default function AvatarCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [imgUrl] = useState(() => URL.createObjectURL(file));
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNaturalSize({ w: img.width, h: img.height });
    img.src = imgUrl;
  }, [imgUrl]);

  if (!naturalSize.w) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-card rounded-2xl p-6 text-sm text-ink-soft">加载图片中…</div>
      </div>
    );
  }

  const baseScale = Math.max(VIEWPORT / naturalSize.w, VIEWPORT / naturalSize.h);
  const totalScale = baseScale * scale;
  const displayedW = naturalSize.w * totalScale;
  const displayedH = naturalSize.h * totalScale;

  function maxOffsetFor(dW: number, dH: number) {
    return {
      mx: Math.max((dW - VIEWPORT) / 2, 0),
      my: Math.max((dH - VIEWPORT) / 2, 0),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const { mx, my } = maxOffsetFor(displayedW, displayedH);
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    setOffset({
      x: Math.min(Math.max(dragRef.current.ox + dx, -mx), mx),
      y: Math.min(Math.max(dragRef.current.oy + dy, -my), my),
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleScaleChange(next: number) {
    const nextTotal = baseScale * next;
    const { mx, my } = maxOffsetFor(naturalSize.w * nextTotal, naturalSize.h * nextTotal);
    setScale(next);
    setOffset((o) => ({
      x: Math.min(Math.max(o.x, -mx), mx),
      y: Math.min(Math.max(o.y, -my), my),
    }));
  }

  function handleConfirm() {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sSize = VIEWPORT / totalScale;
      const sx = (displayedW / 2 - VIEWPORT / 2 - offset.x) / totalScale;
      const sy = (displayedH / 2 - VIEWPORT / 2 - offset.y) / totalScale;

      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT, OUTPUT);
      URL.revokeObjectURL(imgUrl);
      onConfirm(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = imgUrl;
  }

  function handleCancel() {
    URL.revokeObjectURL(imgUrl);
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
        <h3 className="text-sm font-medium text-ink">裁剪头像</h3>
        <div
          className="relative mx-auto rounded-full overflow-hidden border border-line touch-none cursor-grab active:cursor-grabbing select-none"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              width: displayedW,
              height: displayedH,
              left: (VIEWPORT - displayedW) / 2 + offset.x,
              top: (VIEWPORT - displayedH) / 2 + offset.y,
              maxWidth: "none",
            }}
          />
        </div>
        <input
          type="range"
          min="1"
          max="3"
          step="0.01"
          value={scale}
          onChange={(e) => handleScaleChange(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <p className="text-xs text-ink-soft text-center">拖动调整位置，滑动条缩放</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm px-4 py-2 rounded-full border border-line text-ink-soft hover:text-accent hover:border-accent transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="text-sm px-5 py-2 rounded-full bg-accent text-paper hover:bg-accent/90 transition-colors"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
