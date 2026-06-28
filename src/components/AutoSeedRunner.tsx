"use client";

import { useEffect } from "react";
import { maybeAutoSeed } from "@/lib/dev-seed";

// 게스트 모드 첫 진입 시 비어 있으면 샘플 데이터를 자동으로 채움.
// dev 빌드에서만 동작.
export default function AutoSeedRunner() {
  useEffect(() => {
    maybeAutoSeed().catch((e) => console.error("[auto-seed] failed:", e));
  }, []);
  return null;
}
