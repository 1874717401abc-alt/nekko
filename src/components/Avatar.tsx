const COLORS = [
  "bg-rose-500/80",
  "bg-orange-500/80",
  "bg-amber-500/80",
  "bg-emerald-500/80",
  "bg-teal-500/80",
  "bg-cyan-500/80",
  "bg-blue-500/80",
  "bg-violet-500/80",
  "bg-fuchsia-500/80",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function Avatar({
  src,
  name,
  size = 36,
  className = "",
}: {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`rounded-full flex items-center justify-center font-medium text-white shrink-0 ${colorFor(
        name
      )} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
