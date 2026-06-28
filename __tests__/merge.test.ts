import { describe, it, expect } from "vitest";
import { mergeLww } from "@/lib/sync/merge";

interface Row {
  id: string;
  updated_at: string;
  value: string;
}

describe("mergeLww", () => {
  const local: Row = { id: "1", updated_at: "2026-06-28T10:00:00Z", value: "local" };
  const remote: Row = { id: "1", updated_at: "2026-06-28T11:00:00Z", value: "remote" };

  it("로컬만 있으면 로컬 반환", () => {
    expect(mergeLww(local, null)).toBe(local);
  });

  it("리모트만 있으면 리모트 반환", () => {
    expect(mergeLww(null, remote)).toBe(remote);
  });

  it("둘 다 null이면 null", () => {
    expect(mergeLww<Row>(null, null)).toBeNull();
  });

  it("리모트가 더 최신이면 리모트 채택", () => {
    expect(mergeLww(local, remote)).toBe(remote);
  });

  it("로컬이 더 최신이면 로컬 채택", () => {
    const newerLocal = { ...local, updated_at: "2026-06-28T12:00:00Z" };
    expect(mergeLww(newerLocal, remote)).toBe(newerLocal);
  });

  it("타임스탬프가 같으면 로컬 유지 (이미 같은 상태로 간주)", () => {
    const sameTime = { ...remote, value: "remote-same" };
    const localSame = { ...local, updated_at: remote.updated_at };
    expect(mergeLww(localSame, sameTime)).toBe(localSame);
  });

  it("소프트 삭제도 동일 규칙 — deleted_at 셋된 쪽이 더 최신이면 그게 이김", () => {
    const deleted: Row & { deleted_at: string } = {
      id: "1",
      updated_at: "2026-06-28T13:00:00Z",
      value: "remote",
      deleted_at: "2026-06-28T13:00:00Z",
    };
    expect(mergeLww(local, deleted)).toBe(deleted);
  });
});
