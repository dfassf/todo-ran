interface Props {
  color?: string | null;
  size?: number;
  filled?: boolean;
}

export default function CategoryDot({ color, size = 10, filled = true }: Props) {
  const c = color ?? "#D1D6DB";
  return (
    <span
      className="inline-block rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: filled ? c : "transparent",
        border: filled ? "none" : `1.5px solid ${c}`,
      }}
    />
  );
}
