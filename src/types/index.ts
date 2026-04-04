// ─── Core Domain Types ────────────────────────────────────────────────────────

export type ViewLabel = 'front' | 'back' | 'side' | 'detail' | 'mood' | 'full-length' | 'ghost-mannequin' | 'flat-lay' | 'unknown'
export type JobStatus =
  | 'uploading'
  | 'processing'
  | 'grouping'
  | 'matching'
  | 'review'
  | 'exporting'
  | 'complete'
  | 'error'
export type ClusterStatus = 'pending' | 'confirmed' | 'exported'
export type MarketplaceName = 'the-iconic' | 'myer' | 'david-jones' | 'shopify'

// ─── Image ───────────────────────────────────────────────────────────────────

export interface Image {
  id: string
  job_id: string
  original_filename: string
  storage_path: string
  storage_url: string
  embedding_vector: number[] | null
  cluster_id: string | null
  view_label: ViewLabel
  view_confidence: number
  renamed_filename: string | null
  file_size: number
  width: number | null
  height: number | null
  status: 'uploaded' | 'processing' | 'clustered' | 'labeled' | 'renamed'
  created_at: string
}

// ─── Cluster ─────────────────────────────────────────────────────────────────

export interface Cluster {
  id: string
  job_id: string
  images: Image[]
  assigned_sku: string | null
  assigned_product_name: string | null
  suggested_skus: SKUSuggestion[]
  missing_views: ViewLabel[]
  detected_views: ViewLabel[]
  brand: string | null
  color: string | null
  status: ClusterStatus
  image_count: number
  created_at: string
}

// ─── SKU ─────────────────────────────────────────────────────────────────────

export interface SKU {
  sku: string
  product_name: string
  colour: string | null
  variants: SKUVariant[]
  shopify_product_id: string
  shopify_handle: string
  image_url: string | null
}

export interface SKUVariant {
  id: string
  title: string
  sku: string
  price: string
}

export interface SKUSuggestion {
  sku: string
  product_name: string
  colour: string | null
  confidence: number
  shopify_product_id: string
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

export interface MarketplaceRule {
  id: MarketplaceName
  name: string
  required_views: ViewLabel[]
  image_dimensions: { width: number; height: number }
  crop_style: 'center' | 'smart'
  file_format: 'jpg' | 'png'
  quality: number
  max_file_size_kb: number
  background_color: string
  naming_template: string
  naming_locked?: boolean   // true = retailer-mandated format, cannot be overridden by user
}

// ─── Export ───────────────────────────────────────────────────────────────────

export interface ExportRecord {
  id: string
  job_id: string
  cluster_id: string | null
  marketplace: MarketplaceName
  output_files: ExportFile[]
  download_url: string | null
  file_size_bytes: number
  image_count: number
  status: 'pending' | 'processing' | 'ready' | 'error'
  created_at: string
}

export interface ExportFile {
  filename: string
  storage_path: string
  marketplace: MarketplaceName
  cluster_id: string
  view_label: ViewLabel
  dimensions: { width: number; height: number }
}

// ─── Job ─────────────────────────────────────────────────────────────────────

export interface Job {
  id: string
  user_id: string
  name: string
  status: JobStatus
  pipeline_step: number
  total_images: number
  processed_images: number
  cluster_count: number
  error_message: string | null
  shopify_connected: boolean
  selected_marketplaces: MarketplaceName[]
  brand_name: string | null
  created_at: string
  updated_at: string
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export interface PipelineStep {
  step: number
  name: string
  description: string
  status: 'pending' | 'active' | 'done' | 'error'
  duration_ms?: number
  progress?: number
}

export const PIPELINE_STEPS: Omit<PipelineStep, 'status'>[] = [
  { step: 1, name: 'Store Images', description: 'Uploading to cloud storage' },
  { step: 2, name: 'Generate Embeddings', description: 'AI feature extraction' },
  { step: 3, name: 'Cluster Images', description: 'Grouping similar products' },
  { step: 4, name: 'Create Clusters', description: 'Building SKU candidate groups' },
  { step: 5, name: 'Shopify Match', description: 'Matching products from store' },
  { step: 6, name: 'Angle Detection', description: 'Classifying front/back/detail' },
  { step: 7, name: 'Validate Shots', description: 'Checking required angles' },
  { step: 8, name: 'Auto Rename', description: 'Applying naming conventions' },
  { step: 9, name: 'Format for Markets', description: 'Resizing & cropping' },
  { step: 10, name: 'Generate Exports', description: 'Building ZIP packages' },
]

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface UploadResponse {
  job_id: string
  uploaded_count: number
  failed_count: number
}
