/**
 * Client-side utility for processing and squaring merchant logos.
 * Converts uploaded images to an optimized 1:1 square format for QR code embedding.
 */

/**
 * Loads an image from a File, Blob, or Data URL.
 *
 * @param {File|Blob|string} source
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(source) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') {
      return reject(new Error('Image is not supported in this environment.'))
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Nepodařilo se načíst obrázek loga.'))

    if (typeof source === 'string') {
      img.src = source
    } else if (source instanceof Blob) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          img.src = e.target.result
        } else {
          reject(new Error('Nepodařilo se přečíst soubor loga.'))
        }
      }
      reader.onerror = () => reject(new Error('Chyba při čtení souboru.'))
      reader.readAsDataURL(source)
    } else {
      reject(new Error('Neplatný zdroj obrázku.'))
    }
  })
}

/**
 * Processes any uploaded image into a clean, centered 1:1 square format.
 * Scales the image to targetSize (default 256x256) and returns an optimized base64 Data URL.
 *
 * @param {File|Blob|string} source - Image source (file, blob, or data url)
 * @param {number} [targetSize=256] - Width and height of the resulting square image
 * @returns {Promise<string>} Base64 Data URL
 */
export async function processAndSquareLogo(source, targetSize = 256) {
  if (typeof document === 'undefined') {
    // If running in non-browser environment
    if (typeof source === 'string') return source
    return ''
  }

  const img = await loadImage(source)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height

  if (!w || !h) {
    throw new Error('Neplatné rozměry obrázku loga.')
  }

  // Calculate center 1:1 square crop
  const cropSize = Math.min(w, h)
  const sx = Math.floor((w - cropSize) / 2)
  const sy = Math.floor((h - cropSize) / 2)

  const canvas = document.createElement('canvas')
  canvas.width = targetSize
  canvas.height = targetSize

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context není k dispozici.')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Clear canvas (preserves alpha channel for transparent logos)
  ctx.clearRect(0, 0, targetSize, targetSize)

  // Draw 1:1 cropped square image
  ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, targetSize, targetSize)

  // Try exporting as webp with high quality, fallback to png
  try {
    const webpUrl = canvas.toDataURL('image/webp', 0.92)
    if (webpUrl.startsWith('data:image/webp')) {
      return webpUrl
    }
  } catch {
    // Fallback below
  }

  return canvas.toDataURL('image/png')
}
