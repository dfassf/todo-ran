import { describe, it, expect } from "vitest";
import { DEFAULT_COLORS, isValidHexColor } from "@/lib/colors";

describe("isValidHexColor", () => {
  it("유효한 #RRGGBB는 통과", () => {
    expect(isValidHexColor("#3B82F6")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#FFFFFF")).toBe(true);
    expect(isValidHexColor("#abcdef")).toBe(true);
  });

  it("#RGB 3자리 단축형은 거부", () => {
    expect(isValidHexColor("#3B8")).toBe(false);
  });

  it("# 없으면 거부", () => {
    expect(isValidHexColor("3B82F6")).toBe(false);
  });

  it("8자리 (알파 채널) 거부", () => {
    expect(isValidHexColor("#3B82F6FF")).toBe(false);
  });

  it("hex 범위 밖 문자 거부", () => {
    expect(isValidHexColor("#GGGGGG")).toBe(false);
    expect(isValidHexColor("#3B82FZ")).toBe(false);
  });

  it("빈 문자열/공백 거부", () => {
    expect(isValidHexColor("")).toBe(false);
    expect(isValidHexColor(" #3B82F6")).toBe(false);
  });
});

describe("DEFAULT_COLORS", () => {
  it("정확히 8개", () => {
    expect(DEFAULT_COLORS).toHaveLength(8);
  });

  it("모든 색상이 유효한 hex", () => {
    for (const c of DEFAULT_COLORS) {
      expect(isValidHexColor(c.value)).toBe(true);
    }
  });

  it("색상 값이 모두 유니크 (중복 없음)", () => {
    const values = DEFAULT_COLORS.map((c) => c.value.toLowerCase());
    expect(new Set(values).size).toBe(values.length);
  });

  it("색상 이름이 모두 한국어 채워짐 (빈 문자열 아님)", () => {
    for (const c of DEFAULT_COLORS) {
      expect(c.name.trim().length).toBeGreaterThan(0);
    }
  });
});
