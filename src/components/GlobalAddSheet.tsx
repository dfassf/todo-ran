"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import Sheet from "./ui/Sheet";
import TodoForm from "./TodoForm";
import { useUserId } from "@/hooks/useUserId";
import { createTodo } from "@/lib/db/repo";
import { todayString } from "@/lib/date";
import { dispatchTodoChanged } from "@/lib/events";

const HIDDEN_ROUTES = ["/settings", "/login"];

export default function GlobalAddSheet() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (HIDDEN_ROUTES.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 w-full max-w-app -translate-x-1/2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="pointer-events-auto absolute right-5 bottom-[96px] flex h-fab w-fab items-center justify-center rounded-full bg-accent text-white shadow-fab transition-transform active:scale-95"
          aria-label="새 할 일"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      </div>

      <AddSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { userId } = useUserId();
  const today = todayString();

  return (
    <Sheet open={open} onClose={onClose} title="새 할 일">
      <TodoForm
        initial={{
          title: "",
          dueDate: today,
          categoryId: null,
          method: "tap",
          targetCount: 5,
          targetSeconds: 60,
        }}
        submitLabel="추가"
        submittingLabel="추가 중…"
        onCancel={onClose}
        onSubmit={async (values) => {
          if (!userId) return;
          await createTodo({
            userId,
            categoryId: values.categoryId,
            title: values.title,
            dueDate: values.dueDate,
            completionMethod: values.method,
            targetCount: values.method === "count" ? values.targetCount : null,
            targetSeconds: values.method === "timer" ? values.targetSeconds : null,
          });
          dispatchTodoChanged();
          onClose();
        }}
      />
    </Sheet>
  );
}
