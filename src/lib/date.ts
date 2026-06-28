import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { ko } from "date-fns/locale";

export const toDateString = (d: Date): string => format(d, "yyyy-MM-dd");

export const fromDateString = (s: string): Date => parseISO(s);

export const todayString = (): string => toDateString(new Date());

export const formatMonthDay = (d: Date | string): string => {
  const date = typeof d === "string" ? fromDateString(d) : d;
  return format(date, "M월 d일", { locale: ko });
};

export const formatYearMonth = (d: Date): string => format(d, "yyyy년 M월", { locale: ko });

export const formatMonthDayWithWeekday = (d: Date | string): string => {
  const date = typeof d === "string" ? fromDateString(d) : d;
  return format(date, "M. d. (E)", { locale: ko });
};

export const getMonthGrid = (anchor: Date): Date[] => {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
};

export const isPast = (dateStr: string): boolean => {
  const d = startOfDay(fromDateString(dateStr));
  return isBefore(d, startOfDay(new Date()));
};

export { addMonths, subMonths, isSameDay, isToday };
