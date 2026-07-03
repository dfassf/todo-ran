import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next.js가 서버 전용 모듈 보호에 쓰는 마커. 테스트 환경에선 무해한 stub으로 대체.
      "server-only": path.resolve(__dirname, "./__tests__/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**", "src/hooks/**"],
      exclude: ["src/lib/dev-seed.ts", "**/*.d.ts"],
    },
  },
});
