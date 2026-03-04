import { useState, useRef, useEffect } from 'react';

interface WorkflowState {
  id: string;
  label: string;
  description: string;
  icon: string;
  accent: string;
  glow: string;
  text: string;
  x: number;
  y: number;
}

interface Transition {
  from: string;
  to: string;
  label: string;
  type: 'primary' | 'danger' | 'secondary';
}

interface LeadStats {
  nuevo: number;
  asignado: number;
  calificado: number;
  vendido: number;
  descartado: number;
}

interface WorkflowCanvasProps {
  stats: LeadStats;
}

const NODE_W = 150;
const NODE_H = 80;

const WORKFLOW_STATES: WorkflowState[] = [
  {
    id: 'nuevo',
    label: 'Nuevo',
    description: 'Sin contactar',
    icon: 'M12 4v16m8-8H4',
    accent: '#3b82f6',
    glow: 'rgba(59,130,246,0.25)',
    text: '#1d4ed8',
    x: 20,
    y: 130,
  },
  {
    id: 'asignado',
    label: 'Asignado',
    description: 'En evaluación',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    accent: '#f59e0b',
    glow: 'rgba(245,158,11,0.25)',
    text: '#b45309',
    x: 200,
    y: 40,
  },
  {
    id: 'calificado',
    label: 'Calificado',
    description: 'Listo para venta',
    icon: 'M5 13l4 4L19 7',
    accent: '#8b5cf6',
    glow: 'rgba(139,92,246,0.25)',
    text: '#6d28d9',
    x: 380,
    y: 130,
  },
  {
    id: 'vendido',
    label: 'Vendido',
    description: 'Cliente convertido',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    accent: '#10b981',
    glow: 'rgba(16,185,129,0.25)',
    text: '#047857',
    x: 200,
    y: 230,
  },
  {
    id: 'descartado',
    label: 'Descartado',
    description: 'No interesado',
    icon: 'M6 18L18 6M6 6l12 12',
    accent: '#ef4444',
    glow: 'rgba(239,68,68,0.2)',
    text: '#b91c1c',
    x: 560,
    y: 130,
  },
];

const TRANSITIONS: Transition[] = [
  { from: 'nuevo', to: 'asignado', label: 'Iniciar', type: 'primary' },
  { from: 'nuevo', to: 'descartado', label: 'Descartar', type: 'danger' },
  { from: 'asignado', to: 'calificado', label: 'Completar', type: 'primary' },
  { from: 'asignado', to: 'descartado', label: 'Descartar', type: 'danger' },
  { from: 'calificado', to: 'vendido', label: 'Cerrar venta', type: 'primary' },
  { from: 'calificado', to: 'descartado', label: 'Descartar', type: 'danger' },
  { from: 'vendido', to: 'asignado', label: 'Reactivar', type: 'secondary' },
];

const getStateById = (id: string) => WORKFLOW_STATES.find(s => s.id === id)!;

function getEdgePoints(from: WorkflowState, to: WorkflowState) {
  const fx = from.x + NODE_W / 2;
  const fy = from.y + NODE_H / 2;
  const tx = to.x + NODE_W / 2;
  const ty = to.y + NODE_H / 2;

  const dx = tx - fx;
  const dy = ty - fy;

  const fromAngle = Math.atan2(dy, dx);
  const toAngle = Math.atan2(-dy, -dx);

  const halfW = NODE_W / 2 + 4;
  const halfH = NODE_H / 2 + 4;

  const clampEdge = (angle: number, cx: number, cy: number) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const scaleX = cos !== 0 ? Math.abs(halfW / cos) : Infinity;
    const scaleY = sin !== 0 ? Math.abs(halfH / sin) : Infinity;
    const scale = Math.min(scaleX, scaleY);
    return { x: cx + cos * scale, y: cy + sin * scale };
  };

  const start = clampEdge(fromAngle, fx, fy);
  const end = clampEdge(toAngle, tx, ty);
  return { start, end, fx, fy, tx, ty };
}

function buildPath(from: WorkflowState, to: WorkflowState, offset = 0) {
  const { start, end } = getEdgePoints(from, to);

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const perpX = -(end.y - start.y);
  const perpY = end.x - start.x;
  const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
  const cpX = midX + (perpX / len) * offset;
  const cpY = midY + (perpY / len) * offset;

  return {
    d: `M ${start.x} ${start.y} Q ${cpX} ${cpY} ${end.x} ${end.y}`,
    labelX: cpX,
    labelY: cpY,
    endX: end.x,
    endY: end.y,
  };
}

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill={color} />
    </marker>
  );
}

const TRANSITION_COLORS = {
  primary: '#64748b',
  danger: '#f87171',
  secondary: '#a78bfa',
};

const ACTIVE_COLORS = {
  primary: '#0f172a',
  danger: '#ef4444',
  secondary: '#7c3aed',
};

export default function WorkflowCanvas({ stats }: WorkflowCanvasProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [animTick, setAnimTick] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    let frame = 0;
    const loop = () => {
      frame++;
      if (frame % 2 === 0) setAnimTick(t => t + 1);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  const activeState = selected ?? hovered;

  const activeTransitions = activeState
    ? TRANSITIONS.filter(t => t.from === activeState || t.to === activeState)
    : [];
  const activeIds = new Set(activeTransitions.flatMap(t => [t.from, t.to]));

  const SVG_W = 750;
  const SVG_H = 360;

  const pairKey = (a: string, b: string) => [a, b].sort().join('-');
  const pairCounts = new Map<string, number>();
  const pairIndices = new Map<string, number>();

  TRANSITIONS.forEach(t => {
    const k = pairKey(t.from, t.to);
    pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1);
  });

  const transitionsWithPaths = TRANSITIONS.map(t => {
    const k = pairKey(t.from, t.to);
    const count = pairCounts.get(k) ?? 1;
    const idx = pairIndices.get(k) ?? 0;
    pairIndices.set(k, idx + 1);
    const sameDir = t.from < t.to;
    let offset = 0;
    if (count > 1) {
      offset = sameDir ? (idx === 0 ? -28 : 28) : (idx === 0 ? 28 : -28);
    }
    const fromState = getStateById(t.from);
    const toState = getStateById(t.to);
    const path = buildPath(fromState, toState, offset);
    return { ...t, path };
  });

  return (
    <div
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      className="bg-[#0d1117] rounded-2xl border border-white/[0.07] overflow-hidden"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes dash-flow {
          to { stroke-dashoffset: -24; }
        }
        .edge-active {
          animation: dash-flow 0.6s linear infinite;
        }
        @keyframes pulse-ring {
          0% { opacity: 0.6; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
      `}</style>

      <div className="px-4 pt-4 pb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-white/[0.06]">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.15em] text-white/30 uppercase mb-1">Pipeline</p>
          <h2 className="text-lg font-semibold text-white/90">Workflow de Leads</h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(['primary', 'danger', 'secondary'] as const).map(type => (
            <span key={type} className="flex items-center gap-1.5 text-[11px] text-white/40">
              <span
                className="inline-block w-5 h-px"
                style={{
                  background: TRANSITION_COLORS[type],
                  boxShadow: `0 0 4px ${TRANSITION_COLORS[type]}`,
                }}
              />
              {type === 'primary' ? 'Avance' : type === 'danger' ? 'Descarte' : 'Reactivar'}
            </span>
          ))}
          <span className="ml-0 sm:ml-2 text-xs text-white/25 border border-white/10 rounded-lg px-2 py-1">
            {total} leads
          </span>
        </div>
      </div>

      <div className="overflow-x-auto p-2 sm:p-4">
        <div className="min-w-[750px]">
          <svg
            width={750}
            height={360}
            viewBox="0 0 750 360"
            className="w-full h-auto"
          >
          <defs>
            {Object.entries({ ...TRANSITION_COLORS, ...ACTIVE_COLORS }).map(([key, color]) => (
              <ArrowMarker key={key} id={`arrow-${key}`} color={color} />
            ))}
            {WORKFLOW_STATES.map(s => (
              <radialGradient key={s.id} id={`glow-${s.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={s.accent} stopOpacity="0.18" />
                <stop offset="100%" stopColor={s.accent} stopOpacity="0" />
              </radialGradient>
            ))}
            <filter id="blur-glow">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {transitionsWithPaths.map((t, i) => {
            const isActive = activeState === t.from || activeState === t.to;
            const color = isActive ? ACTIVE_COLORS[t.type] : TRANSITION_COLORS[t.type];
            const arrowId = isActive ? `arrow-${t.type}` : `arrow-${t.type}`;
            const dashOffset = animTick * 0.5;

            return (
              <g key={i}>
                <path
                  d={t.path.d}
                  fill="none"
                  stroke={color}
                  strokeWidth={isActive ? 2 : 1.5}
                  strokeDasharray={isActive ? '6 4' : '5 4'}
                  strokeDashoffset={isActive ? -dashOffset % 20 : 0}
                  markerEnd={`url(#${arrowId})`}
                  opacity={activeState && !isActive ? 0.15 : 0.85}
                  style={{ transition: 'opacity 0.2s, stroke-width 0.2s' }}
                />
                {isActive && (
                  <text
                    x={t.path.labelX}
                    y={t.path.labelY - 8}
                    textAnchor="middle"
                    fill={color}
                    fontSize="10"
                    fontWeight="600"
                    fontFamily="DM Sans, system-ui"
                    opacity="0.9"
                    style={{
                      filter: `drop-shadow(0 0 4px ${color})`,
                    }}
                  >
                    {t.label}
                  </text>
                )}
              </g>
            );
          })}

          {WORKFLOW_STATES.map(state => {
            const count = stats[state.id as keyof LeadStats] ?? 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const isSelected = selected === state.id;
            const isHovered = hovered === state.id;
            const isActive = activeState ? activeIds.has(state.id) || activeState === state.id : true;
            const isFocused = isSelected || isHovered;

            return (
              <g
                key={state.id}
                style={{
                  cursor: 'pointer',
                  opacity: activeState && !isActive ? 0.25 : 1,
                  transition: 'opacity 0.2s',
                }}
                onClick={() => setSelected(selected === state.id ? null : state.id)}
                onMouseEnter={() => setHovered(state.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <ellipse
                  cx={state.x + NODE_W / 2}
                  cy={state.y + NODE_H / 2}
                  rx={NODE_W * 0.6}
                  ry={NODE_H * 0.6}
                  fill={`url(#glow-${state.id})`}
                  opacity={isFocused ? 1 : 0}
                  style={{ transition: 'opacity 0.3s' }}
                />

                <rect
                  x={state.x}
                  y={state.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={14}
                  fill="#161b22"
                  stroke={isFocused ? state.accent : 'rgba(255,255,255,0.07)'}
                  strokeWidth={isFocused ? 1.5 : 1}
                  style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
                />

                {isFocused && (
                  <rect
                    x={state.x + 1}
                    y={state.y + 1}
                    width={NODE_W - 2}
                    height={NODE_H - 2}
                    rx={13}
                    fill="none"
                    stroke={state.accent}
                    strokeWidth={0.5}
                    opacity={0.4}
                  />
                )}

                <rect
                  x={state.x}
                  y={state.y}
                  width={4}
                  height={NODE_H}
                  rx={2}
                  fill={state.accent}
                  opacity={isFocused ? 1 : 0.5}
                  style={{ transition: 'opacity 0.2s' }}
                />

                <rect
                  x={state.x + NODE_W - 52}
                  y={state.y + 16}
                  width={38}
                  height={22}
                  rx={6}
                  fill={state.accent}
                  opacity={0.15}
                />
                <text
                  x={state.x + NODE_W - 33}
                  y={state.y + 31}
                  textAnchor="middle"
                  fill={state.accent}
                  fontSize="13"
                  fontWeight="700"
                  fontFamily="DM Sans, system-ui"
                >
                  {count}
                </text>

                <text
                  x={state.x + 18}
                  y={state.y + 34}
                  fill="rgba(255,255,255,0.88)"
                  fontSize="13"
                  fontWeight="600"
                  fontFamily="DM Sans, system-ui"
                >
                  {state.label}
                </text>
                <text
                  x={state.x + 18}
                  y={state.y + 52}
                  fill="rgba(255,255,255,0.35)"
                  fontSize="10.5"
                  fontFamily="DM Sans, system-ui"
                >
                  {state.description}
                </text>

                <rect
                  x={state.x + 18}
                  y={state.y + 62}
                  width={NODE_W - 72}
                  height={3}
                  rx={2}
                  fill="rgba(255,255,255,0.06)"
                />
                <rect
                  x={state.x + 18}
                  y={state.y + 62}
                  width={Math.max(0, (NODE_W - 72) * pct / 100)}
                  height={3}
                  rx={2}
                  fill={state.accent}
                  opacity={0.7}
                  style={{ transition: 'width 0.5s ease' }}
                />
                <text
                  x={state.x + NODE_W - 56}
                  y={state.y + 65}
                  fill="rgba(255,255,255,0.25)"
                  fontSize="9"
                  fontFamily="DM Sans, system-ui"
                >
                  {pct.toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>
        </div>
      </div>

      {selected && (() => {
        const state = getStateById(selected);
        const count = stats[state.id as keyof LeadStats] ?? 0;
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
        const fromTs = TRANSITIONS.filter(t => t.from === selected);
        const toTs = TRANSITIONS.filter(t => t.to === selected);

        return (
          <div
            className="mx-4 mb-4 rounded-xl border p-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: `${state.accent}33`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: state.accent, boxShadow: `0 0 6px ${state.accent}` }}
                />
                <span className="text-sm font-semibold" style={{ color: state.accent }}>
                  {state.label}
                </span>
              </div>
              <span className="text-xs text-white/30">
                {count} leads · {pct}% del total
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-white/25 uppercase mb-2">Salidas</p>
                <div className="space-y-1.5">
                  {fromTs.length === 0 ? (
                    <p className="text-xs text-white/20 italic">Estado final</p>
                  ) : fromTs.map((t, i) => {
                    const target = getStateById(t.to);
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: TRANSITION_COLORS[t.type] }}
                        />
                        <span>{t.label}</span>
                        <span className="text-white/20">→</span>
                        <span style={{ color: target.accent }}>{target.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-white/25 uppercase mb-2">Entradas</p>
                <div className="space-y-1.5">
                  {toTs.length === 0 ? (
                    <p className="text-xs text-white/20 italic">Estado inicial</p>
                  ) : toTs.map((t, i) => {
                    const origin = getStateById(t.from);
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: origin.accent }}
                        />
                        <span style={{ color: origin.accent }}>{origin.label}</span>
                        <span className="text-white/20">→</span>
                        <span>{t.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="px-6 pb-5 flex gap-4 flex-wrap border-t border-white/[0.05] pt-4">
        {WORKFLOW_STATES.map(state => {
          const count = stats[state.id as keyof LeadStats] ?? 0;
          const isSelected = selected === state.id;
          return (
            <button
              key={state.id}
              onClick={() => setSelected(isSelected ? null : state.id)}
              className="flex items-center gap-2 text-xs rounded-lg px-3 py-1.5 transition-all"
              style={{
                background: isSelected ? `${state.accent}18` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isSelected ? state.accent + '60' : 'rgba(255,255,255,0.08)'}`,
                color: isSelected ? state.accent : 'rgba(255,255,255,0.4)',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: state.accent, opacity: isSelected ? 1 : 0.5 }}
              />
              {state.label}
              <span style={{ color: isSelected ? state.accent : 'rgba(255,255,255,0.2)' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}