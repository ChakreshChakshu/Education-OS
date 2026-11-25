"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ── the curved row ──────────────────────────────────────────────
 * One row of images streams from right to left around the inside of a
 * cylinder. The centre faces you flat, the ends bend toward you so each
 * end image curves along its length, and the ends fade into the page.
 *
 * Rendered onto a single DPR-scaled 2D canvas (64 vertical strips per
 * tile inside a smooth curved rounded-corner clip path) instead of
 * CSS preserve-3d sibling divs, avoiding Chromium's 3D BSP/compositor
 * tile seams and flickering lines on the curved edges.
 * ─────────────────────────────────────────────────────────────── */

const STRIPS = 64;
const CAMERA = 1.85;
const MAX_WIDTH = 55;
const CORNER_RADIUS = 8;

function arc(bend: number) {
  return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend));
}

function measure(
  width: number,
  height: number,
  tile: number,
  aspect: number,
  gap: number,
  bend: number,
) {
  const h = Math.min(
    (tile / 100) * height,
    ((MAX_WIDTH / 100) * width) / aspect,
  );
  const radius = width * arc(bend);
  if (!(h > 0) || !(radius > 0)) {
    return { h: 0, radius: 0, unit: 0, pitch: 1, limit: 0 };
  }
  const unit = h / radius; // radians per tile height
  const pitch = (aspect + gap / 100) * unit;
  const limit = bend + (aspect * unit) / 2;
  return { h, radius, unit, pitch, limit };
}

function drawCurvedTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | undefined,
  thetaCenter: number,
  tileRad: number,
  aspectRatio: number,
  radius: number,
  h: number,
  cx: number,
  cy: number,
  viewW: number,
) {
  const persp = radius * CAMERA;
  const xs = new Float64Array(STRIPS + 1);
  const tops = new Float64Array(STRIPS + 1);
  const bots = new Float64Array(STRIPS + 1);
  const scales = new Float64Array(STRIPS + 1);

  for (let i = 0; i <= STRIPS; i++) {
    const u = i / STRIPS;
    const theta = thetaCenter + (0.5 - u) * tileRad;
    const z = radius * (1 - Math.cos(theta));
    if (z >= persp * 0.96) return;
    const scale = persp / (persp - z);
    const x = cx - radius * Math.sin(theta) * scale;
    const halfH = (h / 2) * scale;
    xs[i] = x;
    tops[i] = cy - halfH;
    bots[i] = cy + halfH;
    scales[i] = scale;
  }

  const totalW = xs[STRIPS] - xs[0];
  if (totalW <= 1 || xs[STRIPS] < 0 || xs[0] > viewW) return;

  const rl = Math.min(
    CORNER_RADIUS * scales[0],
    totalW * 0.25,
    (bots[0] - tops[0]) * 0.25,
  );
  const rr = Math.min(
    CORNER_RADIUS * scales[STRIPS],
    totalW * 0.25,
    (bots[STRIPS] - tops[STRIPS]) * 0.25,
  );

  // Sample exact point on top/bottom curve at x = xs[0] + rl or xs[N] - rr
  const sampleAt = (arr: Float64Array, targetX: number) => {
    for (let i = 0; i < STRIPS; i++) {
      if (targetX >= xs[i] && targetX <= xs[i + 1]) {
        const span = xs[i + 1] - xs[i] || 1;
        const t = (targetX - xs[i]) / span;
        return arr[i] + t * (arr[i + 1] - arr[i]);
      }
    }
    return arr[0];
  };

  const xLeftInset = xs[0] + rl;
  const xRightInset = xs[STRIPS] - rr;
  const topLeftY = sampleAt(tops, xLeftInset);
  const topRightY = sampleAt(tops, xRightInset);
  const botLeftY = sampleAt(bots, xLeftInset);
  const botRightY = sampleAt(bots, xRightInset);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xs[0], tops[0] + rl);
  ctx.quadraticCurveTo(xs[0], tops[0], xLeftInset, topLeftY);
  for (let i = 1; i < STRIPS; i++) {
    if (xs[i] > xLeftInset && xs[i] < xRightInset) {
      ctx.lineTo(xs[i], tops[i]);
    }
  }
  ctx.lineTo(xRightInset, topRightY);
  ctx.quadraticCurveTo(xs[STRIPS], tops[STRIPS], xs[STRIPS], tops[STRIPS] + rr);
  ctx.lineTo(xs[STRIPS], bots[STRIPS] - rr);
  ctx.quadraticCurveTo(xs[STRIPS], bots[STRIPS], xRightInset, botRightY);
  for (let i = STRIPS - 1; i >= 1; i--) {
    if (xs[i] > xLeftInset && xs[i] < xRightInset) {
      ctx.lineTo(xs[i], bots[i]);
    }
  }
  ctx.lineTo(xLeftInset, botLeftY);
  ctx.quadraticCurveTo(xs[0], bots[0], xs[0], bots[0] - rl);
  ctx.closePath();
  ctx.clip();

  if (!img || !img.complete || img.naturalWidth === 0) {
    ctx.fillStyle = "rgba(128, 128, 128, 0.14)";
    ctx.fill();
    ctx.restore();
    return;
  }

  // Object-cover source crop matching tile aspectRatio
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  const imgAspect = natW / natH;
  let sx0 = 0;
  let sy0 = 0;
  let sw = natW;
  let sh = natH;
  if (imgAspect > aspectRatio) {
    sw = natH * aspectRatio;
    sx0 = (natW - sw) / 2;
  } else {
    sh = natW / aspectRatio;
    sy0 = (natH - sh) / 2;
  }

  const stripSrcW = sw / STRIPS;
  for (let i = 0; i < STRIPS; i++) {
    const x0 = xs[i];
    const x1 = xs[i + 1];
    if (x1 < 0 || x0 > viewW || x1 <= x0) continue;
    const yTop = Math.min(tops[i], tops[i + 1]) - 1;
    const yBot = Math.max(bots[i], bots[i + 1]) + 1;
    // Slight horizontal overlap (0.75px) prevents subpixel gaps on canvas
    ctx.drawImage(
      img,
      sx0 + i * stripSrcW,
      sy0,
      stripSrcW,
      sh,
      x0,
      yTop,
      x1 - x0 + 0.75,
      yBot - yTop,
    );
  }

  ctx.restore();
}

export type TiltedGridImage = {
  src: string;
  /** Kept for API compatibility; the decorative band is aria-hidden. */
  alt?: string;
};

export type TiltedGridHeroProps = {
  /**
   * Images run along the row in order. Short lists repeat seamlessly.
   */
  images: TiltedGridImage[];
  /**
   * Seconds for the row to advance by one tile. Speed is per tile, not per
   * crossing, so a phone and an ultrawide move at the same pace.
   * @default 4
   */
  speed?: number;
  /** Tile height, as a percentage of the hero's height. @default 26 */
  tileHeight?: number;
  /** Tile width divided by tile height. @default 16 / 9 */
  aspectRatio?: number;
  /** Space between tiles, as a percentage of a tile's height. @default 6 */
  gap?: number;
  /** Vertical centre of the row, as a percentage of the hero's height. @default 56 */
  axis?: number;
  /**
   * How far the row has bent round by the frame's edge, in degrees. Higher
   * curls the ends harder toward the viewer. Clamped to 5–85.
   * @default 80
   */
  curve?: number;
  /** Width of the fade at each end, as a percentage of the hero's width. @default 12 */
  fade?: number;
  /** Content rendered above the band. */
  children?: React.ReactNode;
  className?: string;
};

export function TiltedGridHero({
  images,
  speed = 4,
  tileHeight = 26,
  aspectRatio = 16 / 9,
  gap = 6,
  axis = 56,
  curve = 80,
  fade = 12,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & TiltedGridHeroProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const loadedRef = React.useRef<HTMLImageElement[]>([]);
  const sizeRef = React.useRef({ width: 0, height: 0 });
  const bend = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180;

  React.useEffect(() => {
    loadedRef.current = images.map(({ src }) => {
      const img = new Image();
      img.src = src;
      return img;
    });
  }, [images]);

  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const syncSize = (width: number, height: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width, height };
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const rect = container.getBoundingClientRect();
    syncSize(rect.width, rect.height);

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      syncSize(width, height);
    });
    ro.observe(container);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rafId = 0;
    let lastTime = performance.now();
    let offset = 0;
    let inView = true;

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(container);

    const render = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (!motionQuery.matches && !document.hidden && inView && speed > 0) {
        offset += dt / speed;
      }

      const { width, height } = sizeRef.current;
      const imgs = loadedRef.current;
      ctx.clearRect(0, 0, width, height);

      if (width > 0 && height > 0 && imgs.length > 0) {
        const { h, radius, unit, pitch, limit } = measure(
          width,
          height,
          tileHeight,
          aspectRatio,
          gap,
          bend,
        );

        if (h > 0 && radius > 0) {
          const tileRad = aspectRatio * unit;
          const cx = width / 2;
          const cy = (axis / 100) * height;
          const minIdx = Math.ceil(offset - limit / pitch);
          const maxIdx = Math.floor(offset + limit / pitch);

          for (let idx = minIdx; idx <= maxIdx; idx++) {
            const thetaCenter = (offset - idx) * pitch;
            const imgIdx = ((idx % imgs.length) + imgs.length) % imgs.length;
            drawCurvedTile(
              ctx,
              imgs[imgIdx],
              thetaCenter,
              tileRad,
              aspectRatio,
              radius,
              h,
              cx,
              cy,
              width,
            );
          }

          if (fade > 0) {
            const fadeW = (Math.min(50, fade) / 100) * width;
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";

            const leftGrad = ctx.createLinearGradient(0, 0, fadeW, 0);
            leftGrad.addColorStop(0, "rgba(0,0,0,1)");
            leftGrad.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = leftGrad;
            ctx.fillRect(0, 0, fadeW, height);

            const rightGrad = ctx.createLinearGradient(width - fadeW, 0, width, 0);
            rightGrad.addColorStop(0, "rgba(0,0,0,0)");
            rightGrad.addColorStop(1, "rgba(0,0,0,1)");
            ctx.fillStyle = rightGrad;
            ctx.fillRect(width - fadeW, 0, fadeW, height);

            ctx.restore();
          }
        }
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
    };
  }, [speed, tileHeight, aspectRatio, gap, axis, bend, fade]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      {children}
    </div>
  );
}

export default TiltedGridHero;
