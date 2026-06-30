"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { todayString } from "@/lib/date";

interface ContextValue {
  selectedDate: string; // yyyy-mm-dd
  setSelectedDate: (date: string) => void;
}

const SelectedDateContext = createContext<ContextValue>({
  selectedDate: "",
  setSelectedDate: () => {},
});

// 캘린더에서 선택한 날짜를 GlobalAddSheet 같은 다른 컴포넌트가 알게 해주는 컨텍스트.
// 기본값은 오늘. 캘린더 페이지가 selected를 바꾸면 + 버튼이 그 날짜로 미리 채워짐.
export default function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string>(todayString());

  return (
    <SelectedDateContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </SelectedDateContext.Provider>
  );
}

export const useSelectedDate = (): ContextValue => useContext(SelectedDateContext);
