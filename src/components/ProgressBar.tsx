interface Props {
  total: number;
  done: number;
}

export default function ProgressBar({ total, done }: Props) {
  const ratio = total === 0 ? 0 : done / total;
  const remaining = Math.max(0, total - done);

  return (
    <div className="px-5 pb-4">
      <p className="mb-2 flex items-center gap-2 text-caption text-muted">
        <span>
          오늘 <span className="text-text-sub font-semibold">{total}</span>
        </span>
        <span>·</span>
        <span>
          한 일 <span className="text-text-sub font-semibold">{done}</span>
        </span>
        <span>·</span>
        <span>
          남은 <span className="text-text-sub font-semibold">{remaining}</span>
        </span>
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-strong">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
