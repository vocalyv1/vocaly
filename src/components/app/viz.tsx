"use client";

import { useEffect, useRef, useState } from "react";

const EASE = (t: number) => 1 - Math.pow(1 - t, 4);

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function useTween(target: number, run: boolean, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(target);
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * EASE(p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return v;
}

// Nombre qui défile jusqu'à sa valeur.
export function CountUp({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const v = useTween(value, seen);
  return <span ref={ref} className="tabular-nums">{v.toLocaleString("fr-FR", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}{suffix}</span>;
}

// Jauge semi-circulaire (taux de prise en charge), sur carte noire.
export function Gauge({ value, label }: { value: number | null; label: string }) {
  const [ref, seen] = useInView<SVGSVGElement>();
  const v = useTween(value ?? 0, seen, 1600);
  const R = 80, C = Math.PI * R;
  const a = Math.PI * (1 - v / 100);
  const kx = 100 + R * Math.cos(a), ky = 100 - R * Math.sin(a);
  return (
    <div className="mx-auto w-full max-w-[260px]">
      <div className="relative">
      <svg ref={ref} viewBox="0 0 200 112" className="w-full">
        {Array.from({ length: 41 }, (_, i) => {
          const t = Math.PI * (1 - i / 40);
          const r1 = 94, r2 = i % 5 === 0 ? 100 : 97;
          return <line key={i} x1={100 + r1 * Math.cos(t)} y1={100 - r1 * Math.sin(t)} x2={100 + r2 * Math.cos(t)} y2={100 - r2 * Math.sin(t)} className="stroke-sur-brand/25" strokeWidth="1" />;
        })}
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" className="stroke-sur-brand/15" strokeWidth="10" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" fill="none" className="stroke-sur-brand" strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - v / 100)} />
        {value != null && <circle cx={kx} cy={ky} r="7" className="fill-brand stroke-sur-brand" strokeWidth="3" />}
      </svg>
      <p className="absolute inset-x-0 bottom-0 text-center text-4xl font-medium tabular-nums">{value == null ? "—" : `${Math.round(v)} %`}</p>
      </div>
      <p className="mt-3 text-center text-xs opacity-60">{label}</p>
    </div>
  );
}

// Courbe miniature.
export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  const [ref, seen] = useInView<SVGSVGElement>();
  const max = Math.max(1, ...data);
  const w = 100, h = 28;
  const pts = data.map((d, i) => [(i / Math.max(1, data.length - 1)) * w, h - 2 - (d / max) * (h - 4)]);
  const path = pts.map((p, i) => {
    if (i === 0) return `M${p[0]},${p[1]}`;
    const [x0, y0] = pts[i - 1];
    const cx = (x0 + p[0]) / 2;
    return `C${cx},${y0} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }).join(" ");
  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={`h-7 w-full ${className}`}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" pathLength={1}
        strokeDasharray={1} strokeDashoffset={seen ? 0 : 1} style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)" }} />
    </svg>
  );
}

// Petites barres verticales (7 derniers jours).
export function MiniBars({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-8 items-end gap-[3px]">
      {data.map((d, i) => (
        <span key={i} className="bar-grow w-[5px] rounded-full bg-current" style={{ height: `${Math.max(12, (d / max) * 100)}%`, opacity: d ? 1 : 0.25, animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

// Histogramme hachuré avec infobulle et barre mise en avant.
export function BarChart({ days }: { days: { label: string; total: number; resolved: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ...days.map((d) => d.total));
  const top = Math.ceil(max / 4) * 4;
  const avg = days.reduce((a, d) => a + d.total, 0) / days.length;
  const best = days.reduce((b, d, i) => (d.total > days[b].total ? i : b), 0);
  const focus = hover ?? (days[best].total ? best : null);
  return (
    <div className="relative">
      <div className="flex h-56 gap-3">
        <div className="flex flex-col justify-between pb-6 text-[10px] text-gris tabular-nums">
          {[4, 3, 2, 1, 0].map((k) => <span key={k}>{(top / 4) * k}</span>)}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-0 bottom-6 flex items-end gap-[3px] sm:gap-1.5" onMouseLeave={() => setHover(null)}>
            {avg > 0 && (
              <div className="pointer-events-none absolute inset-x-0 z-[1] border-t border-dashed border-gris/50" style={{ bottom: `${(avg / top) * 100}%` }}>
                <span className="absolute -top-4 right-0 text-[10px] text-gris">moy. {avg.toFixed(1)}</span>
              </div>
            )}
            {days.map((d, i) => {
              const on = focus === i;
              return (
                <div key={i} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
                  <div
                    className={`bar-grow w-full rounded-full transition-colors duration-300 ${on ? "bg-brand" : "hatch"}`}
                    style={{ height: `${Math.max(d.total ? 8 : 4, (d.total / top) * 100)}%`, animationDelay: `${i * 25}ms` }}
                  />
                  {on && (
                    <div className="rise absolute bottom-full left-1/2 z-10 mb-2 w-36 -translate-x-1/2 rounded-xl bg-brand p-2.5 text-[11px] text-sur-brand shadow-xl">
                      <p className="mb-1 font-medium">{d.label}</p>
                      <p className="flex justify-between opacity-80"><span>Appels</span><span>{d.total}</span></p>
                      <p className="flex justify-between opacity-80"><span>Traités</span><span>{d.resolved}</span></p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-gris">
            {days.filter((_, i) => i % Math.ceil(days.length / 6) === 0).map((d) => <span key={d.label}>{d.label}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
