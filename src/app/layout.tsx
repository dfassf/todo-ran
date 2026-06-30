import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import SyncRunner from "@/components/SyncRunner";
import AutoSeedRunner from "@/components/AutoSeedRunner";
import GlobalAddSheet from "@/components/GlobalAddSheet";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "투두리스트",
  description: "물리적 행동으로 완료하는 투두 앱",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-surface">
        <AuthProvider>
          <SyncRunner />
          <AutoSeedRunner />
          <div
            className="mx-auto w-full max-w-app min-h-screen bg-bg"
            style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}
          >
            {children}
          </div>
          <GlobalAddSheet />
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
