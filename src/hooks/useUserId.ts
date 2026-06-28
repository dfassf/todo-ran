"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { getOrCreateGuestUserId } from "@/lib/db/repo";

// 인증 사용자가 있으면 그 id, 없으면 게스트 UUID
export const useUserId = (): { userId: string | null; isGuest: boolean } => {
  const { user, loading } = useAuth();
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    if (user) return;
    getOrCreateGuestUserId().then(setGuestId);
  }, [user]);

  if (loading) return { userId: null, isGuest: false };
  if (user) return { userId: user.id, isGuest: false };
  return { userId: guestId, isGuest: true };
};
