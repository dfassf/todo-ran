"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, LogIn, LogOut, ChevronRight } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import CategoryDot from "@/components/CategoryDot";
import CategoryPicker from "@/components/CategoryPicker";
import { useCategories } from "@/hooks/useCategories";
import { useAuth, signOut } from "@/hooks/useAuth";
import { DEFAULT_COLORS } from "@/lib/colors";

export default function SettingsPage() {
  const { user } = useAuth();
  const { categories, create, update, remove } = useCategories();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0].value);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingColor, setEditingColor] = useState("");

  const submitNew = async () => {
    if (!newLabel.trim()) return;
    await create(newLabel.trim(), newColor);
    setNewLabel("");
    setNewColor(DEFAULT_COLORS[0].value);
  };

  const startEdit = (id: string, label: string, color: string) => {
    setEditingId(id);
    setEditingLabel(label);
    setEditingColor(color);
  };

  const saveEdit = async () => {
    if (!editingId || !editingLabel.trim()) return;
    await update(editingId, { label: editingLabel.trim(), color: editingColor });
    setEditingId(null);
  };

  return (
    <div>
      <PageHeader title="설정" />

      <Section title="계정">
        {user ? (
          <div className="flex items-center justify-between rounded-md bg-surface px-4 py-3">
            <div>
              <p className="text-sub text-muted">로그인됨</p>
              <p className="text-body text-text">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-1 text-sub font-medium text-muted active:text-text-sub"
            >
              <LogOut size={14} />
              로그아웃
            </button>
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className="flex h-control-lg items-center justify-between rounded-md bg-surface px-4 active:bg-surface-strong"
            >
              <span className="flex items-center gap-2 text-body text-text">
                <LogIn size={18} className="text-text-sub" />
                로그인 / 회원가입
              </span>
              <ChevronRight size={18} className="text-muted" />
            </Link>
            <p className="mt-2 text-caption text-muted">
              로그인하면 이 기기의 데이터가 서버에 저장되고 다른 기기와 동기화돼요.
            </p>
          </>
        )}
      </Section>

      <Section title="카테고리">
        {categories.length === 0 ? (
          <p className="rounded-md bg-surface px-4 py-6 text-center text-sub text-muted">
            아직 카테고리가 없어요. 아래에서 만들어 보세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.id} className="rounded-md bg-surface p-3">
                {editingId === c.id ? (
                  <div className="space-y-3">
                    <Input value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)} />
                    <CategoryPicker value={editingColor} onChange={setEditingColor} />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="md"
                        fullWidth
                        onClick={() => setEditingId(null)}
                      >
                        취소
                      </Button>
                      <Button size="md" fullWidth onClick={saveEdit}>
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => startEdit(c.id, c.label, c.color)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <CategoryDot color={c.color} size={14} />
                      <span className="text-body text-text">{c.label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-sm text-muted active:bg-surface-strong"
                      aria-label="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 rounded-md bg-surface p-4">
          <p className="mb-3 text-sub font-semibold text-text-sub">새 카테고리</p>
          <Input
            placeholder="이름 (예: 운동)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <div className="mt-3">
            <CategoryPicker value={newColor} onChange={setNewColor} />
          </div>
          <Button className="mt-4" fullWidth onClick={submitNew} disabled={!newLabel.trim()}>
            추가
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 pb-6">
      <h2 className="mb-3 text-sub font-semibold text-text-sub">{title}</h2>
      {children}
    </section>
  );
}
