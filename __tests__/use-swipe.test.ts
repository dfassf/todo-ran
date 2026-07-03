import { describe, it, expect, vi } from "vitest";
import type { PointerEvent as ReactPointerEvent } from "react";

// useSwipe는 React hook이지만 useRef만 사용하고 상태 업데이트는 없음.
// renderHook 없이 useRef의 최소 shim으로 hook을 순수 함수처럼 호출해서 검증.
// 이유: @testing-library/react가 vitest+React19 조합에서 useRef를 못 찾는 이슈가 있어서
// 훅의 순수 로직만 격리 검증하는 게 더 안전.

// React.useRef를 원본 그대로 두고 vitest 환경에서 이 파일만 자체 shim
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useRef: <T>(init: T) => ({ current: init }),
  };
});

// mock 뒤에 import
import { useSwipe } from "@/hooks/useSwipe";

type MockPointerEvent = { clientX: number; clientY: number };
const asEvent = (e: MockPointerEvent): ReactPointerEvent<HTMLElement> =>
  e as unknown as ReactPointerEvent<HTMLElement>;

describe("useSwipe", () => {
  it("좌로 스와이프 (dx = -100, dy = 0) → onSwipeLeft 호출", () => {
    const onSwipeLeft = vi.fn();
    const handlers = useSwipe({ onSwipeLeft });

    handlers.onPointerDown(asEvent({ clientX: 200, clientY: 100 }));
    handlers.onPointerUp(asEvent({ clientX: 100, clientY: 100 }));

    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });

  it("우로 스와이프 → onSwipeRight 호출", () => {
    const onSwipeRight = vi.fn();
    const handlers = useSwipe({ onSwipeRight });

    handlers.onPointerDown(asEvent({ clientX: 100, clientY: 100 }));
    handlers.onPointerUp(asEvent({ clientX: 200, clientY: 100 }));

    expect(onSwipeRight).toHaveBeenCalledOnce();
  });

  it("위로 스와이프 → onSwipeUp 호출", () => {
    const onSwipeUp = vi.fn();
    const handlers = useSwipe({ onSwipeUp });

    handlers.onPointerDown(asEvent({ clientX: 100, clientY: 200 }));
    handlers.onPointerUp(asEvent({ clientX: 100, clientY: 100 }));

    expect(onSwipeUp).toHaveBeenCalledOnce();
  });

  it("아래로 스와이프 → onSwipeDown 호출", () => {
    const onSwipeDown = vi.fn();
    const handlers = useSwipe({ onSwipeDown });

    handlers.onPointerDown(asEvent({ clientX: 100, clientY: 100 }));
    handlers.onPointerUp(asEvent({ clientX: 100, clientY: 200 }));

    expect(onSwipeDown).toHaveBeenCalledOnce();
  });

  it("임계값 미달 (기본 50px) → 콜백 호출 X", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const handlers = useSwipe({ onSwipeLeft, onSwipeRight, threshold: 50 });

    handlers.onPointerDown(asEvent({ clientX: 100, clientY: 100 }));
    handlers.onPointerUp(asEvent({ clientX: 140, clientY: 100 })); // 40px

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("가로 스와이프인데 세로 흔들림이 크면 (maxOffAxis 초과) 무시", () => {
    const onSwipeLeft = vi.fn();
    const handlers = useSwipe({ onSwipeLeft, threshold: 50, maxOffAxis: 60 });

    // dx=-100, dy=+80 → 세로 흔들림 80이 maxOffAxis 60 초과
    handlers.onPointerDown(asEvent({ clientX: 200, clientY: 100 }));
    handlers.onPointerUp(asEvent({ clientX: 100, clientY: 180 }));

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("세로 스와이프인데 가로 흔들림이 크면 무시", () => {
    const onSwipeUp = vi.fn();
    const handlers = useSwipe({ onSwipeUp, threshold: 50, maxOffAxis: 60 });

    handlers.onPointerDown(asEvent({ clientX: 100, clientY: 200 }));
    handlers.onPointerUp(asEvent({ clientX: 200, clientY: 100 })); // dx=100, dy=-100

    expect(onSwipeUp).not.toHaveBeenCalled();
  });

  it("PointerDown 없이 PointerUp만 오면 무시", () => {
    const onSwipeLeft = vi.fn();
    const handlers = useSwipe({ onSwipeLeft });

    handlers.onPointerUp(asEvent({ clientX: 100, clientY: 100 }));

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("PointerCancel 후엔 PointerUp이 와도 무시", () => {
    const onSwipeLeft = vi.fn();
    const handlers = useSwipe({ onSwipeLeft });

    handlers.onPointerDown(asEvent({ clientX: 200, clientY: 100 }));
    handlers.onPointerCancel();
    handlers.onPointerUp(asEvent({ clientX: 100, clientY: 100 }));

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("연속 스와이프 — 두 번째도 정상 인식", () => {
    const onSwipeLeft = vi.fn();
    const handlers = useSwipe({ onSwipeLeft });

    handlers.onPointerDown(asEvent({ clientX: 200, clientY: 100 }));
    handlers.onPointerUp(asEvent({ clientX: 100, clientY: 100 }));

    handlers.onPointerDown(asEvent({ clientX: 200, clientY: 100 }));
    handlers.onPointerUp(asEvent({ clientX: 100, clientY: 100 }));

    expect(onSwipeLeft).toHaveBeenCalledTimes(2);
  });

  it("custom threshold — 임계값을 100으로 올리면 60px 이동은 무시", () => {
    const onSwipeLeft = vi.fn();
    const handlers = useSwipe({ onSwipeLeft, threshold: 100 });

    handlers.onPointerDown(asEvent({ clientX: 200, clientY: 100 }));
    handlers.onPointerUp(asEvent({ clientX: 140, clientY: 100 })); // 60px

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("콜백이 없어도 크래시 안 함 (optional handler)", () => {
    const handlers = useSwipe({});

    expect(() => {
      handlers.onPointerDown(asEvent({ clientX: 200, clientY: 100 }));
      handlers.onPointerUp(asEvent({ clientX: 100, clientY: 100 }));
    }).not.toThrow();
  });
});
