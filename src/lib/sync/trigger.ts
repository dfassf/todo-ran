import { pushPending } from "./engine";

// 로컬 변경 후 즉시 백그라운드 push 시도.
// 비동기·에러 무시 (sync_queue가 어차피 다음 sync에서 처리)
export const triggerPushSoon = () => {
  if (typeof window === "undefined") return;
  setTimeout(() => {
    pushPending().catch(() => {});
  }, 200);
};
