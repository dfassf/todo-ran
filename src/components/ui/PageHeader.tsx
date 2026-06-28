interface Props {
  title: string;
  rightSlot?: React.ReactNode;
  subtitle?: string;
}

export default function PageHeader({ title, rightSlot, subtitle }: Props) {
  return (
    <header className="px-5 pt-6 pb-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-display text-text">{title}</h1>
        {rightSlot && <div className="flex shrink-0 items-center">{rightSlot}</div>}
      </div>
      {subtitle && <p className="mt-1 text-sub text-muted">{subtitle}</p>}
    </header>
  );
}
