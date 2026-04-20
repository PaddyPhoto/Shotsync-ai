// scenes.jsx — ShotSync tutorial: scrolling landing intro + 9 in-app scenes + outro
// Pacing: landing ~58s, in-app scenes halved, zoom-out→dashboard transition, speech bubbles.

const STAGE_W = 1920;
const STAGE_H = 1080;

const ssStyles = {
  ink: '#0d0d0e',
  paper: '#fafaf9',
  accent: '#e8d97a',
  accentDim: 'rgba(232,217,122,0.18)',
  green: '#4ade80',
  font: 'Inter, system-ui, -apple-system, sans-serif',
  mono: 'JetBrains Mono, ui-monospace, monospace',
};

function TimestampLabel() {
  const t = useTime();
  const sec = Math.floor(t);
  React.useEffect(() => {
    const root = document.querySelector('[data-video-root]');
    if (root) root.setAttribute('data-screen-label', `t=${sec}s`);
  }, [sec]);
  return null;
}

// ─── Speech bubble ───────────────────────────────────────────────────
// Positions itself at (x,y) with a tail pointing at (tailX, tailY).
// side = 'left' | 'right' | 'top' | 'bottom' — where the bubble sits relative to target
function SpeechBubble({ targetX, targetY, side = 'top', width = 460, text, title }) {
  const { localTime, duration } = useSprite();
  let opacity = 1, scale = 1;
  if (localTime < 0.35) {
    const t = Easing.easeOutBack(clamp(localTime / 0.35, 0, 1));
    opacity = clamp(localTime / 0.25, 0, 1);
    scale = 0.8 + 0.2 * t;
  }
  const exitStart = duration - 0.3;
  if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / 0.3, 0, 1));
    opacity = 1 - t; scale = 1 - t * 0.08;
  }

  // Compute bubble origin (top-left) based on side
  const GAP = 28;
  const ESTIMATED_H = 120;
  let bx, by, originX, originY, tailPath;
  if (side === 'top') {
    bx = targetX - width / 2; by = targetY - ESTIMATED_H - GAP;
    originX = '50%'; originY = '100%';
    tailPath = `M ${width / 2 - 12} 100% L ${width / 2} calc(100% + 14px) L ${width / 2 + 12} 100% Z`;
  } else if (side === 'bottom') {
    bx = targetX - width / 2; by = targetY + GAP;
    originX = '50%'; originY = '0%';
  } else if (side === 'left') {
    bx = targetX - width - GAP; by = targetY - ESTIMATED_H / 2;
    originX = '100%'; originY = '50%';
  } else {
    bx = targetX + GAP; by = targetY - ESTIMATED_H / 2;
    originX = '0%'; originY = '50%';
  }

  // Clamp into viewport
  bx = clamp(bx, 24, STAGE_W - width - 24);
  by = clamp(by, 24, STAGE_H - ESTIMATED_H - 24);

  return (
    <div style={{
      position: 'absolute', left: bx, top: by, width,
      opacity, transform: `scale(${scale})`,
      transformOrigin: `${originX} ${originY}`,
      zIndex: 85, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'relative',
        background: 'rgba(15,15,15,0.96)',
        backdropFilter: 'blur(12px)',
        borderRadius: 16,
        padding: '18px 22px',
        fontFamily: ssStyles.font,
        color: '#f0f0f0',
        boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.3)',
        border: `1.5px solid ${ssStyles.accent}`,
      }}>
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 8,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: 4, background: ssStyles.accent,
            }}/>
            <div style={{
              fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
              fontWeight: 700, color: ssStyles.accent, fontFamily: ssStyles.mono,
            }}>{title}</div>
          </div>
        )}
        <div style={{
          fontSize: 20, lineHeight: 1.4, fontWeight: 500,
          letterSpacing: '-0.005em', color: '#f0f0f0',
        }}>{text}</div>
        {/* Tail */}
        {side === 'top' && (
          <div style={{
            position: 'absolute', left: `calc(${((targetX - bx) / width) * 100}% - 10px)`,
            bottom: -11, width: 0, height: 0,
            borderLeft: '11px solid transparent',
            borderRight: '11px solid transparent',
            borderTop: `12px solid ${ssStyles.accent}`,
          }}>
            <div style={{
              position: 'absolute', left: -10, top: -12, width: 0, height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderTop: '11px solid #0f0f0f',
            }}/>
          </div>
        )}
        {side === 'bottom' && (
          <div style={{
            position: 'absolute', left: `calc(${((targetX - bx) / width) * 100}% - 10px)`,
            top: -12, width: 0, height: 0,
            borderLeft: '11px solid transparent',
            borderRight: '11px solid transparent',
            borderBottom: `12px solid ${ssStyles.accent}`,
          }}>
            <div style={{
              position: 'absolute', left: -10, top: 1, width: 0, height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '10px solid transparent',
              borderBottom: '11px solid #0f0f0f',
            }}/>
          </div>
        )}
        {side === 'left' && (
          <div style={{
            position: 'absolute', right: -12, top: `calc(${((targetY - by) / ESTIMATED_H) * 100}% - 10px)`,
            width: 0, height: 0,
            borderTop: '11px solid transparent',
            borderBottom: '11px solid transparent',
            borderLeft: `12px solid ${ssStyles.accent}`,
          }}/>
        )}
        {side === 'right' && (
          <div style={{
            position: 'absolute', left: -12, top: `calc(${((targetY - by) / ESTIMATED_H) * 100}% - 10px)`,
            width: 0, height: 0,
            borderTop: '11px solid transparent',
            borderBottom: '11px solid transparent',
            borderRight: `12px solid ${ssStyles.accent}`,
          }}/>
        )}
      </div>
    </div>
  );
}

// ─── Highlight ring ──────────────────────────────────────────────────
function Highlight({ x, y, w, h, color = ssStyles.accent }) {
  const { localTime } = useSprite();
  const pulse = 0.6 + 0.4 * Math.sin(localTime * 3);
  let opacity = 1;
  if (localTime < 0.25) opacity = Easing.easeOutCubic(localTime / 0.25);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h,
      border: `3px solid ${color}`, borderRadius: 16,
      opacity: opacity * (0.55 + 0.35 * pulse),
      pointerEvents: 'none', zIndex: 60,
    }}/>
  );
}

// ─── Cursor ──────────────────────────────────────────────────────────
function CursorAt({ x, y, clickAt = null }) {
  const { localTime } = useSprite();
  let pulseScale = 0, pulseOpacity = 0;
  if (clickAt != null) {
    const dt = localTime - clickAt;
    if (dt >= 0 && dt < 0.5) {
      pulseScale = 0.4 + (dt / 0.5) * 1.8;
      pulseOpacity = 1 - (dt / 0.5);
    }
  }
  let cursorScale = 1;
  if (clickAt != null && localTime > clickAt - 0.04 && localTime < clickAt + 0.12) cursorScale = 0.82;
  let opacity = 1;
  if (localTime < 0.2) opacity = localTime / 0.2;
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 95, opacity }}>
      {pulseOpacity > 0 && (
        <div style={{
          position: 'absolute', left: -22, top: -22,
          width: 44, height: 44, borderRadius: 22,
          border: `2.5px solid ${ssStyles.accent}`,
          opacity: pulseOpacity, transform: `scale(${pulseScale})`,
        }}/>
      )}
      <svg width="28" height="32" viewBox="0 0 26 30" style={{
        transform: `scale(${cursorScale})`, transformOrigin: '4px 4px',
        filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))',
      }}>
        <path d="M4 3 L4 23 L10 18 L14 27 L17 26 L13 17 L21 17 Z"
              fill="#fff" stroke="#0d0d0e" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ─── Section chip ────────────────────────────────────────────────────
function SectionChip({ label, num }) {
  const { localTime, duration } = useSprite();
  let opacity = 1, tx = 0;
  if (localTime < 0.3) {
    const t = Easing.easeOutCubic(clamp(localTime / 0.3, 0, 1));
    opacity = t; tx = (1 - t) * -16;
  }
  const exitStart = duration - 0.3;
  if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / 0.3, 0, 1));
    opacity = 1 - t;
  }
  return (
    <div style={{
      position: 'absolute', top: 36, left: 36,
      opacity, transform: `translateX(${tx}px)`,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px 10px 10px',
      background: 'rgba(13,13,14,0.85)',
      backdropFilter: 'blur(8px)',
      borderRadius: 999,
      fontFamily: ssStyles.font,
      color: '#fafaf9', fontSize: 16, fontWeight: 500,
      letterSpacing: '-0.005em',
      zIndex: 70,
      boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14, background: ssStyles.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, fontFamily: ssStyles.mono,
      }}>{num}</div>
      {label}
    </div>
  );
}

// ─── Wipe ────────────────────────────────────────────────────────────
function SceneWipe({ at, duration = 0.45 }) {
  const t = useTime();
  const dt = t - at;
  if (dt < 0 || dt > duration) return null;
  const p = dt / duration;
  let cover;
  if (p < 0.5) cover = Easing.easeInCubic(p * 2);
  else cover = 1 - Easing.easeOutCubic((p - 0.5) * 2);
  return (
    <div style={{
      position: 'absolute', inset: 0, background: '#0a0a0a',
      clipPath: `inset(0 ${(1 - cover) * 100}% 0 0)`,
      zIndex: 200, pointerEvents: 'none',
    }}/>
  );
}

// ─── Logo ────────────────────────────────────────────────────────────
function ShotSyncMark({ size = 56 }) {
  const r = size * 0.22;
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      position: 'relative', overflow: 'hidden', flexShrink: 0,
      boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    }}>
      {/* Gradient background matching real logo */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(145deg, #5b3fd4 0%, #3a80d2 22%, #22b09a 42%, #3ab870 56%, #d94f4f 76%, #f0952a 100%)',
      }}/>
      {/* Video camera icon — white outlined rect + solid left-pointing triangle */}
      <svg viewBox="0 0 100 100" width="100%" height="100%"
           style={{ position: 'absolute', inset: 0 }}>
        {/* Camera body — outlined rounded rectangle */}
        <rect x="9" y="30" width="54" height="42" rx="10" ry="10"
              fill="none" stroke="white" strokeWidth="8" strokeLinejoin="round"/>
        {/* Viewfinder — solid left-pointing triangle */}
        <path d="M67 37 L91 24 L91 76 L67 63 Z" fill="white"/>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// INTRO
// ═══════════════════════════════════════════════════════════════════════
function SceneIntro() {
  const { localTime, duration } = useSprite();
  const reveal = Easing.easeOutCubic(clamp(localTime / 1.0, 0, 1));
  const subReveal = Easing.easeOutCubic(clamp((localTime - 0.5) / 1.0, 0, 1));
  let exitOp = 1;
  if (localTime > duration - 0.5) exitOp = 1 - Easing.easeInCubic((localTime - (duration - 0.5)) / 0.5);
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at 40% 50%, rgba(232,217,122,0.06) 0%, #080808 60%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: ssStyles.font, opacity: exitOp,
    }}>
      <div style={{
        opacity: reveal, transform: `translateY(${(1 - reveal) * 20}px)`, marginBottom: 40,
      }}><ShotSyncMark size={96}/></div>
      <div style={{
        fontSize: 110, fontWeight: 700, letterSpacing: '-0.04em',
        color: '#f0f0f0', textAlign: 'center', lineHeight: 1.0,
        opacity: reveal, transform: `translateY(${(1 - reveal) * 30}px)`,
        marginBottom: 32,
      }}>Welcome to <span style={{color:'#e8d97a'}}>ShotSync</span></div>
      <div style={{
        fontSize: 32, color: '#888', letterSpacing: '-0.01em',
        opacity: subReveal, transform: `translateY(${(1 - subReveal) * 20}px)`,
        marginBottom: 60, maxWidth: 1200, textAlign: 'center', lineHeight: 1.4,
      }}>From raw shoot files to marketplace-ready packages — automatically.</div>
      <div style={{
        fontSize: 18, color: '#555', opacity: subReveal,
        fontFamily: ssStyles.mono, letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>A guided walkthrough</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LANDING SCROLL — 4 shots: How it works · Features · AI copy · CTA
// Pricing slide removed. Keyframes tuned to actual screenshot content.
// ═══════════════════════════════════════════════════════════════════════
// shots/01 = How it works (Three steps)
// shots/02 = Features (4-card grid)
// shots/03 = AI copywriting
// shots/06 = Testimonial + CTA (Get started free)
const LANDING_IMGS = ['shots/01.jpg', 'shots/02.jpg', 'shots/03.jpg', 'shots/06.jpg'];

function LandingScroll() {
  const { localTime, duration } = useSprite();
  const SHOT_W = 1500, SHOT_H = 931;
  const IMG_SCALE = STAGE_W / SHOT_W;
  const IMG_H = SHOT_H * IMG_SCALE;
  const N_SHOTS = LANDING_IMGS.length;
  const TOTAL_H = N_SHOTS * IMG_H;

  const yToCenterShot = (idx, ny = 0.5) => STAGE_H / 2 - (idx * IMG_H + ny * IMG_H);
  const focusState = (idx, nx, ny, zoom) => ({
    y: STAGE_H / 2 - (idx * IMG_H + ny * IMG_H) * zoom,
    x: STAGE_W / 2 - nx * STAGE_W * zoom,
    scale: zoom,
  });
  const scrollState = (idx, ny = 0.5) => ({ y: yToCenterShot(idx, ny), x: 0, scale: 1 });

  const KF = [
    // ── Shot 0: shots/01.jpg — "How it works · Three steps" ──────────
    { t: 0,    ...scrollState(0, 0.45),             caption: 'Three steps. Zero manual work.', label: 'How it works', num: '01' },
    { t: 2,    ...focusState(0, 0.215, 0.585, 1.65),caption: '1. Upload your shoot — drop up to 1,000 images.', label: 'How it works', num: '01' },
    { t: 4.5,  ...focusState(0, 0.215, 0.585, 1.65),caption: '1. Upload your shoot — drop up to 1,000 images.', label: 'How it works', num: '01' },
    { t: 6,    ...focusState(0, 0.498, 0.585, 1.65),caption: '2. AI clusters every image by SKU — automatically.', label: 'How it works', num: '01' },
    { t: 8.5,  ...focusState(0, 0.498, 0.585, 1.65),caption: '2. AI clusters every image by SKU — automatically.', label: 'How it works', num: '01' },
    { t: 10,   ...focusState(0, 0.780, 0.585, 1.65),caption: '3. Download a marketplace-ready ZIP in seconds.', label: 'How it works', num: '01' },
    { t: 12.5, ...scrollState(0, 0.45),             caption: 'Three steps. Zero manual work.', label: 'How it works', num: '01' },

    // ── Shot 1: shots/02.jpg — Features (2×2 grid) ───────────────────
    { t: 13,   ...scrollState(1, 0.42),             caption: 'Four features doing all the heavy lifting.', label: 'Features', num: '02' },
    { t: 15,   ...focusState(1, 0.22, 0.27, 1.6),   caption: 'Auto-rename — every file, your naming convention.', label: 'Features', num: '02' },
    { t: 17.5, ...focusState(1, 0.72, 0.27, 1.6),   caption: 'AI clustering — grouped by product, automatically.', label: 'Features', num: '02' },
    { t: 20,   ...focusState(1, 0.22, 0.76, 1.6),   caption: 'Marketplace rules — THE ICONIC, Myer, David Jones specs built in.', label: 'Features', num: '02' },
    { t: 22.5, ...focusState(1, 0.72, 0.76, 1.6),   caption: 'CSV catalogue — your range list, mapped and matched.', label: 'Features', num: '02' },
    { t: 25,   ...scrollState(1, 0.42),             caption: 'Four features doing all the heavy lifting.', label: 'Features', num: '02' },

    // ── Shot 2: shots/03.jpg — AI copywriting ─────────────────────────
    { t: 26,   ...scrollState(2, 0.42),             caption: 'Product listings written by AI.', label: 'AI copywriting', num: '03' },
    { t: 28,   ...focusState(2, 0.248, 0.385, 1.65),caption: 'GPT-4o reads the hero image and writes the full listing.', label: 'AI copywriting', num: '03' },
    { t: 30.5, ...focusState(2, 0.680, 0.275, 1.65),caption: 'Title and description — SEO-ready for ANZ fashion.', label: 'AI copywriting', num: '03' },
    { t: 33,   ...focusState(2, 0.680, 0.660, 1.65),caption: 'Five bullet points — features, fit, fabric, care.', label: 'AI copywriting', num: '03' },
    { t: 35,   ...scrollState(2, 0.42),             caption: 'Product listings written by AI.', label: 'AI copywriting', num: '03' },

    // ── Shot 3: shots/06.jpg — Testimonial + CTA ──────────────────────
    { t: 36,   ...scrollState(3, 0.35),             caption: '"ShotSync has been a complete game changer." — Kat C.', label: 'Get started', num: '04' },
    { t: 38,   ...focusState(3, 0.500, 0.255, 1.55),caption: 'Real results from real fashion brands.', label: 'Get started', num: '04' },
    { t: 40.5, ...focusState(3, 0.500, 0.655, 1.50),caption: 'Shoot. Sync. Done.', label: 'Get started', num: '04' },
    { t: 42.5, ...focusState(3, 0.397, 0.813, 1.70),caption: 'Hit Get started free — no credit card required.', label: 'Get started', num: '04' },
    { t: 45,   ...focusState(3, 0.397, 0.813, 1.70),caption: 'Hit Get started free — no credit card required.', label: 'Get started', num: '04' },
  ];

  const t = clamp(localTime, 0, KF[KF.length - 1].t);
  let kfIdx = 0;
  for (let i = 0; i < KF.length - 1; i++) {
    if (t >= KF[i].t && t <= KF[i + 1].t) { kfIdx = i; break; }
    if (t > KF[KF.length - 1].t) kfIdx = KF.length - 2;
  }
  const k0 = KF[kfIdx], k1 = KF[kfIdx + 1] || KF[kfIdx];
  const span = k1.t - k0.t;
  const local = span > 0 ? (t - k0.t) / span : 0;
  const eased = Easing.easeInOutCubic(local);
  const px = k0.x + (k1.x - k0.x) * eased;
  const py = k0.y + (k1.y - k0.y) * eased;
  const ps = k0.scale + (k1.scale - k0.scale) * eased;

  const exitStart = duration - 1.2;
  let exitOp = 1, exitScale = 1;
  if (localTime > exitStart) {
    const e = Easing.easeInCubic(clamp((localTime - exitStart) / 1.2, 0, 1));
    exitOp = 1 - e * 0.85;
    exitScale = 1 - e * 0.25;
  }

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fafaf9', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: STAGE_W, height: TOTAL_H,
        transform: `translate(${px}px, ${py}px) scale(${ps * exitScale})`,
        transformOrigin: '0 0', willChange: 'transform',
        opacity: exitOp,
      }}>
        {LANDING_IMGS.map((src, i) => (
          <img key={i} src={src} alt=""
            style={{
              display: 'block', position: 'absolute',
              left: 0, top: i * IMG_H, width: STAGE_W, height: IMG_H,
              objectFit: 'cover',
            }}/>
        ))}
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.12) 100%)',
        pointerEvents: 'none',
        opacity: clamp((ps - 1.0) / 0.7, 0, 1) * 0.5,
      }}/>
      <ScrollIndicator scrollPx={-py} totalPx={TOTAL_H * ps - STAGE_H}/>
      {localTime < exitStart && <ChipFixed num={k0.num} label={k0.label}/>}
      {localTime < exitStart && <CaptionFixed text={k0.caption}/>}
    </div>
  );
}

function ScrollIndicator({ scrollPx, totalPx }) {
  const pct = clamp(scrollPx / Math.max(1, totalPx), 0, 1);
  const trackH = 240;
  return (
    <div style={{
      position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)',
      width: 4, height: trackH, background: 'rgba(13,13,14,0.08)',
      borderRadius: 2, zIndex: 70,
    }}>
      <div style={{
        position: 'absolute', left: 0, width: 4,
        top: pct * (trackH - 60), height: 60,
        background: ssStyles.accent, borderRadius: 2,
        transition: 'top 200ms linear',
      }}/>
    </div>
  );
}

function ChipFixed({ num, label }) {
  return (
    <div style={{
      position: 'absolute', top: 36, left: 36,
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px 10px 10px',
      background: 'rgba(13,13,14,0.85)', backdropFilter: 'blur(8px)',
      borderRadius: 999, fontFamily: ssStyles.font, color: '#fafaf9',
      fontSize: 16, fontWeight: 500, letterSpacing: '-0.005em',
      zIndex: 70, boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14, background: ssStyles.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, fontFamily: ssStyles.mono,
      }}>{num}</div>
      {label}
    </div>
  );
}

function CaptionFixed({ text }) {
  return (
    <div key={text} style={{
      position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      padding: '16px 30px', background: 'rgba(13,13,14,0.9)', color: '#fafaf9',
      fontFamily: ssStyles.font, fontSize: 26, fontWeight: 500, letterSpacing: '-0.01em',
      borderRadius: 14, textAlign: 'center', maxWidth: 1400, lineHeight: 1.35,
      backdropFilter: 'blur(10px)', boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      zIndex: 80, animation: 'captionIn 280ms ease-out',
    }}>{text}</div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// KEYFRAMED SHOT — drives camera via beats just like LandingScroll
// ═══════════════════════════════════════════════════════════════════════
// Image coord space: 1500 x 931. We draw it full-bleed at STAGE_W width.
const SHOT_IW = 1500, SHOT_IH = 931;
const ISCALE = STAGE_W / SHOT_IW;      // 1.28
const IDRAWN_H = SHOT_IH * ISCALE;     // 1192
const IOFFSET_Y = (STAGE_H - IDRAWN_H) / 2;  // -56 (image overflows top/bottom)

// Zoom into normalized image point (nx, ny) ∈ [0,1] at `scale`.
// Returns {x, y, scale} for the page transform (image origin 0,0).
function imgFocus(nx, ny, scale = 1) {
  // Image position at scale 1 has top-left at (0, IOFFSET_Y).
  // A point (nx, ny) in image is drawn at (nx * STAGE_W, IOFFSET_Y + ny * IDRAWN_H).
  // We want that point at viewport center (STAGE_W/2, STAGE_H/2) after scaling from (0,0).
  const px = nx * STAGE_W;
  const py = IOFFSET_Y + ny * IDRAWN_H;
  return {
    x: STAGE_W / 2 - px * scale,
    y: STAGE_H / 2 - py * scale,
    scale,
  };
}
const imgBase = () => imgFocus(0.5, 0.5, 1.0);

// KeyframedShot: renders a single screenshot and drives camera via beat array.
// beats: [{t, nx, ny, scale, bubble?: {title, text, side}, highlight?: {x,y,w,h}, cursor?: {x,y,clickAt}}]
// Each beat holds its state from its `t` until the next beat's `t`; the camera eases between.
// bubble/highlight/cursor render when the current beat (k0) includes them.
function KeyframedShot({ src, beats, enter = 0.4, exit = 0.4 }) {
  const { localTime, duration } = useSprite();
  const t = clamp(localTime, 0, beats[beats.length - 1].t);

  let kfIdx = 0;
  for (let i = 0; i < beats.length - 1; i++) {
    if (t >= beats[i].t && t <= beats[i + 1].t) { kfIdx = i; break; }
    if (t > beats[beats.length - 1].t) kfIdx = beats.length - 2;
  }
  const k0 = beats[kfIdx], k1 = beats[kfIdx + 1] || beats[kfIdx];
  const span = k1.t - k0.t;
  const local = span > 0 ? (t - k0.t) / span : 0;
  const eased = Easing.easeInOutCubic(local);

  const cam0 = imgFocus(k0.nx ?? 0.5, k0.ny ?? 0.5, k0.scale ?? 1);
  const cam1 = imgFocus(k1.nx ?? 0.5, k1.ny ?? 0.5, k1.scale ?? 1);
  const cx = cam0.x + (cam1.x - cam0.x) * eased;
  const cy = cam0.y + (cam1.y - cam0.y) * eased;
  const cs = cam0.scale + (cam1.scale - cam0.scale) * eased;

  let opacity = 1;
  if (localTime < enter) opacity = Easing.easeOutCubic(localTime / enter);
  const exitStart = duration - exit;
  if (localTime > exitStart) opacity = 1 - Easing.easeInCubic((localTime - exitStart) / exit);

  // Active beat's overlays: only show after arriving at the beat, so the bubble
  // fades in when the camera is mostly there (eased >= 0.7 of its travel).
  const showOverlays = kfIdx < beats.length - 1 ? eased > 0.5 : true;
  const overlayKey = `b-${kfIdx}`;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0a0a0a', overflow: 'hidden', opacity }}>
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: STAGE_W, height: STAGE_H,
        transform: `translate(${cx}px, ${cy}px) scale(${cs})`,
        transformOrigin: '0 0', willChange: 'transform',
      }}>
        <img src={src} alt=""
          style={{
            position: 'absolute', left: 0, top: IOFFSET_Y,
            width: STAGE_W, height: IDRAWN_H,
            objectFit: 'cover',
          }}/>
      </div>
      {showOverlays && k0.highlight && (
        <div key={overlayKey + '-hl'} style={{ position: 'absolute', inset: 0 }}>
          <Highlight x={k0.highlight.x} y={k0.highlight.y} w={k0.highlight.w} h={k0.highlight.h}/>
        </div>
      )}
      {showOverlays && k0.cursor && (
        <div key={overlayKey + '-c'} style={{ position: 'absolute', inset: 0 }}>
          <CursorAtStatic x={k0.cursor.x} y={k0.cursor.y} clickAt={k0.cursor.clickAt}/>
        </div>
      )}
      {showOverlays && k0.bubble && (
        <div key={overlayKey + '-b'} style={{ position: 'absolute', inset: 0 }}>
          <BubbleStatic
            targetX={k0.bubble.targetX ?? STAGE_W / 2}
            targetY={k0.bubble.targetY ?? STAGE_H / 2}
            side={k0.bubble.side ?? 'top'}
            width={k0.bubble.width ?? 460}
            title={k0.bubble.title}
            text={k0.bubble.text}
          />
        </div>
      )}
    </div>
  );
}

// Non-Sprite wrappers (they mount/unmount with overlayKey so their own anim fires)
function BubbleStatic(props) {
  const [mt, setMt] = React.useState(0);
  React.useEffect(() => {
    let raf, start = performance.now();
    const tick = () => { setMt((performance.now() - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const opacity = clamp(mt / 0.3, 0, 1);
  const scale = 0.88 + 0.12 * Easing.easeOutBack(clamp(mt / 0.4, 0, 1));
  return <BubbleRaw {...props} opacity={opacity} scale={scale}/>;
}
function CursorAtStatic({ x, y, clickAt }) {
  const [mt, setMt] = React.useState(0);
  React.useEffect(() => {
    let raf, start = performance.now();
    const tick = () => { setMt((performance.now() - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  let pulseScale = 0, pulseOpacity = 0;
  if (clickAt != null) {
    const dt = mt - clickAt;
    if (dt >= 0 && dt < 0.5) { pulseScale = 0.4 + (dt / 0.5) * 1.8; pulseOpacity = 1 - dt / 0.5; }
  }
  let cs = 1;
  if (clickAt != null && mt > clickAt - 0.04 && mt < clickAt + 0.12) cs = 0.82;
  const op = clamp(mt / 0.2, 0, 1);
  return (
    <div style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none', zIndex: 95, opacity: op }}>
      {pulseOpacity > 0 && (
        <div style={{
          position: 'absolute', left: -22, top: -22,
          width: 44, height: 44, borderRadius: 22,
          border: `2.5px solid ${ssStyles.accent}`,
          opacity: pulseOpacity, transform: `scale(${pulseScale})`,
        }}/>
      )}
      <svg width="28" height="32" viewBox="0 0 26 30" style={{
        transform: `scale(${cs})`, transformOrigin: '4px 4px',
        filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))',
      }}>
        <path d="M4 3 L4 23 L10 18 L14 27 L17 26 L13 17 L21 17 Z"
              fill="#fff" stroke="#0d0d0e" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// Raw speech bubble (no sprite) — used by BubbleStatic
function BubbleRaw({ targetX, targetY, side = 'top', width = 460, text, title, opacity = 1, scale = 1 }) {
  const GAP = 28;
  const ESTIMATED_H = 120;
  let bx, by, originX, originY;
  if (side === 'top')         { bx = targetX - width / 2; by = targetY - ESTIMATED_H - GAP; originX='50%'; originY='100%'; }
  else if (side === 'bottom') { bx = targetX - width / 2; by = targetY + GAP;              originX='50%'; originY='0%'; }
  else if (side === 'left')   { bx = targetX - width - GAP; by = targetY - ESTIMATED_H / 2; originX='100%'; originY='50%'; }
  else                        { bx = targetX + GAP;        by = targetY - ESTIMATED_H / 2;  originX='0%';   originY='50%'; }
  bx = clamp(bx, 24, STAGE_W - width - 24);
  by = clamp(by, 24, STAGE_H - ESTIMATED_H - 24);
  const tailOffsetX = ((targetX - bx) / width) * 100;
  const tailOffsetY = ((targetY - by) / ESTIMATED_H) * 100;
  return (
    <div style={{
      position: 'absolute', left: bx, top: by, width,
      opacity, transform: `scale(${scale})`,
      transformOrigin: `${originX} ${originY}`,
      zIndex: 85, pointerEvents: 'none',
    }}>
      <div style={{
        position: 'relative', background: 'rgba(15,15,15,0.96)', backdropFilter: 'blur(12px)', borderRadius: 16,
        padding: '18px 22px', fontFamily: ssStyles.font, color: '#f0f0f0',
        boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.3)',
        border: `1.5px solid ${ssStyles.accent}`,
      }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 4, background: ssStyles.accent }}/>
            <div style={{
              fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
              fontWeight: 700, color: ssStyles.accent, fontFamily: ssStyles.mono,
            }}>{title}</div>
          </div>
        )}
        <div style={{ fontSize: 20, lineHeight: 1.4, fontWeight: 500, letterSpacing: '-0.005em' }}>{text}</div>
        {side === 'top' && (
          <div style={{
            position: 'absolute', left: `calc(${tailOffsetX}% - 10px)`, bottom: -11,
            width: 0, height: 0,
            borderLeft: '11px solid transparent', borderRight: '11px solid transparent',
            borderTop: `12px solid ${ssStyles.accent}`,
          }}>
            <div style={{
              position: 'absolute', left: -10, top: -12, width: 0, height: 0,
              borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
              borderTop: '11px solid #0f0f0f',
            }}/>
          </div>
        )}
        {side === 'bottom' && (
          <div style={{
            position: 'absolute', left: `calc(${tailOffsetX}% - 10px)`, top: -12,
            width: 0, height: 0,
            borderLeft: '11px solid transparent', borderRight: '11px solid transparent',
            borderBottom: `12px solid ${ssStyles.accent}`,
          }}>
            <div style={{
              position: 'absolute', left: -10, top: 1, width: 0, height: 0,
              borderLeft: '10px solid transparent', borderRight: '10px solid transparent',
              borderBottom: '11px solid #0f0f0f',
            }}/>
          </div>
        )}
        {side === 'left' && (
          <div style={{
            position: 'absolute', right: -12, top: `calc(${tailOffsetY}% - 10px)`,
            width: 0, height: 0,
            borderTop: '11px solid transparent', borderBottom: '11px solid transparent',
            borderLeft: `12px solid ${ssStyles.accent}`,
          }}/>
        )}
        {side === 'right' && (
          <div style={{
            position: 'absolute', left: -12, top: `calc(${tailOffsetY}% - 10px)`,
            width: 0, height: 0,
            borderTop: '11px solid transparent', borderBottom: '11px solid transparent',
            borderRight: `12px solid ${ssStyles.accent}`,
          }}/>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TRANSITION — between Landing (scene 6) and Dashboard (scene 7)
// A "zoom-in through the CTA button" then reveal the dashboard.
// Implemented as a brief bridging scene (2.5s) that starts where Landing ended
// (deep on the CTA) and blurs/brightens into white, then cross-fades to the
// dashboard shot which pulls-forward from scale 0.88.
// ═══════════════════════════════════════════════════════════════════════
function SceneBridge() {
  const { localTime, duration } = useSprite();
  const p = clamp(localTime / duration, 0, 1);
  const e = Easing.easeInOutCubic(p);

  // Phase A (0 .. 0.55): finish zoom into CTA with growing white flash
  // Phase B (0.55 .. 1): zoom-out reveal of first login dashboard at scale 0.92 → 1.0
  const phaseA = clamp(p / 0.55, 0, 1);
  const phaseB = clamp((p - 0.55) / 0.45, 0, 1);
  const eA = Easing.easeInCubic(phaseA);
  const eB = Easing.easeOutCubic(phaseB);

  // Landing CTA target (from shot 06 at nx=0.5, ny=0.70)
  const ctaScale = 1.45 + eA * 1.3;
  const flash = eA;

  // Dashboard pull-forward
  const dashScale = 1.12 - eB * 0.12;
  const dashOpacity = eB;

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#fafaf9', overflow: 'hidden' }}>
      {/* Phase A: landing CTA */}
      {phaseA < 1 && (
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - phaseB }}>
          <img src="shots/06.jpg" alt=""
            style={{
              position: 'absolute', left: '50%', top: '50%',
              width: STAGE_W, height: IDRAWN_H,
              transform: `translate(-50%, -50%) translateY(${-0.20 * IDRAWN_H * ctaScale}px) scale(${ctaScale})`,
              transformOrigin: 'center',
            }}/>
          <div style={{
            position: 'absolute', inset: 0, background: '#ffffff',
            opacity: flash * 0.95,
          }}/>
        </div>
      )}
      {/* Phase B: dashboard emerges */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: dashOpacity,
      }}>
        <img src="shots/07.jpg" alt=""
          style={{
            position: 'absolute', left: '50%', top: '50%',
            width: STAGE_W, height: IDRAWN_H,
            transform: `translate(-50%, -50%) scale(${dashScale})`,
            transformOrigin: 'center',
            filter: `blur(${(1 - eB) * 8}px)`,
          }}/>
      </div>
      {/* Bridge label */}
      <div style={{
        position: 'absolute', bottom: 80, left: '50%',
        transform: `translateX(-50%)`,
        opacity: phaseA < 0.5 ? phaseA * 2 : (1 - Math.max(0, (phaseA - 0.5) * 2)) * (phaseB < 0.5 ? 0 : 1),
      }}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// IN-APP SCENES — coordinates verified against actual screenshots.
// Key: when camera focuses at imgFocus(nx,ny,scale), that image point
// lands at screen center (960,540). Other elements offset from there.
// ═══════════════════════════════════════════════════════════════════════

// Scene 07 — First login dashboard (8s)
// shot/07: "Set up your brand" button at image nx≈0.267, ny≈0.674
function Scene07() {
  // "Set up your brand →" button is at image ~(0.267, 0.674)
  // When camera focused there at scale 1.7, button sits at screen (960,540)
  return <KeyframedShot src="shots/07.jpg" beats={[
    { t: 0,   nx: 0.5, ny: 0.5, scale: 1.0,
      bubble: { title: 'First login', text: 'ShotSync prompts you to set up your brand before your first upload.',
                targetX: 960, targetY: 260, side: 'bottom', width: 540 } },
    { t: 2.5, nx: 0.267, ny: 0.674, scale: 1.7,
      bubble: { title: 'Set up your brand', text: 'Hit this button — takes about 2 minutes, 4 steps.',
                targetX: 960, targetY: 540, side: 'top', width: 460 },
      highlight: { x: 770, y: 518, w: 380, h: 46 },
      cursor: { x: 960, y: 541, clickAt: 1.3 } },
    { t: 7.5, nx: 0.267, ny: 0.674, scale: 1.7 },
  ]}/>;
}

// Scene 08 — Brand setup step 1 (9s)
// shot/08: modal centered; name field ny≈0.413, code field ny≈0.545, swatches ny≈0.648
function Scene08() {
  return <KeyframedShot src="shots/08.jpg" beats={[
    { t: 0,   nx: 0.5, ny: 0.5, scale: 1.0,
      bubble: { title: 'Brand setup · 1 of 4', text: 'Step 1 — your brand name, short code and colour.',
                targetX: 960, targetY: 240, side: 'bottom', width: 500 } },
    { t: 2.5, nx: 0.50, ny: 0.413, scale: 1.8,
      bubble: { title: 'Brand name', text: 'Your full brand name — used across the app and in exports.',
                targetX: 960, targetY: 540, side: 'top', width: 480 } },
    { t: 5.0, nx: 0.50, ny: 0.545, scale: 1.8,
      bubble: { title: 'Brand code', text: 'Up to 6 characters, auto-generated — stamped in every exported filename.',
                targetX: 960, targetY: 540, side: 'top', width: 520 } },
    { t: 7.5, nx: 0.50, ny: 0.648, scale: 1.7,
      bubble: { title: 'Brand colour', text: 'Pick your colour — shown across clusters and the dashboard.',
                targetX: 960, targetY: 540, side: 'top', width: 460 } },
    { t: 9,   nx: 0.50, ny: 0.648, scale: 1.7 },
  ]}/>;
}

// Scene 09 — Brand setup step 3 (9s)
// shot/09: On-Model/Still-Life tabs ny≈0.275; number row ny≈0.398; angle list ny≈0.62
function Scene09() {
  return <KeyframedShot src="shots/09.jpg" beats={[
    { t: 0,   nx: 0.5, ny: 0.5, scale: 1.0,
      bubble: { title: 'Brand setup · 3 of 4', text: 'Step 3 — configure your shoot format.',
                targetX: 960, targetY: 240, side: 'bottom', width: 480 } },
    { t: 2.5, nx: 0.50, ny: 0.275, scale: 1.75,
      bubble: { title: 'Shoot type', text: 'On-Model or Still Life — AI adapts its detection to match.',
                targetX: 960, targetY: 540, side: 'top', width: 480 } },
    { t: 5.0, nx: 0.50, ny: 0.398, scale: 1.8,
      bubble: { title: 'Images per look', text: 'How many shots make up one complete look — pre-fills on every upload.',
                targetX: 960, targetY: 540, side: 'top', width: 520 } },
    { t: 7.0, nx: 0.556, ny: 0.620, scale: 1.6,
      bubble: { title: 'Angle sequence', text: 'The order your photographer shoots each angle — AI auto-detects every one.',
                targetX: 960, targetY: 540, side: 'top', width: 540 } },
    { t: 9,   nx: 0.556, ny: 0.620, scale: 1.6 },
  ]}/>;
}

// Scene 10 — Dashboard live (8s)
// shot/10: stats row ny≈0.265; "New job" button nx≈0.921, ny≈0.036
function Scene10() {
  // New job button screen coords when focused at (0.921, 0.036, 1.75): (960, 540)
  return <KeyframedShot src="shots/10.jpg" beats={[
    { t: 0,   nx: 0.5, ny: 0.5, scale: 1.0,
      bubble: { title: 'Dashboard', text: 'Brand is set up — your dashboard is now live.',
                targetX: 960, targetY: 240, side: 'bottom', width: 480 } },
    { t: 2.5, nx: 0.50, ny: 0.265, scale: 1.7,
      bubble: { title: 'At a glance', text: 'Images processed, active clusters, exports and SKU match rate — updated after every job.',
                targetX: 960, targetY: 540, side: 'bottom', width: 540 } },
    { t: 5.0, nx: 0.921, ny: 0.036, scale: 1.75,
      bubble: { title: 'Start a job', text: 'Click New job to upload your first shoot.',
                targetX: 960, targetY: 540, side: 'bottom', width: 420 },
      highlight: { x: 868, y: 518, w: 184, h: 45 },
      cursor: { x: 960, y: 540, clickAt: 1.2 } },
    { t: 7.5, nx: 0.921, ny: 0.036, scale: 1.75 },
  ]}/>;
}

// Scene 11 — Upload step 1 (9s)
// shot/11: shoot name input nx≈0.375, ny≈0.340; shoot type cards ny≈0.622
function Scene11() {
  return <KeyframedShot src="shots/11.jpg" beats={[
    { t: 0,   nx: 0.5, ny: 0.5, scale: 1.0,
      bubble: { title: 'New upload', text: 'Name your shoot and confirm the shot type.',
                targetX: 960, targetY: 220, side: 'bottom', width: 460 } },
    { t: 2.5, nx: 0.375, ny: 0.340, scale: 1.7,
      bubble: { title: 'Shoot name', text: 'Give the shoot a name — used in exports and the all-jobs history.',
                targetX: 960, targetY: 540, side: 'top', width: 500 } },
    { t: 5.0, nx: 0.500, ny: 0.622, scale: 1.55,
      bubble: { title: 'Shoot type', text: 'On-Model or Still Life — pre-filled from your brand setup, easy to switch.',
                targetX: 960, targetY: 540, side: 'top', width: 520 } },
    { t: 7.5, nx: 0.500, ny: 0.840, scale: 1.55,
      bubble: { title: 'Pre-filled', text: 'Images per look and angle sequence come straight from your brand profile.',
                targetX: 960, targetY: 540, side: 'top', width: 540 } },
    { t: 9,   nx: 0.500, ny: 0.840, scale: 1.55 },
  ]}/>;
}

// Scene 12 — Upload step 2 (10s)
// shot/12: marketplace cards row ny≈0.340; drop zone center nx≈0.555, ny≈0.770
function Scene12() {
  return <KeyframedShot src="shots/12.jpg" beats={[
    { t: 0,   nx: 0.5, ny: 0.5, scale: 1.0,
      bubble: { title: 'Files & targets', text: 'Choose your marketplaces and drop your shoot images.',
                targetX: 960, targetY: 220, side: 'bottom', width: 480 } },
    { t: 2.5, nx: 0.500, ny: 0.340, scale: 1.65,
      bubble: { title: 'Target marketplaces', text: 'Select all the channels you sell on — each gets its own sized files and CSV.',
                targetX: 960, targetY: 540, side: 'top', width: 560 } },
    { t: 5.5, nx: 0.555, ny: 0.770, scale: 1.5,
      bubble: { title: 'Drop images', text: 'Up to 1,000 files — JPG, PNG, HEIC. Or import straight from Google Drive or Dropbox.',
                targetX: 960, targetY: 540, side: 'top', width: 580 } },
    { t: 9.5, nx: 0.555, ny: 0.770, scale: 1.5 },
  ]}/>;
}

// Scene 13 — Clusters (11s)
// shot/13: Look 1 image strip ny≈0.300; SKU input nx≈0.38, ny≈0.737
//          "Confirm all" btn nx≈0.764, ny≈0.024 — at scale 1.1 focused ny≈0.15 appears at (1518, 375)
function Scene13() {
  return <KeyframedShot src="shots/13.jpg" beats={[
    { t: 0,   nx: 0.5, ny: 0.5, scale: 1.0,
      bubble: { title: 'Cluster review', text: 'Every image grouped by product look — review each cluster and confirm the SKU.',
                targetX: 960, targetY: 260, side: 'bottom', width: 560 } },
    { t: 2.5, nx: 0.340, ny: 0.300, scale: 1.65,
      bubble: { title: 'Auto-angles', text: 'Full-length, front, side, mood, detail, back — AI labels every angle automatically.',
                targetX: 960, targetY: 540, side: 'bottom', width: 560 } },
    { t: 5.5, nx: 0.380, ny: 0.737, scale: 1.65,
      bubble: { title: 'Confirm SKU', text: 'Type or confirm the style SKU — then click Confirm.',
                targetX: 960, targetY: 540, side: 'top', width: 480 },
      highlight: { x: 716, y: 518, w: 200, h: 45 },
      cursor: { x: 1204, y: 541, clickAt: 1.1 } },
    { t: 8.5, nx: 0.500, ny: 0.150, scale: 1.1,
      bubble: { title: 'Confirm all', text: 'Hit Confirm all to approve every look at once.',
                targetX: 1518, targetY: 375, side: 'bottom', width: 420 },
      highlight: { x: 1418, y: 355, w: 200, h: 40 } },
    { t: 11,  nx: 0.500, ny: 0.150, scale: 1.1 },
  ]}/>;
}

// Scene 14 — AI Product Copy (10s)
// shot/14: left panel images ny≈0.20; copy text (title+desc) ny≈0.60; bullets ny≈0.76
function Scene14() {
  return <KeyframedShot src="shots/14.jpg" beats={[
    { t: 0,   nx: 0.5, ny: 0.5, scale: 1.0,
      bubble: { title: 'AI product copy', text: 'AI generates a full product listing from the hero image — no typing required.',
                targetX: 960, targetY: 260, side: 'bottom', width: 560 } },
    { t: 2.5, nx: 0.330, ny: 0.200, scale: 1.6,
      bubble: { title: 'Hero image', text: 'GPT-4o reads this image and writes a complete listing for the look.',
                targetX: 960, targetY: 540, side: 'bottom', width: 520 } },
    { t: 5.0, nx: 0.330, ny: 0.600, scale: 1.55,
      bubble: { title: 'Title & description', text: 'SEO-friendly title and a 2-sentence hook — tailored for ANZ fashion.',
                targetX: 960, targetY: 540, side: 'top', width: 540 } },
    { t: 7.5, nx: 0.330, ny: 0.770, scale: 1.55,
      bubble: { title: 'Five bullets', text: 'Features, fit, fabric, care — edit or hit Regenerate for a new version.',
                targetX: 960, targetY: 540, side: 'top', width: 520 } },
    { t: 10,  nx: 0.330, ny: 0.770, scale: 1.55 },
  ]}/>;
}

// Scene 15 — Export (10s)
// shot/15: Export modal center nx≈0.504; marketplace cards ny≈0.370; output section ny≈0.670
function Scene15() {
  return <KeyframedShot src="shots/15.jpg" beats={[
    { t: 0,   nx: 0.5, ny: 0.5, scale: 1.0,
      bubble: { title: 'Export', text: 'Final step — select your target marketplaces and export.',
                targetX: 960, targetY: 260, side: 'bottom', width: 480 } },
    { t: 2.5, nx: 0.504, ny: 0.370, scale: 1.65,
      bubble: { title: 'Marketplaces', text: 'Each gets its own sized images and a marketplace-spec CSV.',
                targetX: 960, targetY: 540, side: 'top', width: 500 } },
    { t: 5.5, nx: 0.504, ny: 0.670, scale: 1.65,
      bubble: { title: 'Output', text: 'Download a ZIP or save straight to a cloud folder — then upload and go live.',
                targetX: 960, targetY: 540, side: 'top', width: 540 } },
    { t: 8.0, nx: 0.504, ny: 0.500, scale: 1.3,
      bubble: { title: 'Done!', text: 'Marketplace-ready in seconds.',
                targetX: 960, targetY: 540, side: 'top', width: 380 } },
    { t: 10,  nx: 0.504, ny: 0.500, scale: 1.3 },
  ]}/>;
}

// ═══════════════════════════════════════════════════════════════════════
// OUTRO
// ═══════════════════════════════════════════════════════════════════════
function SceneOutro() {
  const { localTime } = useSprite();
  const a = Easing.easeOutCubic(clamp(localTime / 0.8, 0, 1));
  const b = Easing.easeOutCubic(clamp((localTime - 0.5) / 1.0, 0, 1));
  const c = Easing.easeOutCubic(clamp((localTime - 1.1) / 1.0, 0, 1));
  const d = Easing.easeOutBack(clamp((localTime - 1.6) / 0.9, 0, 1));
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'radial-gradient(ellipse at 50% 50%, rgba(232,217,122,0.07) 0%, #080808 65%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: ssStyles.font, color: '#f0f0f0',
    }}>
      <div style={{ opacity: a, transform: `translateY(${(1 - a) * 20}px)`, marginBottom: 36 }}><ShotSyncMark size={84}/></div>
      <div style={{
        fontSize: 96, fontWeight: 700, letterSpacing: '-0.04em',
        textAlign: 'center', lineHeight: 1.0,
        opacity: a, transform: `translateY(${(1 - a) * 30}px)`,
        marginBottom: 28, maxWidth: 1500, color: '#f0f0f0',
      }}>Upload. Review. Export. <span style={{color:'#e8d97a'}}>Done.</span></div>
      <div style={{
        fontSize: 28, color: '#888', letterSpacing: '-0.01em',
        opacity: b, transform: `translateY(${(1 - b) * 16}px)`,
        marginBottom: 56, textAlign: 'center', maxWidth: 1100,
      }}>From a raw, unsorted shoot to marketplace-ready packages — in a fraction of the time.</div>
      <div style={{ opacity: c, display: 'flex', gap: 16, alignItems: 'center',
        transform: `scale(${0.96 + 0.04 * d})` }}>
        <a href="https://www.shotsync.ai/dashboard" style={{
          display: 'inline-block',
          padding: '20px 44px', background: '#e8d97a', color: '#111',
          borderRadius: 14, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em',
          boxShadow: '0 14px 40px rgba(232,217,122,0.25)',
          textDecoration: 'none',
        }}>Get started free →</a>
      </div>
      <div style={{ opacity: c, marginTop: 24,
        fontSize: 16, color: '#555', fontFamily: ssStyles.mono,
      }}>hello@shotsync.ai · No credit card required</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TIMELINE
// Intro 8s · Landing 47s · Bridge 2.5s · in-app scenes · Outro 10s
// ═══════════════════════════════════════════════════════════════════════
const T = (() => {
  let t = 0;
  const add = (dur, comp, label) => { const e = { start: t, end: t + dur, comp, label }; t += dur; return e; };
  return [
    add(8,    SceneIntro,    'Intro'),
    add(47,   LandingScroll, 'Website tour'),
    add(2.5,  SceneBridge,   'Into app'),
    add(8,    Scene07,       'First login'),
    add(9,    Scene08,       'Brand setup'),
    add(9,    Scene09,       'Shoot setup'),
    add(8,    Scene10,       'Dashboard'),
    add(9,    Scene11,       'New upload'),
    add(10,   Scene12,       'Marketplaces'),
    add(11,   Scene13,       'Clusters'),
    add(10,   Scene14,       'AI copy'),
    add(10,   Scene15,       'Export'),
    add(10,   SceneOutro,    'Outro'),
  ];
})();

const TIMELINE = T;
const TOTAL_DURATION = TIMELINE[TIMELINE.length - 1].end;

function ChapterBar() {
  const t = useTime();
  const active = TIMELINE.findIndex(s => t >= s.start && t < s.end);
  const cur = TIMELINE[active] || TIMELINE[TIMELINE.length - 1];
  const segP = cur ? (t - cur.start) / (cur.end - cur.start) : 0;
  return (
    <div style={{
      position: 'absolute', bottom: 26, left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 18px',
      background: 'rgba(13,13,14,0.75)', backdropFilter: 'blur(10px)',
      borderRadius: 999, fontFamily: ssStyles.font, color: '#fafaf9',
      fontSize: 13, fontWeight: 500, zIndex: 70,
      boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
    }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {TIMELINE.map((s, i) => {
          const isActive = i === active;
          const isPast = i < active;
          const fill = isPast ? 1 : (isActive ? clamp(segP, 0, 1) : 0);
          return (
            <div key={i} style={{
              width: isActive ? 36 : 8, height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.18)',
              position: 'relative', overflow: 'hidden',
              transition: 'width 300ms',
            }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${fill * 100}%`, background: ssStyles.accent, borderRadius: 2,
              }}/>
            </div>
          );
        })}
      </div>
      <div style={{ marginLeft: 8, opacity: 0.85 }}>{cur?.label}</div>
    </div>
  );
}

function Tutorial() {
  return (
    <>
      <TimestampLabel/>
      {TIMELINE.map((s, i) => {
        const Comp = s.comp;
        return (
          <Sprite key={i} start={s.start} end={s.end}>
            <Comp/>
          </Sprite>
        );
      })}
      {/* Wipes between scenes, except Landing→Bridge (bridge is its own transition) */}
      {TIMELINE.slice(1).map((s, i) => {
        // index i here is for TIMELINE[i+1]; we skip the bridge (index 2) and the scene right after the bridge (index 3)
        const target = i + 1;
        if (target === 2 || target === 3) return null;
        return <SceneWipe key={i} at={s.start}/>;
      })}
      <ChapterBar/>
    </>
  );
}

Object.assign(window, { Tutorial, TOTAL_DURATION });
