'use client'

/**
 * Landing-page motion primitives + the shoot→live workflow graph.
 * Built on framer-motion. All animations respect prefers-reduced-motion.
 */
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const EASE = [0.16, 0.7, 0.3, 1] as const

// ── AnimatedHeading ──────────────────────────────────────────────────────────
// Attio-style word reveal: each word rises + fades + clears from blur, staggered.
// `segments` lets a heading mix colours and line breaks (e.g. a two-tone hero).
type Segment = { text: string; color?: string; breakAfter?: boolean }

const MOTION_TAG = {
  h1: motion.h1, h2: motion.h2, h3: motion.h3, p: motion.p, div: motion.div,
} as const

export function AnimatedHeading({
  segments, as = 'h2', immediate = false, style, className,
}: {
  segments: Segment[]
  as?: keyof typeof MOTION_TAG
  immediate?: boolean       // true for above-the-fold (animate on mount, not on scroll)
  style?: CSSProperties
  className?: string
}) {
  const reduce = useReducedMotion()
  const Tag = MOTION_TAG[as]

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.095, delayChildren: immediate ? 0.15 : 0.05 } },
  }
  const word: Variants = reduce
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: '0.42em', filter: 'blur(6px)' },
        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.15, ease: [0.22, 1, 0.36, 1] } },
      }

  return (
    <Tag
      className={className}
      style={style}
      variants={container}
      initial="hidden"
      {...(immediate
        ? { animate: 'visible' }
        : { whileInView: 'visible', viewport: { once: true, margin: '-12% 0px' } })}
    >
      {segments.map((seg, si) => {
        const words = seg.text.split(' ')
        return (
          <span key={si}>
            {words.map((w, wi) => (
              <motion.span
                key={`${si}-${wi}`}
                variants={word}
                style={{ display: 'inline-block', whiteSpace: 'pre', color: seg.color, willChange: 'transform, filter' }}
              >
                {w}{wi < words.length - 1 ? ' ' : ''}
              </motion.span>
            ))}
            {seg.breakAfter && <br />}
          </span>
        )
      })}
    </Tag>
  )
}

// ── Reveal ───────────────────────────────────────────────────────────────────
// Fade + rise (optionally scale) as the block scrolls into view, once.
export function Reveal({
  children, delay = 0, y = 26, scale, style, className, immediate = false,
}: {
  children: ReactNode
  delay?: number
  y?: number
  scale?: number            // e.g. 0.985 for a subtle settle
  style?: CSSProperties
  className?: string
  immediate?: boolean
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className} style={style}>{children}</div>

  const hidden = { opacity: 0, y, ...(scale ? { scale } : {}) }
  const shown = { opacity: 1, y: 0, ...(scale ? { scale: 1 } : {}) }

  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      variants={{ hidden, visible: shown }}
      {...(immediate ? { animate: 'visible' } : { whileInView: 'visible', viewport: { once: true, margin: '-10% 0px' } })}
      transition={{ duration: 0.85, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

// ── ScrollTilt ───────────────────────────────────────────────────────────────
// Presents children on a 3D plane that hinges open as it scrolls into view:
// tilted back at the bottom of the viewport, straightening (and lifting/scaling
// in) as it reaches the centre — like a laptop screen opening.
export function ScrollTilt({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  // Starts turned sideways (yaw) and facing up (pitch), sliding in from the
  // side, then swivels to a flat, head-on view as it reaches the centre.
  const rotateX = useTransform(scrollYProgress, [0, 1], [26, 0])   // facing up → flat
  const rotateY = useTransform(scrollYProgress, [0, 1], [-22, 0])  // sideways → head-on
  const rotateZ = useTransform(scrollYProgress, [0, 1], [-4, 0])
  const x = useTransform(scrollYProgress, [0, 1], [-60, 0])
  const y = useTransform(scrollYProgress, [0, 1], [70, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.85, 1])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.25, 1])

  // Block centering (not flex) — a flex item can shrink below its width:100%
  // to its content's min-width, which collapsed the mockup. The card centres
  // itself via `margin: 0 auto`.
  if (reduce) return <div style={style}>{children}</div>

  return (
    <div ref={ref} style={{ perspective: '1500px', position: 'relative' }}>
      <motion.div
        style={{
          rotateX, rotateY, rotateZ, x, y, scale, opacity,
          transformOrigin: 'center 75%',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          ...style,
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

// ── RevealItem ───────────────────────────────────────────────────────────────
// A single motion.div (no extra wrapper) — drop-in for a grid/flex child so it
// keeps divider/scroll-snap semantics while still fading + rising into view.
// Pass `delay={i * 0.08}` across a mapped list for a stagger.
export function RevealItem({
  children, delay = 0, y = 22, style, className, onClick,
}: {
  children: ReactNode
  delay?: number
  y?: number
  style?: CSSProperties
  className?: string
  onClick?: () => void
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className} style={style} onClick={onClick}>{children}</div>
  return (
    <motion.div
      className={className}
      style={style}
      onClick={onClick}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.75, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

// ── WorkflowGraph ────────────────────────────────────────────────────────────
// The shoot → live-listing pipeline: nodes reveal one after another, green
// connectors draw themselves, status pills pop, then it fans out to channels.

type Node = {
  icon: ReactNode
  tint: string            // icon-tile background tint
  title: string
  sub: string
  status: string
}

const NODES: Node[] = [
  {
    tint: 'rgba(0,113,227,0.10)',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="1.8" width="18" height="18"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>,
    title: 'Shoot folder uploaded',
    sub: 'AW26 shoot · 100 SKU sub-folders',
    status: 'Uploaded',
  },
  {
    tint: 'rgba(175,82,222,0.10)',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#af52de" strokeWidth="1.8" width="18" height="18"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    title: 'Auto-clustered by SKU',
    sub: 'One folder → one product',
    status: 'Grouped',
  },
  {
    tint: 'rgba(255,159,10,0.12)',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#ff9f0a" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>,
    title: 'Angles & colours labelled',
    sub: 'Front · back · side · detail',
    status: 'Detected',
  },
  {
    tint: 'rgba(94,50,245,0.12)',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#5e32f5" strokeWidth="1.8" width="18" height="18"><path d="M12 3l2.1 5.4L19.5 10l-5.4 2.1L12 17.5 9.9 12.1 4.5 10l5.4-1.6L12 3z"/></svg>,
    title: 'AI product copy written',
    sub: 'Title · description · bullets — your voice',
    status: 'Written',
  },
  {
    tint: 'rgba(48,209,88,0.12)',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#1a8a35" strokeWidth="1.8" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
    title: 'Formatted for every channel',
    sub: 'Exact specs · renamed · per-marketplace',
    status: 'Ready',
  },
]

const CHANNELS = ['Shopify', 'Cin7', 'Marketplaces']
const GREEN = '#30d158'

function Connector() {
  return (
    <motion.svg
      width="24" height="40" viewBox="0 0 24 40" fill="none"
      style={{ display: 'block', margin: '0 auto' }}
      variants={{ hidden: {}, visible: {} }}
    >
      <motion.path
        d="M12 1 V 39"
        stroke={GREEN} strokeWidth="2.2" strokeLinecap="round"
        variants={{ hidden: { pathLength: 0, opacity: 0.3 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 0.6, ease: 'easeInOut' } } }}
      />
    </motion.svg>
  )
}

function NodeCard({ node }: { node: Node }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16, scale: 0.97 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.62, ease: EASE } },
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '16px',
        padding: '16px 18px', boxShadow: '0 12px 30px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03)',
        position: 'relative',
      }}
    >
      <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: node.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {node.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '-.2px', color: '#1d1d1f', lineHeight: 1.25 }}>{node.title}</div>
        <div style={{ fontSize: '13px', color: '#8e8e93', letterSpacing: '-.1px', marginTop: '2px' }}>{node.sub}</div>
      </div>
      <motion.span
        variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, delay: 0.34, ease: EASE } } }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0, background: 'rgba(48,209,88,0.12)', color: '#1a8a35', fontSize: '12px', fontWeight: 600, letterSpacing: '-.1px', padding: '4px 9px', borderRadius: '999px' }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#1a8a35" strokeWidth="3" width="9" height="9"><polyline points="20 6 9 17 4 12"/></svg>
        {node.status}
      </motion.span>
    </motion.div>
  )
}

const PATH_DRAW: Variants = {
  hidden: { pathLength: 0, opacity: 0.3 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 0.55, ease: 'easeInOut' } },
}

// ── Mobile: vertical stack ───────────────────────────────────────────────────
function WorkflowVertical() {
  const reduce = useReducedMotion()
  const container: Variants = { hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : 0.5, delayChildren: 0.12 } } }
  const fadeUp: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  }
  return (
    <motion.div
      variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }}
      style={{ maxWidth: '460px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
    >
      {NODES.map((node, i) => (
        <div key={node.title}>
          {i > 0 && <Connector />}
          <NodeCard node={node} />
        </div>
      ))}
      <motion.svg width="100%" height="48" viewBox="0 0 460 48" fill="none" preserveAspectRatio="none" style={{ display: 'block', marginTop: '2px' }}>
        {[80, 230, 380].map((x, i) => (
          <motion.path key={i} d={`M230 2 C 230 26, ${x} 22, ${x} 46`} stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" variants={PATH_DRAW} />
        ))}
      </motion.svg>
      <motion.div variants={fadeUp} style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
        {CHANNELS.map((c) => (
          <div key={c} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#fff', border: `1px solid ${GREEN}`, borderRadius: '12px', padding: '12px 8px', boxShadow: '0 8px 20px rgba(48,209,88,0.10)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
            <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '-.2px', color: '#1d1d1f', whiteSpace: 'nowrap' }}>{c}</span>
          </div>
        ))}
      </motion.div>
      <motion.p variants={fadeUp} style={{ fontSize: '14px', color: '#8e8e93', letterSpacing: '-.1px', textAlign: 'center', marginTop: '18px' }}>
        One shoot in. Live listings everywhere — in ~25 minutes.
      </motion.p>
    </motion.div>
  )
}

// ── Desktop: horizontal wave with a glowing orb flowing through ───────────────
// Rendered on a fixed-size stage (no aspect distortion) that scales to fit.
const STAGE_W = 1140
const STAGE_H = 470

function WaveNode({ node, x, y }: { node: Node; x: number; y: number }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } } }}
      style={{
        position: 'absolute', left: x, top: y, width: 190, marginLeft: -95, marginTop: -48,
        background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '14px 16px',
        boxShadow: '0 16px 38px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: node.tint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{node.icon}</div>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(48,209,88,0.12)', color: '#1a8a35', fontSize: 10.5, fontWeight: 600, padding: '3px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#1a8a35" strokeWidth="3" width="8" height="8"><polyline points="20 6 9 17 4 12"/></svg>
          {node.status}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.2px', color: '#1d1d1f', lineHeight: 1.25 }}>{node.title}</div>
      <div style={{ fontSize: 11, color: '#8e8e93', marginTop: 3, lineHeight: 1.3 }}>{node.sub}</div>
    </motion.div>
  )
}

function WorkflowWave() {
  const reduce = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / STAGE_W))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Node centres (px in the stage), alternating high/low for the wave.
  const nodes = NODES.map((n, i) => ({ n, x: 95 + i * 210, y: i % 2 === 0 ? 290 : 148 }))
  const HALF = 95, R = 16
  const conns = nodes.slice(1).map((to, idx) => {
    const from = nodes[idx]
    const x1 = from.x + HALF, x2 = to.x - HALF, mx = (x1 + x2) / 2
    const dn = to.y > from.y ? 1 : -1
    return `M ${x1} ${from.y} H ${mx - R} Q ${mx} ${from.y} ${mx} ${from.y + dn * R} V ${to.y - dn * R} Q ${mx} ${to.y} ${mx + R} ${to.y} H ${x2}`
  })
  const last = nodes[nodes.length - 1]
  const chX = [600, 770, 940]
  const chY = 432, busY = 384, trunkTop = last.y + 48, chTop = chY - 22
  const fan = chX.map((cx) => {
    const dir = cx >= last.x ? 1 : -1
    return `M ${last.x} ${trunkTop} V ${busY - R} Q ${last.x} ${busY} ${last.x + dir * R} ${busY} H ${cx - dir * R} Q ${cx} ${busY} ${cx} ${busY + R} V ${chTop}`
  })
  const allPaths = [...conns, ...fan]

  const container: Variants = { hidden: {}, visible: { transition: { staggerChildren: reduce ? 0 : 0.42, delayChildren: 0.15 } } }
  const fadeUp: Variants = { hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <div style={{ position: 'relative', width: '100%', height: STAGE_H * scale }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', width: STAGE_W, height: STAGE_H, transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center' }}>

          {/* Solid connectors + glowing orbs flowing through them */}
          <motion.svg
            width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-15% 0px' }} transition={{ duration: 0.6 }}
            style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            <defs>
              <radialGradient id="wfOrb"><stop offset="0%" stopColor="#d6ffe4" /><stop offset="40%" stopColor="#30d158" /><stop offset="100%" stopColor="#30d158" stopOpacity="0" /></radialGradient>
              <filter id="wfGlow" x="-250%" y="-250%" width="600%" height="600%"><feGaussianBlur stdDeviation="4" /></filter>
            </defs>
            {allPaths.map((d, i) => (
              <path key={`p${i}`} id={`wfp-${i}`} d={d} fill="none" stroke={GREEN} strokeOpacity={0.4} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {!reduce && allPaths.map((d, i) => (
              <g key={`o${i}`} opacity={0}>
                <circle r={10} fill="#30d158" opacity={0.3} filter="url(#wfGlow)" />
                <circle r={5} fill="url(#wfOrb)" />
                <circle r={2} fill="#eafff0" />
                <animateMotion dur="2.4s" begin={`${i * 0.3}s`} repeatCount="indefinite" calcMode="linear" keyPoints="0;1" keyTimes="0;1">
                  <mpath href={`#wfp-${i}`} />
                </animateMotion>
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.82;1" dur="2.4s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
              </g>
            ))}
          </motion.svg>

          {/* Nodes + channels reveal in sequence */}
          <motion.div
            variants={container} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-15% 0px' }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {nodes.map((nd) => <WaveNode key={nd.n.title} node={nd.n} x={nd.x} y={nd.y} />)}

            <motion.div variants={fadeUp} style={{ position: 'absolute', inset: 0 }}>
              {chX.map((cx, i) => (
                <div key={CHANNELS[i]} style={{ position: 'absolute', left: cx, top: chY, transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: `1px solid ${GREEN}`, borderRadius: 12, padding: '11px 18px', boxShadow: '0 10px 24px rgba(48,209,88,0.12)', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.2px', color: '#1d1d1f' }}>{CHANNELS[i]}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}
        style={{ fontSize: '14px', color: '#8e8e93', letterSpacing: '-.1px', textAlign: 'center', marginTop: '8px' }}
      >
        One shoot in. Live listings everywhere — in ~25 minutes.
      </motion.p>
    </div>
  )
}

export function WorkflowGraph() {
  return (
    <>
      <style>{`
        .wf-desktop { display: none; }
        .wf-mobile { display: block; }
        @media (min-width: 900px) {
          .wf-desktop { display: block; }
          .wf-mobile { display: none; }
        }
      `}</style>
      <div className="wf-mobile"><WorkflowVertical /></div>
      <div className="wf-desktop"><WorkflowWave /></div>
    </>
  )
}
