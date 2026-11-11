/**
 * QR Module Entry Point
 * Exports the QR payment generator, SPAYD builder, and logo processor.
 */

export {
  generateSvg,
  toSvg,
  toDataUrl,
  buildSpayd,
  czechAccountToIban,
  validateIban,
  removeDiacritics,
  estimateTextWidth,
  escapeXml,
} from './qr-paygen.js'

export { processAndSquareLogo } from './logoProcessor.js'
