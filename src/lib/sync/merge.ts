// LWW (Last-Write-Wins) row 단위 머지
// updated_at이 더 큰 쪽 채택. 같으면 local 유지.

export interface HasUpdatedAt {
  updated_at: string;
}

export const mergeLww = <T extends HasUpdatedAt>(local: T | null, remote: T | null): T | null => {
  if (!local && !remote) return null;
  if (!local) return remote;
  if (!remote) return local;
  return local.updated_at >= remote.updated_at ? local : remote;
};
