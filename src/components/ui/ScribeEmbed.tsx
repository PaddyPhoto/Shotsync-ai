import type { CSSProperties } from 'react'

// ShotSync walkthrough — "How to Set Up a New Brand and Process Images in ShotSync"
// Hosted Scribe movie (with voiceover). Update SCRIBE_SRC if the Scribe is re-created.
const SCRIBE_SRC =
  'https://scribehow.com/embed/How_to_Set_Up_a_New_Brand_and_Process_Images_in_ShotSync__UsdcMC7bTa6xmFXPIsX9vQ?as=video'

interface ScribeEmbedProps {
  /** Caller supplies sizing (height or aspectRatio); width defaults to 100%. */
  style?: CSSProperties
  className?: string
  title?: string
}

export function ScribeEmbed({ style, className, title = 'ShotSync walkthrough' }: ScribeEmbedProps) {
  return (
    <iframe
      src={SCRIBE_SRC}
      title={title}
      allow="fullscreen"
      loading="lazy"
      style={{ width: '100%', border: 0, display: 'block', ...style }}
      className={className}
    />
  )
}
