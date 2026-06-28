import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export const proxy = (request: NextRequest) => updateSession(request);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
