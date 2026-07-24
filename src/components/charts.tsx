// Dependency-free inline SVG charts. Pure/deterministic so they render on the
// server. Used by the analytics dashboard.

function smoothPath(points: [number, number][]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

export function AreaSpark({ data, color = "var(--accent)", height = 90, tone = "up" }: { data: number[]; color?: string; height?: number; tone?: "up" | "down" }) {
  const w = 320;
  const h = height;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts: [number, number][] = data.map((v, i) => [(i / (data.length - 1)) * w, h - 8 - ((v - min) / range) * (h - 20)]);
  const line = smoothPath(pts);
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  const id = `g-${tone}-${Math.round(max)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-[90px] w-full">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function BarChart({ data, color = "var(--accent)", height = 260 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const w = 760;
  const h = height;
  const pad = 34;
  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = (w - pad) / data.length;
  const ticks = 5;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = 12 + ((h - 44) / ticks) * i;
        const val = Math.round((max / ticks) * (ticks - i));
        return (
          <g key={i}>
            <line x1={pad} y1={y} x2={w} y2={y} stroke="var(--border)" strokeWidth="1" opacity="0.6" />
            <text x={0} y={y + 4} fontSize="11" fill="var(--muted)">{val}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const bh = (d.value / max) * (h - 44);
        const x = pad + i * bw + bw * 0.16;
        const y = 12 + (h - 44) - bh;
        return <rect key={i} x={x} y={y} width={bw * 0.68} height={Math.max(bh, 2)} rx="4" fill={color} />;
      })}
    </svg>
  );
}

export function Donut({ segments, size = 190, thickness = 24 }: { segments: { label: string; value: number; color: string }[]; size?: number; thickness?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {segments.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * c;
        const seg = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          />
        );
        offset += dash;
        return seg;
      })}
    </svg>
  );
}
