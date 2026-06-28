import PageHeader from "./ui/PageHeader";
import { formatMonthDay } from "@/lib/date";

interface Props {
  date: string | Date;
  rightSlot?: React.ReactNode;
  subtitle?: string;
}

export default function DateHeader({ date, rightSlot, subtitle }: Props) {
  return <PageHeader title={formatMonthDay(date)} rightSlot={rightSlot} subtitle={subtitle} />;
}
