// 페이지 간 즉시 반영용 글로벌 이벤트.
// 전역 + 버튼이 할 일을 추가하거나 컴포넌트가 mutation을 일으키면
// 다른 화면이 IndexedDB를 다시 읽도록 알리는 신호.

export const TODO_CHANGED = "todo-ran:todo-changed";
export const CATEGORY_CHANGED = "todo-ran:category-changed";

export const dispatchTodoChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TODO_CHANGED));
};

export const dispatchCategoryChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CATEGORY_CHANGED));
};
