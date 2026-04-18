'use client'

import { useState, useEffect } from 'react'
import { useBrand } from '@/context/BrandContext'
import { ACCESSORY_CATEGORIES } from '@/lib/accessories/categories'

type Step = 0 | 1 | 2 | 3

const ALL_ANGLES = ['full-length', 'front', 'back', 'side', 'detail', 'mood', 'front-3/4', 'back-3/4', 'flat-lay']
const STILL_LIFE_ANGLES = ['front', 'back', 'side', 'detail', 'inside', 'flat-lay', 'top-down', 'front-3/4', 'back-3/4']

const ANGLE_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  'front':       { bg: 'rgba(48,209,88,0.10)',  color: '#1a8a35', dot: '#30d158' },
  'back':        { bg: 'rgba(0,122,255,0.09)',  color: '#005fc4', dot: '#0071e3' },
  'side':        { bg: 'rgba(255,159,10,0.10)', color: '#c27800', dot: '#ff9f0a' },
  'full-length': { bg: 'rgba(175,82,222,0.10)', color: '#7b2fa8', dot: '#af52de' },
  'detail':      { bg: 'rgba(255,59,48,0.09)',  color: '#c41c00', dot: '#ff3b30' },
  'mood':        { bg: 'rgba(255,55,95,0.09)',  color: '#b8003c', dot: '#ff375f' },
  'front-3/4':   { bg: 'rgba(48,209,88,0.07)',  color: '#1a8a35', dot: '#30d158' },
  'back-3/4':    { bg: 'rgba(0,122,255,0.07)',  color: '#005fc4', dot: '#0071e3' },
}

const LOGO_COLORS = ['#e8d97a', '#30d158', '#0071e3', '#ff3b30', '#ff9f0a', '#af52de', '#ff375f', '#1d1d1f', '#8e8e93']

const NAMING_PRESETS = [
  { id: 'standard',  label: 'Standard',        template: '{BRAND}_{SKU}_{COLOR}_{VIEW}',  desc: 'Brand · SKU · Colour · Angle' },
  { id: 'sequence',  label: 'Sequence-based',   template: '{BRAND}_{SEQ}_{VIEW}',          desc: 'Brand · Sequential number · Angle' },
  { id: 'sku-first', label: 'SKU-first',        template: '{SKU}_{COLOR}_{VIEW}',          desc: 'SKU · Colour · Angle' },
]

// Derive a short brand code from the brand name
function autoBrandCode(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase()
  return words.map((w) => w[0]).join('').slice(0, 4).toUpperCase()
}

// Build a sample filename from a template using placeholder values
function previewFilename(template: string, brandCode: string): string {
  const b = (brandCode || 'BRAND').toUpperCase()
  return (
    template
      .replace(/\{BRAND_CODE\}/g, b).replace(/\{BRAND\}/g, b)
      .replace(/\{SKU\}/g, 'SKU-001')
      .replace(/\{SEQ\}/g, '001')
      .replace(/\{COLOR\}/g, 'BLACK').replace(/\{COLOUR_NAME\}/g, 'BLACK')
      .replace(/\{VIEW\}/g, 'FRONT').replace(/\{ANGLE\}/g, 'FRONT')
      .replace(/\{INDEX\}/g, '01').replace(/\{ANGLE_NUMBER\}/g, '01')
      .replace(/\{SEASON\}/g, '').replace(/\{SUPPLIER_CODE\}/g, '')
      .replace(/\{COLOUR_CODE\}/g, '').replace(/\{STYLE_NUMBER\}/g, '')
      .replace(/\{CUSTOM_TEXT\}/g, '')
      .replace(/_+/g, '_').replace(/^_|_$/g, '')
  ) + '.jpg'
}

const STEP_LABELS = ['Your brand', 'File naming', 'Shoot setup', 'Review & save']

export function BrandOnboardingModal() {
  const { brands, isLoading, refreshBrands } = useBrand()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<Step>(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState('')
  const [brandCode, setBrandCode] = useState('')
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false)
  const [logoColor, setLogoColor] = useState('#e8d97a')
  const [namingPreset, setNamingPreset] = useState('standard')
  const [customTemplate, setCustomTemplate] = useState('{BRAND}_{SKU}_{COLOR}_{VIEW}')
  const [imagesPerLook, setImagesPerLook] = useState(4)
  const [angleSequence, setAngleSequence] = useState(['full-length', 'front', 'back', 'side'])
  const [stillLifeImagesPerLook, setStillLifeImagesPerLook] = useState(2)
  const [stillLifeAngleSequences, setStillLifeAngleSequences] = useState<Record<string, string[]>>({})
  const [shootTab, setShootTab] = useState<'on-model' | 'still-life'>('on-model')
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const activeTemplate =
    namingPreset === 'custom'
      ? customTemplate
      : (NAMING_PRESETS.find((p) => p.id === namingPreset)?.template ?? '{BRAND}_{SKU}_{COLOR}_{VIEW}')

  // Auto-open when no brands exist
  useEffect(() => {
    if (!isLoading && brands.length === 0) setVisible(true)
  }, [isLoading, brands.length])

  // Auto-generate brand code while the user hasn't manually edited it
  useEffect(() => {
    if (!codeManuallyEdited) setBrandCode(autoBrandCode(name))
  }, [name, codeManuallyEdited])

  // Keep angle sequence length in sync with images per look
  useEffect(() => {
    setAngleSequence((prev) => {
      const seq = [...prev]
      while (seq.length < imagesPerLook) {
        const next = ALL_ANGLES.find((a) => !seq.includes(a)) ?? 'front'
        seq.push(next)
      }
      return seq.slice(0, imagesPerLook)
    })
  }, [imagesPerLook])

  const goNext = () => {
    if (step === 0) {
      if (!name.trim()) { setError('Please enter your brand name.'); return }
      if (!brandCode.trim()) { setError('Please enter a brand code.'); return }
      if (brandCode.length > 6) { setError('Brand code must be 6 characters or fewer.'); return }
    }
    setError('')
    setStep((step + 1) as Step)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          brand_code: brandCode.trim().toUpperCase(),
          logo_color: logoColor,
          naming_template: activeTemplate,
          images_per_look: imagesPerLook,
          on_model_angle_sequence: angleSequence,
          still_life_images_per_look: stillLifeImagesPerLook,
          still_life_angle_sequences: stillLifeAngleSequences,
          supplier_code: '',
          season: '',
          shopify_store_url: '',
          shopify_access_token: '',
          gm_position: 'last',
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Failed to create brand.')
        return
      }
      await refreshBrands()
      setVisible(false)
    } finally {
      setSaving(false)
    }
  }

  if (!visible) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <div
        style={{ background: '#fff', borderRadius: '22px', width: '100%', maxWidth: '540px', margin: '16px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.22)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '28px 32px 22px', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#aeaeb2', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '2px' }}>
                Brand setup · {step + 1} of 4
              </p>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1d1d1f', letterSpacing: '-.4px', lineHeight: 1 }}>
                {STEP_LABELS[step]}
              </h2>
            </div>
          </div>

          {/* Step progress dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: '4px', borderRadius: '99px', transition: 'all 0.3s',
                  flex: i === step ? 3 : 1,
                  background: i <= step ? '#1d1d1f' : 'rgba(0,0,0,0.09)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Step body */}
        <div style={{ padding: '28px 32px', maxHeight: '440px', overflowY: 'auto' }}>

          {/* ── Step 1: Brand identity ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', display: 'block', marginBottom: '7px' }}>Brand name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Country Road"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '15px', color: '#1d1d1f', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', display: 'block', marginBottom: '3px' }}>
                  Brand code
                  <span style={{ fontWeight: 400, color: '#aeaeb2' }}> — appears in every exported filename</span>
                </label>
                <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '7px' }}>
                  Auto-generated from your name. Max 6 characters, uppercase.
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    value={brandCode}
                    maxLength={6}
                    onChange={(e) => { setBrandCode(e.target.value.toUpperCase()); setCodeManuallyEdited(true) }}
                    placeholder="e.g. CR"
                    style={{ width: '120px', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.14)', fontSize: '15px', fontWeight: 700, color: '#1d1d1f', fontFamily: 'monospace', letterSpacing: '.06em', outline: 'none', textTransform: 'uppercase', boxSizing: 'border-box' }}
                  />
                  {codeManuallyEdited && name && (
                    <button
                      onClick={() => { setBrandCode(autoBrandCode(name)); setCodeManuallyEdited(false) }}
                      style={{ fontSize: '12px', color: '#0071e3', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0' }}
                    >
                      Reset to suggestion
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', display: 'block', marginBottom: '9px' }}>Brand colour</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {LOGO_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setLogoColor(c)}
                      style={{
                        width: '32px', height: '32px', borderRadius: '8px', background: c, border: 'none',
                        cursor: 'pointer', outline: logoColor === c ? '2.5px solid #1d1d1f' : '2px solid transparent',
                        outlineOffset: '2px', transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Naming template ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: '#6e6e73', marginBottom: '4px' }}>
                Choose how your exported files will be named. You can always update this in Settings.
              </p>

              {NAMING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setNamingPreset(preset.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                    borderRadius: '12px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                    border: namingPreset === preset.id ? '1.5px solid #1d1d1f' : '1px solid rgba(0,0,0,0.09)',
                    background: namingPreset === preset.id ? 'rgba(0,0,0,0.03)' : 'transparent',
                  }}
                >
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${namingPreset === preset.id ? '#1d1d1f' : 'rgba(0,0,0,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {namingPreset === preset.id && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1d1d1f' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f', marginBottom: '2px' }}>{preset.label}</p>
                    <p style={{ fontSize: '11px', color: '#aeaeb2', fontFamily: 'monospace' }}>{preset.template}</p>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6e6e73', textAlign: 'right', maxWidth: '140px', lineHeight: 1.3 }}>{preset.desc}</p>
                </button>
              ))}

              {/* Custom */}
              <div
                style={{
                  borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s',
                  border: namingPreset === 'custom' ? '1.5px solid #1d1d1f' : '1px solid rgba(0,0,0,0.09)',
                  background: namingPreset === 'custom' ? 'rgba(0,0,0,0.03)' : 'transparent',
                }}
                onClick={() => setNamingPreset('custom')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${namingPreset === 'custom' ? '#1d1d1f' : 'rgba(0,0,0,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {namingPreset === 'custom' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1d1d1f' }} />}
                  </div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f' }}>Custom template</p>
                </div>
                {namingPreset === 'custom' && (
                  <input
                    value={customTemplate}
                    onChange={(e) => setCustomTemplate(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="{BRAND}_{SKU}_{COLOR}_{VIEW}"
                    style={{ marginTop: '10px', width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '13px', fontFamily: 'monospace', color: '#1d1d1f', outline: 'none', boxSizing: 'border-box' }}
                  />
                )}
              </div>

              {/* Live preview */}
              <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '10px', padding: '12px 16px', marginTop: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#aeaeb2', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '5px' }}>Filename preview</p>
                <p style={{ fontSize: '13px', fontFamily: 'monospace', fontWeight: 500, color: '#1d1d1f', wordBreak: 'break-all' }}>
                  {previewFilename(activeTemplate, brandCode)}
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Shoot setup ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Tab toggle */}
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', padding: '3px', gap: '2px' }}>
                {(['on-model', 'still-life'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setShootTab(tab)}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none', fontSize: '13px',
                      fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                      background: shootTab === tab ? '#fff' : 'transparent',
                      color: shootTab === tab ? '#1d1d1f' : '#6e6e73',
                      boxShadow: shootTab === tab ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                    }}
                  >
                    {tab === 'on-model' ? 'On-Model' : 'Still Life'}
                  </button>
                ))}
              </div>

              {/* On-Model */}
              {shootTab === 'on-model' && (
                <>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', display: 'block', marginBottom: '3px' }}>Images per look</label>
                    <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '10px' }}>How many shots make up one complete on-model product look.</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <button
                          key={n}
                          onClick={() => setImagesPerLook(n)}
                          style={{
                            width: '40px', height: '40px', borderRadius: '10px', border: 'none', fontSize: '14px',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                            background: imagesPerLook === n ? '#1d1d1f' : 'rgba(0,0,0,0.05)',
                            color: imagesPerLook === n ? '#f5f5f7' : '#6e6e73',
                            boxShadow: imagesPerLook === n ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', display: 'block', marginBottom: '3px' }}>Angle sequence</label>
                    <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '10px' }}>The order your photographer shoots each angle in the studio.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {angleSequence.map((angle, idx) => {
                        const s = ANGLE_STYLE[angle] ?? { bg: 'rgba(0,0,0,0.05)', color: '#6e6e73', dot: '#aeaeb2' }
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '18px', fontSize: '11px', color: '#aeaeb2', textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                            <select
                              value={angle}
                              onChange={(e) => { const seq = [...angleSequence]; seq[idx] = e.target.value; setAngleSequence(seq) }}
                              style={{ flex: 1, background: s.bg, border: `1px solid ${s.color}30`, borderRadius: '8px', padding: '5px 10px', fontSize: '13px', fontWeight: 500, color: s.color, outline: 'none', cursor: 'pointer' }}
                            >
                              {ALL_ANGLES.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <button type="button" disabled={idx === 0} onClick={() => { const seq = [...angleSequence];[seq[idx-1],seq[idx]]=[seq[idx],seq[idx-1]]; setAngleSequence(seq) }} style={{ width: '20px', height: '16px', fontSize: '9px', color: '#aeaeb2', background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx === 0 ? 0.2 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▲</button>
                              <button type="button" disabled={idx >= imagesPerLook - 1} onClick={() => { const seq = [...angleSequence];[seq[idx],seq[idx+1]]=[seq[idx+1],seq[idx]]; setAngleSequence(seq) }} style={{ width: '20px', height: '16px', fontSize: '9px', color: '#aeaeb2', background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx >= imagesPerLook - 1 ? 0.2 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>▼</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Still Life */}
              {shootTab === 'still-life' && (
                <>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', display: 'block', marginBottom: '3px' }}>Images per look — Still Life</label>
                    <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '10px' }}>Default image count for still life / accessory shoots.</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <button
                          key={n}
                          onClick={() => setStillLifeImagesPerLook(n)}
                          style={{
                            width: '40px', height: '40px', borderRadius: '10px', border: 'none', fontSize: '14px',
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                            background: stillLifeImagesPerLook === n ? '#1d1d1f' : 'rgba(0,0,0,0.05)',
                            color: stillLifeImagesPerLook === n ? '#f5f5f7' : '#6e6e73',
                            boxShadow: stillLifeImagesPerLook === n ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', display: 'block', marginBottom: '3px' }}>Angle sequences by category</label>
                    <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: '10px' }}>Override the default angle order per accessory type. Leave collapsed to use category defaults.</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {ACCESSORY_CATEGORIES.filter((cat) => cat.id !== 'ghost-mannequin').map((cat) => {
                        const customSeq = stillLifeAngleSequences[cat.id]
                        const isExpanded = expandedCat === cat.id
                        const hasCustom = customSeq && customSeq.length > 0
                        const activeSeq = hasCustom ? customSeq : cat.angles

                        return (
                          <div key={cat.id} style={{ border: '1px solid rgba(0,0,0,0.09)', borderRadius: '10px', overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f' }}>{cat.label}</span>
                                {hasCustom
                                  ? <span style={{ fontSize: '11px', fontWeight: 500, color: '#0071e3', background: 'rgba(0,113,227,0.08)', padding: '1px 7px', borderRadius: '20px' }}>custom</span>
                                  : <span style={{ fontSize: '11px', color: '#aeaeb2' }}>{cat.angles.join(' · ')}</span>
                                }
                              </div>
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#aeaeb2" strokeWidth="1.5" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
                                <path d="M2 3.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>

                            {isExpanded && (
                              <div style={{ padding: '4px 14px 12px', borderTop: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
                                  {activeSeq.map((angle, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ width: '16px', fontSize: '11px', color: '#aeaeb2', textAlign: 'right', flexShrink: 0 }}>{idx + 1}</span>
                                      <select
                                        value={angle}
                                        onChange={(e) => {
                                          const seq = [...activeSeq]
                                          seq[idx] = e.target.value
                                          setStillLifeAngleSequences((prev) => ({ ...prev, [cat.id]: seq }))
                                        }}
                                        style={{ flex: 1, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.10)', borderRadius: '7px', padding: '4px 8px', fontSize: '12px', color: '#1d1d1f', outline: 'none', cursor: 'pointer' }}
                                      >
                                        {STILL_LIFE_ANGLES.map((a) => <option key={a} value={a}>{a}</option>)}
                                      </select>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <button type="button" disabled={idx === 0} onClick={() => { const seq=[...activeSeq];[seq[idx-1],seq[idx]]=[seq[idx],seq[idx-1]]; setStillLifeAngleSequences((p)=>({...p,[cat.id]:seq})) }} style={{ width: '18px', height: '14px', fontSize: '9px', color: '#aeaeb2', background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx===0?0.2:1, display:'flex', alignItems:'center', justifyContent:'center' }}>▲</button>
                                        <button type="button" disabled={idx >= activeSeq.length - 1} onClick={() => { const seq=[...activeSeq];[seq[idx],seq[idx+1]]=[seq[idx+1],seq[idx]]; setStillLifeAngleSequences((p)=>({...p,[cat.id]:seq})) }} style={{ width: '18px', height: '14px', fontSize: '9px', color: '#aeaeb2', background: 'transparent', border: 'none', cursor: 'pointer', opacity: idx>=activeSeq.length-1?0.2:1, display:'flex', alignItems:'center', justifyContent:'center' }}>▼</button>
                                      </div>
                                      <button type="button" onClick={() => { const seq=[...activeSeq]; seq.splice(idx,1); setStillLifeAngleSequences((p)=>({...p,[cat.id]:seq})) }} style={{ width: '18px', height: '18px', fontSize: '13px', color: '#aeaeb2', background: 'transparent', border: 'none', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button type="button" onClick={() => { const seq=[...activeSeq, 'front']; setStillLifeAngleSequences((p)=>({...p,[cat.id]:seq})) }} style={{ fontSize: '12px', color: '#0071e3', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>+ Add angle</button>
                                  {hasCustom && (
                                    <button type="button" onClick={() => { const n={...stillLifeAngleSequences}; delete n[cat.id]; setStillLifeAngleSequences(n) }} style={{ fontSize: '12px', color: '#aeaeb2', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>Reset to default</button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 4: Review & save ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <p style={{ fontSize: '13px', color: '#6e6e73', marginBottom: '16px' }}>
                Everything looks good — you can always edit these in Settings after setup.
              </p>
              {[
                { label: 'Brand name',        value: name,                           mono: false },
                { label: 'Brand code',        value: brandCode.toUpperCase(),        mono: true  },
                { label: 'Naming template',   value: activeTemplate,                 mono: true  },
                { label: 'Filename preview',  value: previewFilename(activeTemplate, brandCode), mono: true },
                { label: 'Images per look',   value: `${imagesPerLook} images`,      mono: false },
                { label: 'Angle sequence',    value: angleSequence.join(' → '),      mono: false },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '11px 0', borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                  <span style={{ fontSize: '13px', color: '#aeaeb2', flexShrink: 0, marginRight: '20px', paddingTop: '1px' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f', textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all', lineHeight: 1.4 }}>{value}</span>
                </div>
              ))}
              {error && (
                <p style={{ fontSize: '13px', color: '#ff3b30', marginTop: '12px' }}>{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '0.5px solid rgba(0,0,0,0.07)' }}>
          {/* Back / error */}
          <div>
            {step > 0 ? (
              <button
                onClick={() => { setError(''); setStep((step - 1) as Step) }}
                style={{ fontSize: '14px', color: '#6e6e73', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ← Back
              </button>
            ) : (
              <span style={{ fontSize: '12px', color: '#aeaeb2' }}>We'll guide you through each setting.</span>
            )}
            {error && step < 3 && (
              <p style={{ fontSize: '12px', color: '#ff3b30', marginTop: '4px' }}>{error}</p>
            )}
          </div>

          {/* Next / Save */}
          {step < 3 ? (
            <button
              onClick={goNext}
              style={{ padding: '10px 26px', borderRadius: '10px', background: '#1d1d1f', color: '#f5f5f7', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', letterSpacing: '-.1px' }}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding: '10px 26px', borderRadius: '10px', background: '#1d1d1f', color: '#f5f5f7', fontSize: '14px', fontWeight: 600, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, letterSpacing: '-.1px' }}
            >
              {saving ? 'Creating…' : 'Create brand'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
