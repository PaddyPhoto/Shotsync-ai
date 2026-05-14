'use client'

import { useState, useEffect } from 'react'

let _openModal: (() => void) | null = null
export function openHelpModal() { _openModal?.() }

type QA = { q: string; a: string }
type Section = { title: string; items: QA[] }

const SECTIONS: Section[] = [
  {
    title: 'Getting Started',
    items: [
      {
        q: 'What is ShotSync?',
        a: 'ShotSync automates post-production for fashion brands. Upload your shoot images and ShotSync AI groups them into product clusters with correct angles, SKUs, and colours — ready to export directly to your ERP (Cin7, Apparel21) or marketplace (Shopify, THE ICONIC).',
      },
      {
        q: 'What do I need to set up first?',
        a: 'Go to Brand Settings and configure your brand name, colour codes, SKU naming template, shot configuration (angle sequence), and marketplace export rules. This is a one-time setup — done once and used on every job.',
      },
      {
        q: 'What file types can I upload?',
        a: 'JPEG and PNG images. You can optionally import a style list as an XLSX or CSV to pre-populate SKU, product name, colour, and other metadata before AI processing begins.',
      },
    ],
  },
  {
    title: 'Shot Configuration',
    items: [
      {
        q: 'What is Shot Configuration?',
        a: 'Shot Configuration tells ShotSync the sequence your photographer shot each look in — for example: Front, Back, Side, Detail. This is stored in Brand Settings and used to label angles correctly when images are grouped into clusters on the Review page.',
      },
      {
        q: 'What\'s the difference between Shot Configuration and Marketplace Export angles?',
        a: 'Shot Configuration defines the sequence your photographer shot in — this is the source order. Marketplace Export Rules define the order each specific marketplace requires images in — this is the destination order. ShotSync maps between the two automatically so the same confirmed clusters can be exported to any marketplace in the correct sequence.',
      },
      {
        q: 'What if my shoot sequence doesn\'t match the configured angles?',
        a: 'You can manually re-order images within any cluster on the Review page by dragging thumbnails to their correct positions. You can also click an angle label to reassign it from your brand\'s configured sequence.',
      },
      {
        q: 'Can different garment categories have different shoot sequences?',
        a: 'Yes. In Brand Settings → Shot Configuration → Per-Category Shoot Sequences, you can add a custom angle order for specific categories — for example, Womens Dresses might be shot Full-Length first while Tops are shot Front first. When you assign that category to a cluster on the Review page, its angle labels update instantly to match.',
      },
    ],
  },
  {
    title: 'Clusters & Editing',
    items: [
      {
        q: 'What is a cluster?',
        a: 'A cluster is a group of images that all belong to one product (SKU). ShotSync groups images automatically based on visual similarity, colour, and your configured shot sequence.',
      },
      {
        q: 'How do I fix a wrong cluster?',
        a: 'On the Review page, drag images between clusters to move them, use the split button to break a cluster apart, or merge two clusters together. You can also edit the SKU, colour code, product name, and angle labels directly within each cluster.',
      },
      {
        q: 'What does "Confirm" do?',
        a: 'Confirming a cluster marks it as verified and ready for export. AI copy is generated for confirmed clusters. All clusters must be confirmed before you can export or push to an integration.',
      },
      {
        q: 'Can I rename angles manually?',
        a: 'Yes. Click the angle label beneath any image in a cluster to reassign it from your brand\'s configured angle sequence. Dragging an image to a different position also updates its angle label automatically.',
      },
      {
        q: 'What does the Tops / Bottoms button do?',
        a: 'It controls how the {VIEW_NUM} token is numbered in your file naming template. Topwear uses Full-Length=1, Side=2, Back=3, Mood=4, Front=5. Bottomwear (pants, skirts, shorts) uses Front=1, Side=2, Back=3, Mood=4, Full-Length=5 — because front is the hero shot for bottoms. You rarely need to set this manually: selecting a garment category (Pants, Skirts, Shorts, Swimwear) automatically switches the cluster to Bottoms, and any other category switches it back to Tops.',
      },
      {
        q: 'What does the garment category dropdown do?',
        a: 'It does two things. First, if you\'ve set up a per-category shoot sequence in Brand Settings, selecting the category immediately relabels the cluster\'s angle thumbnails to match — so you get instant visual feedback. Second, at export time it applies any matching category override from Marketplace Settings, which reorders the exported images into the sequence that specific marketplace expects for that garment type.',
      },
    ],
  },
  {
    title: 'Style List',
    items: [
      {
        q: 'What is the style list?',
        a: 'A style list is a spreadsheet (XLSX or CSV) with your product metadata — SKU, product name, colour, style number, RRP, season, and more. Import it on the Upload page and ShotSync automatically matches each cluster to its style list entry.',
      },
      {
        q: 'What columns does ShotSync expect?',
        a: 'SKU is required. Optional columns include: Product Name, Colour, Colour Code, Style Number, Garment Category, Composition, Care, Fit, Length, RRP, Season, Occasion, Gender, Sub-Category, Origin, Size Range. Column names are matched case-insensitively.',
      },
      {
        q: 'What if a cluster doesn\'t match a style list entry?',
        a: 'Unmatched clusters appear with a warning indicator. Open the cluster editor on the Review page to manually select the correct style list entry from a dropdown, or type in the metadata fields directly.',
      },
    ],
  },
  {
    title: 'Integrations',
    items: [
      {
        q: 'How does Cin7 Core integration work?',
        a: 'After confirming clusters, open the Export panel and click "Push to Cin7". ShotSync creates products in your Cin7 account with all metadata, images (fetched directly from Supabase storage), and your configured attribute values. SKUs that already exist in Cin7 are automatically skipped.',
      },
      {
        q: 'What do I need to set up for Cin7?',
        a: 'In Brand Settings → Platforms, enter your Cin7 Account ID and Application Key. You\'ll also need to create a custom attribute set in Cin7 Core named "ShotSync Apparel" with fields: Colour, ColourCode, StyleNumber, Composition, Care, Fit, Length, Season, Gender, Occasion, SubCategory, Origin, SizeRange.',
      },
      {
        q: 'How does Shopify integration work?',
        a: 'Enter your Shopify store URL and Admin API key in Brand Settings → Platforms. After confirming clusters, use the Export panel to push products directly to your Shopify store with processed images, metadata, and AI-generated copy.',
      },
      {
        q: 'What happens when I push ghost mannequin images for a product already in Shopify?',
        a: 'ShotSync checks whether a product with that SKU already exists in your Shopify store before creating anything. If it finds a match, the new images are appended to the existing listing — no duplicate product is created. This means you can process your on-model and ghost mannequin shoots as separate jobs, push each to Shopify, and the GM images land directly on the existing on-model product listing.',
      },
      {
        q: 'What is THE ICONIC integration for?',
        a: 'THE ICONIC is a premium Australian fashion marketplace. Add your User ID and API Key in Brand Settings → Platforms to export product listings directly in THE ICONIC\'s required format, including correct image sequencing and metadata fields.',
      },
      {
        q: 'What data actually gets pushed into Cin7?',
        a: 'Everything. The AI-generated title becomes the Cin7 product name. The description and bullet points become the product description in HTML. RRP maps to price. All CSV metadata (Fabric, Care, Fit, Size Range, Season, Gender, Occasion, Origin, Sub-Category) maps to custom attributes. The garment category maps to Cin7\'s Category field. Images are processed (cropped, background-removed to your spec) and attached directly. One dependency: the custom attributes only appear in Cin7 if you\'ve created the "ShotSync Apparel" attribute set in your Cin7 account with matching field names. Without it, the product still creates but the attribute fields are silently dropped.',
      },
      {
        q: 'Why does ShotSync integrate with ERPs rather than marketplaces directly?',
        a: 'Most brands already have an ERP (like Cin7 or Apparel21) that distributes products to all their marketplaces — Shopify, THE ICONIC, ASOS, and others. By pushing enriched product clusters into the ERP, ShotSync becomes part of the brand\'s existing workflow rather than a parallel system.',
      },
    ],
  },
  {
    title: 'Exporting',
    items: [
      {
        q: 'What export options are available?',
        a: 'ZIP download (images named and organised per marketplace rules), direct push to Shopify, direct push to Cin7 Core, and THE ICONIC export. Select which confirmed clusters to include before exporting.',
      },
      {
        q: 'How are images named in the ZIP?',
        a: 'Images are named using your marketplace export rules. Each marketplace can have its own file naming template (e.g. {SKU}_{colour}_{angle}.jpg). Configure naming templates in Brand Settings → Marketplace Settings.',
      },
      {
        q: 'Can I export a subset of clusters?',
        a: 'Yes. In the Export panel on the Review page, you can select which confirmed clusters to include in the export. Unselected clusters are left unchanged.',
      },
      {
        q: 'How do marketplace category overrides work?',
        a: 'In Marketplace Settings, each marketplace can have category override rows — for example, Shopify might export Womens Dresses in a different angle order than the default. When a cluster has a matching garment category set, that override\'s angle sequence is used automatically at export time. The cluster\'s thumbnail labels stay as-is; only the output file order changes.',
      },
    ],
  },
  {
    title: 'AI Copy',
    items: [
      {
        q: 'What is AI Copy?',
        a: 'AI Copy generates SEO-ready product titles, descriptions, and bullet points for each cluster using the product metadata, style list entry, and your brand context. It runs automatically when you confirm a cluster.',
      },
      {
        q: 'Can I edit the AI-generated copy?',
        a: 'Yes. Click any copy field in the cluster editor to edit the title, description, or bullet points before exporting. Edits are saved with the cluster.',
      },
      {
        q: 'Does AI copy get included in exports?',
        a: 'Yes. When pushing to Shopify, the AI title becomes the product title and the description and bullet points populate the product body as HTML. When pushing to Cin7, the AI title becomes the product Name and the description and bullet points are written to the Description field as HTML — a paragraph followed by a bulleted list.',
      },
    ],
  },
]

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transition: 'transform 200ms', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

function AccordionItem({ qa }: { qa: QA }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="border-b last:border-0"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <button
        className="w-full flex items-center justify-between gap-3 py-3 text-left transition-colors"
        style={{ color: open ? 'var(--text)' : 'var(--text2)' }}
        onClick={() => setOpen(!open)}
      >
        <span className="text-[0.85rem] font-medium leading-snug">{qa.q}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <p className="text-[0.82rem] leading-relaxed pb-3" style={{ color: 'var(--text3)' }}>
          {qa.a}
        </p>
      )}
    </div>
  )
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <div className="mb-5">
      <h3
        className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-1"
        style={{ color: 'var(--accent)' }}
      >
        {section.title}
      </h3>
      <div
        className="rounded-[10px] px-4"
        style={{ background: 'var(--bg3)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {section.items.map((qa, i) => (
          <AccordionItem key={i} qa={qa} />
        ))}
      </div>
    </div>
  )
}

export function HelpModal() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    _openModal = () => setVisible(true)
    return () => { _openModal = null }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={() => setVisible(false)}
    >
      <div
        className="relative flex flex-col bg-[var(--bg2)] border border-[var(--line)] rounded-[14px] shadow-2xl max-w-[600px] w-full mx-4"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--line)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--text2)" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="7" />
                <path d="M8 11v-1a2 2 0 1 0-2-2" />
                <circle cx="8" cy="12.5" r="0.6" fill="var(--text2)" stroke="none" />
              </svg>
            </div>
            <div>
              <h2 className="text-[1rem] font-bold tracking-[-0.4px] text-[var(--text)]" style={{ fontFamily: 'var(--font-display)' }}>
                Help & FAQ
              </h2>
              <p className="text-[0.78rem] text-[var(--text3)]">Answers to common questions about ShotSync</p>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] transition-colors"
            style={{ color: 'var(--text3)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--text3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {SECTIONS.map((section) => (
            <SectionBlock key={section.title} section={section} />
          ))}
        </div>
      </div>
    </div>
  )
}
