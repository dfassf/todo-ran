interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-title text-text">{title}</p>
      {description && <p className="mt-2 text-sub text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
