"use client";

import { useSync } from "@/hooks/useSync";

export default function SyncRunner() {
  useSync();
  return null;
}
