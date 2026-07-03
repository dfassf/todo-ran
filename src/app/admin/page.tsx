"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// /admin 진입 시 기본 탭(errors)로 리다이렉트
export default function AdminIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/errors");
  }, [router]);
  return null;
}
