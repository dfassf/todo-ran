export const DEFAULT_COLORS: { name: string; value: string }[] = [
  { name: "파랑", value: "#3B82F6" },
  { name: "초록", value: "#10B981" },
  { name: "노랑", value: "#F59E0B" },
  { name: "주황", value: "#F97316" },
  { name: "빨강", value: "#EF4444" },
  { name: "보라", value: "#8B5CF6" },
  { name: "분홍", value: "#EC4899" },
  { name: "회색", value: "#6B7280" },
];

export const isValidHexColor = (color: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(color);
