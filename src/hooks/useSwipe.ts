"use client";

import { useRef, type PointerEvent } from "react";

interface Options {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number; // 이 거리 이상 움직여야 스와이프로 인정 (px)
  maxOffAxis?: number; // 직각 방향 흔들림 허용 (px)
}

interface Handlers {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: PointerEvent<HTMLElement>) => void;
  onPointerCancel: () => void;
}

// 가벼운 스와이프 감지. PointerEvent만 사용해서 마우스/터치 둘 다 동작.
// 스크롤과 충돌 방지를 위해 직각 방향(maxOffAxis)이 너무 크면 무시.
export const useSwipe = (options: Options): Handlers => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    maxOffAxis = 60,
  } = options;

  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown: (e) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      start.current = null;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      // 가로 스와이프 — 직각(세로) 흔들림이 작아야 인정
      if (absX >= threshold && absY <= maxOffAxis) {
        if (dx < 0) onSwipeLeft?.();
        else onSwipeRight?.();
        return;
      }

      // 세로 스와이프 — 직각(가로) 흔들림이 작아야 인정
      if (absY >= threshold && absX <= maxOffAxis) {
        if (dy < 0) onSwipeUp?.();
        else onSwipeDown?.();
      }
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
};
