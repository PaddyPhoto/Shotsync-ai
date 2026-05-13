export interface GarmentCategory {
  id: string
  label: string
}

export const GARMENT_CATEGORIES: GarmentCategory[] = [
  // Mens
  { id: 'mens-suits',     label: 'Mens Suits' },
  { id: 'mens-blazers',   label: 'Mens Blazers' },
  { id: 'mens-shirts',    label: 'Mens Shirts' },
  { id: 'mens-t-shirts',  label: 'Mens T-Shirts' },
  { id: 'mens-knitwear',  label: 'Mens Knitwear' },
  { id: 'mens-jackets',   label: 'Mens Jackets' },
  { id: 'mens-coats',     label: 'Mens Coats' },
  { id: 'mens-pants',     label: 'Mens Pants' },
  { id: 'mens-shorts',    label: 'Mens Shorts' },
  { id: 'mens-swimwear',  label: 'Mens Swimwear' },
  // Womens
  { id: 'womens-dresses',    label: 'Womens Dresses' },
  { id: 'womens-jumpsuits',  label: 'Womens Jumpsuits' },
  { id: 'womens-tops',       label: 'Womens Tops' },
  { id: 'womens-blouses',    label: 'Womens Blouses' },
  { id: 'womens-knitwear',   label: 'Womens Knitwear' },
  { id: 'womens-jackets',    label: 'Womens Jackets' },
  { id: 'womens-coats',      label: 'Womens Coats' },
  { id: 'womens-pants',      label: 'Womens Pants' },
  { id: 'womens-skirts',     label: 'Womens Skirts' },
  { id: 'womens-shorts',     label: 'Womens Shorts' },
  { id: 'womens-swimwear',   label: 'Womens Swimwear' },
  // Unisex / Other
  { id: 'unisex-activewear', label: 'Activewear' },
  { id: 'unisex-loungewear', label: 'Loungewear' },
  { id: 'unisex-sleepwear',  label: 'Sleepwear' },
]
