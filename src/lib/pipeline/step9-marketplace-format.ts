/**
 * Step 9: Resize and crop images for each marketplace
 * Uses Sharp for image processing.
 */
import type { MarketplaceName } from '@/types'
import { MARKETPLACE_RULES } from '@/lib/marketplace/rules'

export interface FormattedImage {
  buffer: Buffer
  filename: string
  marketplace: MarketplaceName
  contentType: string
}

export async function formatImageForMarketplace(
  inputBuffer: Buffer,
  originalFilename: string,
  marketplace: MarketplaceName,
  renamedFilename?: string
): Promise<FormattedImage> {
  const sharp = (await import('sharp')).default
  const rule = MARKETPLACE_RULES[marketplace]
  const { width, height } = rule.image_dimensions

  // Centre crop to target aspect ratio, then resize
  const processed = await sharp(inputBuffer)
    .resize(width, height, {
      fit: 'cover',
      position: 'centre',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: rule.background_color })
    .jpeg({ quality: rule.quality })
    .toBuffer()

  const baseFilename = renamedFilename ?? originalFilename
  const filename = baseFilename.replace(/\.(jpg|jpeg|png|webp)$/i, '.jpg')

  return {
    buffer: processed,
    filename,
    marketplace,
    contentType: 'image/jpeg',
  }
}

export async function formatImagesForAllMarketplaces(
  imageBuffer: Buffer,
  originalFilename: string,
  marketplaces: MarketplaceName[],
  renamedFilename?: string
): Promise<FormattedImage[]> {
  return Promise.all(
    marketplaces.map((m) =>
      formatImageForMarketplace(imageBuffer, originalFilename, m, renamedFilename)
    )
  )
}
