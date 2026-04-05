import type { ViewLabel } from '@/types'

export interface AccessoryCategory {
  id: string
  label: string
  angles: ViewLabel[]          // standard angle sequence
  defaultCount: number         // default images per look
  angleDisplayNames?: Partial<Record<ViewLabel, string>>  // override label in UI
}

export const ACCESSORY_CATEGORIES: AccessoryCategory[] = [
  {
    id: 'bags',
    label: 'Bags & Handbags',
    angles: ['front', 'side', 'detail', 'back', 'inside'],
    defaultCount: 5,
  },
  {
    id: 'shoes',
    label: 'Shoes & Footwear',
    angles: ['front', 'side', 'back', 'detail', 'top-down'],
    defaultCount: 5,
  },
  {
    id: 'ties',
    label: 'Ties & Neckwear',
    angles: ['front', 'detail', 'back'],
    defaultCount: 3,
  },
  {
    id: 'caps',
    label: 'Caps & Hats',
    angles: ['front-3/4', 'back-3/4'],
    defaultCount: 2,
  },
  {
    id: 'jewellery',
    label: 'Jewellery',
    angles: ['front', 'back'],
    defaultCount: 2,
    angleDisplayNames: { front: 'Shot 1', back: 'Shot 2' },
  },
  {
    id: 'scarves',
    label: 'Scarves',
    angles: ['top-down', 'detail'],
    defaultCount: 2,
    angleDisplayNames: { 'top-down': 'Top-down', detail: 'Fabric Detail' },
  },
  {
    id: 'belts',
    label: 'Belts',
    angles: ['front', 'detail'],
    defaultCount: 2,
    angleDisplayNames: { front: 'Front Full', detail: 'Buckle Detail' },
  },
  {
    id: 'socks',
    label: 'Socks & Hosiery',
    angles: ['top-down', 'detail'],
    defaultCount: 2,
    angleDisplayNames: { 'top-down': 'Top-down Full', detail: 'Detail' },
  },
  {
    id: 'sunglasses',
    label: 'Sunglasses & Eyewear',
    angles: ['front', 'side', 'front-3/4', 'top-down', 'detail', 'back'],
    defaultCount: 6,
  },
]

export function getCategoryById(id: string): AccessoryCategory | undefined {
  return ACCESSORY_CATEGORIES.find((c) => c.id === id)
}

export function getAngleDisplayName(category: AccessoryCategory | undefined, angle: ViewLabel): string {
  return category?.angleDisplayNames?.[angle] ?? angle
}
