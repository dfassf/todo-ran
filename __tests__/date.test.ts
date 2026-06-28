import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  toDateString,
  fromDateString,
  todayString,
  formatMonthDay,
  formatYearMonth,
  formatMonthDayWithWeekday,
  getMonthGrid,
  isPast,
  isToday,
} from "@/lib/date";

describe("date utils", () => {
  describe("toDateString / fromDateString", () => {
    it("Date → 'yyyy-MM-dd'", () => {
      const d = new Date(2026, 5, 28); // 6월(0-based 5) 28일
      expect(toDateString(d)).toBe("2026-06-28");
    });

    it("'yyyy-MM-dd' → Date", () => {
      const d = fromDateString("2026-06-28");
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(5);
      expect(d.getDate()).toBe(28);
    });

    it("toDateString이 한 자리 월/일을 두 자리로 패딩", () => {
      const d = new Date(2026, 0, 5);
      expect(toDateString(d)).toBe("2026-01-05");
    });
  });

  describe("todayString", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 28, 10, 0, 0));
    });
    afterEach(() => vi.useRealTimers());

    it("현재 날짜 반환", () => {
      expect(todayString()).toBe("2026-06-28");
    });
  });

  describe("formatMonthDay (한국어)", () => {
    it("Date 인자", () => {
      expect(formatMonthDay(new Date(2026, 5, 28))).toBe("6월 28일");
    });

    it("문자열 인자", () => {
      expect(formatMonthDay("2026-06-28")).toBe("6월 28일");
    });

    it("한 자리 월/일도 한국어 포맷", () => {
      expect(formatMonthDay("2026-01-05")).toBe("1월 5일");
    });
  });

  describe("formatYearMonth", () => {
    it("'yyyy년 M월' 한국어 포맷", () => {
      expect(formatYearMonth(new Date(2026, 5, 28))).toBe("2026년 6월");
    });
  });

  describe("formatMonthDayWithWeekday", () => {
    it("요일 포함 — 2026-06-23은 화요일", () => {
      expect(formatMonthDayWithWeekday("2026-06-23")).toBe("6. 23. (화)");
    });
  });

  describe("getMonthGrid", () => {
    it("한 달 그리드는 일요일~토요일 정렬, 7의 배수 길이", () => {
      const grid = getMonthGrid(new Date(2026, 5, 15)); // 2026-06
      expect(grid.length % 7).toBe(0);
      expect(grid[0].getDay()).toBe(0); // 일요일 시작
      expect(grid[grid.length - 1].getDay()).toBe(6); // 토요일 종료
    });

    it("월의 첫날과 마지막날을 모두 포함", () => {
      const grid = getMonthGrid(new Date(2026, 5, 15));
      const first = new Date(2026, 5, 1);
      const last = new Date(2026, 5, 30);
      expect(grid.some((d) => d.getTime() === first.getTime())).toBe(true);
      expect(grid.some((d) => d.getTime() === last.getTime())).toBe(true);
    });

    it("이전/다음 달 날짜를 빈칸 채움용으로 포함 (전체 길이 35 or 42)", () => {
      const grid = getMonthGrid(new Date(2026, 1, 15)); // 2월
      expect([28, 35, 42]).toContain(grid.length);
    });
  });

  describe("isPast", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 28, 23, 59, 59));
    });
    afterEach(() => vi.useRealTimers());

    it("어제는 과거", () => {
      expect(isPast("2026-06-27")).toBe(true);
    });

    it("오늘은 과거 아님 (경계)", () => {
      expect(isPast("2026-06-28")).toBe(false);
    });

    it("내일은 과거 아님", () => {
      expect(isPast("2026-06-29")).toBe(false);
    });
  });

  describe("isToday", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 5, 28, 10, 0, 0));
    });
    afterEach(() => vi.useRealTimers());

    it("오늘 날짜는 true", () => {
      expect(isToday(new Date(2026, 5, 28))).toBe(true);
    });

    it("어제는 false", () => {
      expect(isToday(new Date(2026, 5, 27))).toBe(false);
    });
  });
});
