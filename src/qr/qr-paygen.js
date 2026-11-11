/**
 * qr-paygen - High quality Czech & Slovak SPAYD payment QR code generator.
 *
 * Renders the official CBA "QR Platba" frame with text break, auto-scaled shop name,
 * and optional center logo badge with adaptive error correction.
 *
 * @author Filip Koch
 * @license MIT
 */

import QRCode from 'qrcode'

// ============================================================================
// 1. HELPERS & UTILITIES
// ============================================================================

/**
 * Escapes special XML characters to prevent SVG injection vulnerabilities.
 * @param {string|number} str
 * @returns {string}
 */
export function escapeXml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Strips Czech, Slovak and European diacritics and converts to ASCII uppercase.
 * SPAYD specification allows only standard uppercase ASCII in text fields.
 * @param {string} str
 * @returns {string}
 */
export function removeDiacritics(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

/**
 * Validates an International Bank Account Number (IBAN) using ISO 7064 Mod 97-10.
 * @param {string} iban
 * @returns {boolean}
 */
export function validateIban(iban) {
  if (!iban || typeof iban !== 'string') return false
  const clean = iban.replace(/[\s-]/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(clean)) return false

  const rearranged = clean.slice(4) + clean.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (ch) =>
    String(ch.charCodeAt(0) - 55)
  )

  try {
    return BigInt(numeric) % 97n === 1n
  } catch {
    return false
  }
}

/**
 * Converts a Czech national bank account format to an international IBAN.
 * Accepts: "19-2000145399/0800", "2000145399/0800" or { prefix, number, bankCode }
 *
 * @param {string|object} account
 * @returns {string} Standard Czech IBAN (24 characters)
 */
export function czechAccountToIban(account) {
  let prefix
  let number
  let bankCode

  if (typeof account === 'string') {
    const trimmed = account.trim()
    const slashIdx = trimmed.indexOf('/')
    if (slashIdx === -1) {
      throw new Error(
        `Neplatný formát účtu "${account}". Očekáváno: [předčíslí-]číslo/kódBanky (např. 19-12345678/0800)`
      )
    }
    bankCode = trimmed.slice(slashIdx + 1).trim()
    const numPart = trimmed.slice(0, slashIdx).trim()

    const dashIdx = numPart.indexOf('-')
    if (dashIdx !== -1) {
      prefix = numPart.slice(0, dashIdx).trim()
      number = numPart.slice(dashIdx + 1).trim()
    } else {
      prefix = '0'
      number = numPart
    }
  } else if (account && typeof account === 'object') {
    prefix = String(account.prefix || '0').trim()
    number = String(account.number || '').trim()
    bankCode = String(account.bankCode || '').trim()
  } else {
    throw new Error('Český účet musí být řetězec nebo objekt.')
  }

  prefix = prefix.replace(/\D/g, '')
  number = number.replace(/\D/g, '')
  bankCode = bankCode.replace(/\D/g, '')

  if (prefix.length > 6) {
    throw new Error(`Předčíslí účtu nesmí mít více než 6 číslic: "${prefix}"`)
  }
  if (!number || number.length > 10) {
    throw new Error(`Číslo účtu musí mít 1 až 10 číslic: "${number}"`)
  }
  if (bankCode.length !== 4) {
    throw new Error(`Kód banky musí mít přesně 4 číslice: "${bankCode}"`)
  }

  const paddedPrefix = prefix.padStart(6, '0')
  const paddedNumber = number.padStart(10, '0')
  const bban = bankCode + paddedPrefix + paddedNumber

  // Country code CZ = C(12), Z(35) + '00' = 123500
  const bigNum = BigInt(bban + '123500')
  const mod = bigNum % 97n
  const checkDigits = (98n - mod).toString().padStart(2, '0')

  return `CZ${checkDigits}${bban}`
}

/**
 * Standard IEEE 802.3 32-bit Cyclic Redundancy Check (CRC-32) calculation.
 * @param {string} str
 * @returns {string}
 */
export function crc32(str) {
  let crc = 0 ^ -1
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ code) & 0xff]
  }
  return ((crc ^ -1) >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c
}

/**
 * Approximates text width in sans-serif / Arial / Helvetica bold.
 * Accurately sizes the gap in the bottom frame line.
 * @param {string} text
 * @param {number} fontSize
 * @returns {number}
 */
export function estimateTextWidth(text, fontSize) {
  if (!text) return 0
  let ems = 0
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (
      ch === ' ' ||
      ch === 'i' ||
      ch === 'l' ||
      ch === 'I' ||
      ch === '.' ||
      ch === ',' ||
      ch === ':'
    ) {
      ems += 0.32
    } else if (ch === 'M' || ch === 'W' || ch === 'm' || ch === 'w') {
      ems += 0.95
    } else if (ch >= 'A' && ch <= 'Z') {
      ems += 0.72
    } else if (ch >= '0' && ch <= '9') {
      ems += 0.62
    } else {
      ems += 0.55
    }
  }
  return ems * fontSize
}

// ============================================================================
// 2. SPAYD STRING BUILDER (ČBA Standard 1.0)
// ============================================================================

/**
 * Builds a validated SPAYD (Short Payment Descriptor) string according to ČBA specifications.
 *
 * @param {object|string} options
 * @returns {string} Standard SPAYD string
 */
export function buildSpayd(options) {
  if (typeof options === 'string') {
    const trimmed = options.trim()
    if (trimmed.startsWith('SPD*1.0*')) return trimmed
    throw new Error('Raw SPAYD řetězec musí začínat "SPD*1.0*"')
  }

  if (!options || typeof options !== 'object') {
    throw new Error('buildSpayd očekává objekt s konfigurací platby.')
  }

  // 1. Resolve IBAN & BIC
  let iban = options.iban || options.IBAN
  if (!iban && options.account) {
    iban = czechAccountToIban(options.account)
  }

  if (!iban) {
    throw new Error(
      'Chybí číslo účtu. Zadejte "iban" nebo "account" (např. 19-12345678/0800).'
    )
  }

  iban = iban.replace(/[\s-]/g, '').toUpperCase()
  if (!validateIban(iban)) {
    throw new Error(`Neplatný IBAN: "${iban}".`)
  }

  let accValue = iban
  const bic = options.bic || options.BIC || options.swift || options.SWIFT
  if (bic) {
    const cleanBic = bic.replace(/[\s-]/g, '').toUpperCase()
    if (/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic)) {
      accValue += `+${cleanBic}`
    }
  }

  const parts = ['SPD*1.0', `ACC:${accValue}`]

  // 2. Amount & Currency
  const amount = options.amount ?? options.am
  if (amount !== undefined && amount !== null && amount !== '') {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
    if (isNaN(num) || num <= 0) {
      throw new Error(`Neplatná částka platby: "${amount}"`)
    }
    parts.push(`AM:${num.toFixed(2)}`)
  }

  const currency = (options.currency || options.cc || 'CZK').toUpperCase()
  parts.push(`CC:${currency}`)

  // 3. Variable Symbol (VS: max 10 digits)
  const vs = options.vs || options.variableSymbol
  if (vs !== undefined && vs !== null && vs !== '') {
    const vsStr = String(vs).replace(/\D/g, '')
    if (vsStr.length > 0 && vsStr.length <= 10) {
      parts.push(`X-VS:${vsStr}`)
    }
  }

  // 4. Specific Symbol (SS: max 10 digits)
  const ss = options.ss || options.specificSymbol
  if (ss !== undefined && ss !== null && ss !== '') {
    const ssStr = String(ss).replace(/\D/g, '')
    if (ssStr.length > 0 && ssStr.length <= 10) {
      parts.push(`X-SS:${ssStr}`)
    }
  }

  // 5. Constant Symbol (KS: max 4 digits)
  const ks = options.ks || options.constantSymbol
  if (ks !== undefined && ks !== null && ks !== '') {
    const ksStr = String(ks).replace(/\D/g, '')
    if (ksStr.length > 0 && ksStr.length <= 4) {
      parts.push(`X-KS:${ksStr}`)
    }
  }

  // 6. Message for recipient (MSG: max 60 chars, ASCII uppercase without diacritics)
  const msg = options.message ?? options.msg
  if (msg !== undefined && msg !== null && msg !== '') {
    let cleanMsg = removeDiacritics(String(msg))
      .replace(/[*%]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleanMsg.length > 60) {
      cleanMsg = cleanMsg.slice(0, 60).trim()
    }
    if (cleanMsg.length > 0) {
      parts.push(`MSG:${cleanMsg}`)
    }
  }

  // 7. Recipient Name (RN: max 35 chars, ASCII uppercase)
  const rn = options.recipientName ?? options.recipient ?? options.rn
  if (rn !== undefined && rn !== null && rn !== '') {
    let cleanRn = removeDiacritics(String(rn))
      .replace(/[*%]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (cleanRn.length > 35) {
      cleanRn = cleanRn.slice(0, 35).trim()
    }
    if (cleanRn.length > 0) {
      parts.push(`RN:${cleanRn}`)
    }
  }

  let spaydString = parts.join('*')

  if (options.includeCrc32 || options.crc32) {
    const hash = crc32(spaydString + '*')
    spaydString += `*CRC32:${hash}`
  }

  return spaydString
}

// ============================================================================
// 3. SVG BUILDER WITH DYNAMIC AUTO-SCALED FRAME & CENTER LOGO
// ============================================================================

/**
 * Resolves a logo source into an SVG-embeddable representation.
 * @param {object|string} logoOpt
 * @returns {{ href?: string, rawSvg?: string } | null}
 */
function resolveLogoAsset(logoOpt) {
  if (!logoOpt) return null
  const src = typeof logoOpt === 'object' && logoOpt.src ? logoOpt.src : logoOpt

  if (typeof src === 'string') {
    const trimmed = src.trim()
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
      return { href: trimmed }
    }
    if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
      return { rawSvg: trimmed }
    }
  }

  return null
}

/**
 * Generates the complete SVG string for the payment QR code.
 * Implements the authentic CBA "QR Platba" frame with a text gap,
 * dynamic proportional text scaling for the shop name, and square center logo.
 *
 * @param {object} options
 * @returns {string} XML SVG string
 */
export function generateSvg(options) {
  const spaydString = buildSpayd(options)

  const canvasSize = Math.max(100, options.size || 500)
  const bgColor = options.backgroundColor ?? '#ffffff'

  // Frame settings
  const frameOpt = options.frame ?? {}
  const showFrame = frameOpt.show !== false
  const frameColor = frameOpt.color || '#09090b'
  const strokeWidth =
    frameOpt.strokeWidth !== undefined
      ? frameOpt.strokeWidth
      : Math.max(2, Math.round(canvasSize * 0.005 * 10) / 10)

  // Use businessName or custom frame text
  const rawFrameText =
    frameOpt.text !== undefined
      ? frameOpt.text
      : options.businessName || 'QR Platba'
  const hasFrameText =
    showFrame && rawFrameText && String(rawFrameText).trim().length > 0

  const textColor = frameOpt.textColor || frameColor
  const fontFamily =
    frameOpt.fontFamily ||
    'Outfit, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  const fontWeight = frameOpt.fontWeight || '700'

  // Margins and paddings
  const outerMargin =
    options.margin !== undefined
      ? options.margin
      : Math.round(canvasSize * 0.095)
  const frameSize = canvasSize - outerMargin * 2
  const frameX = outerMargin
  const frameY = outerMargin

  const qrPadding =
    options.qr?.padding !== undefined
      ? options.qr.padding
      : Math.round(canvasSize * 0.09)
  const qrSize = Math.max(50, frameSize - qrPadding * 2)
  const qrX = frameX + qrPadding
  const qrY = frameY + qrPadding

  // Logo settings
  const logoOpt = options.logo
  const logoAsset = logoOpt ? resolveLogoAsset(logoOpt) : null
  const hasLogo = Boolean(logoAsset)

  // QR error correction: default to 'M' (15%), or 'Q' (25%) / 'H' (30%) if logo is present
  const ecl = options.qr?.errorCorrectionLevel || (hasLogo ? 'Q' : 'M')

  // Generate QR matrix
  const qrData = QRCode.create(spaydString, { errorCorrectionLevel: ecl })
  const moduleCount = qrData.modules.size
  const moduleSize = qrSize / moduleCount

  const darkColor = options.qr?.color?.dark || '#09090b'

  // Build SVG path for dark modules
  let qrPath = ''
  for (let r = 0; r < moduleCount; r++) {
    for (let c = 0; c < moduleCount; c++) {
      if (qrData.modules.get(r, c)) {
        const x = qrX + c * moduleSize
        const y = qrY + r * moduleSize
        qrPath += `M${x.toFixed(2)},${y.toFixed(2)}h${(moduleSize + 0.04).toFixed(2)}v${(moduleSize + 0.04).toFixed(2)}h-${(moduleSize + 0.04).toFixed(2)}z `
      }
    }
  }

  // Compute frame path with dynamic auto-scaling text
  let frameSvg = ''
  if (showFrame) {
    const pTopLeftX = frameX
    const pTopLeftY = frameY
    const pTopRightX = frameX + frameSize
    const pTopRightY = frameY
    const pBottomRightX = frameX + frameSize
    const pBottomRightY = frameY + frameSize
    const pBottomLeftX = frameX
    const pBottomLeftY = frameY + frameSize

    if (hasFrameText) {
      let frameText = String(rawFrameText).trim()

      const textOffset =
        frameOpt.textOffset !== undefined
          ? frameOpt.textOffset
          : Math.round(frameSize * 0.075)

      // Minimum right stub on the bottom line to maintain the corner
      const minRightStub = Math.max(16, Math.round(frameSize * 0.075))
      const maxAllowedSpan = frameSize - textOffset - minRightStub

      // Base font size
      const baseFontSize = frameOpt.fontSize || Math.round(canvasSize * 0.065) // ~32px on 500px canvas
      const minFontSize = Math.max(10, Math.round(canvasSize * 0.034)) // ~17px minimum

      // Estimate ems per char
      const ems = estimateTextWidth(frameText, 1)
      const requiredSpanAtBase = baseFontSize * (ems + 0.56)

      let fontSize = baseFontSize

      // DYNAMIC PROPORTIONAL AUTO-SCALING
      if (requiredSpanAtBase > maxAllowedSpan) {
        const scaledFontSize = Math.floor(maxAllowedSpan / (ems + 0.56))
        if (scaledFontSize >= minFontSize) {
          fontSize = scaledFontSize
        } else {
          // If even at minFontSize it doesn't fit, clamp font size and truncate with ellipsis
          fontSize = minFontSize
          const ellipsisWidth = estimateTextWidth('…', fontSize)
          const allowedTextWidth =
            maxAllowedSpan - 2 * Math.round(fontSize * 0.28) - ellipsisWidth

          while (
            frameText.length > 2 &&
            estimateTextWidth(frameText, fontSize) > allowedTextWidth
          ) {
            frameText = frameText.slice(0, -1).trim()
          }
          frameText += '…'
        }
      }

      const textGap = Math.round(fontSize * 0.26)
      const textWidth = estimateTextWidth(frameText, fontSize)

      const p1x = pBottomLeftX
      const p1y = pBottomLeftY
      const p2x = pBottomLeftX + textOffset
      const p2y = pBottomLeftY

      const textX = p2x + textGap
      const textY = pBottomLeftY + Math.round(fontSize * 0.22)

      const p3x = textX + textWidth + textGap
      const p3y = pBottomLeftY
      const p4x = pBottomRightX
      const p4y = pBottomRightY

      // Draw border as two connected segments leaving an exact gap for the text
      const pathD = `M ${p3x} ${p3y} L ${p4x} ${p4y} L ${pTopRightX} ${pTopRightY} L ${pTopLeftX} ${pTopLeftY} L ${p1x} ${p1y} L ${p2x} ${p2y}`

      frameSvg = `
    <!-- CBA QR Platba Frame with Scaled Shop Name -->
    <path d="${pathD}" fill="none" stroke="${escapeXml(frameColor)}" stroke-width="${strokeWidth}" stroke-linecap="square" />
    <text x="${textX}" y="${textY}" font-family="${escapeXml(fontFamily)}" font-size="${fontSize}" font-weight="${escapeXml(fontWeight)}" fill="${escapeXml(textColor)}">${escapeXml(frameText)}</text>`
    } else {
      frameSvg = `
    <!-- Solid Frame -->
    <rect x="${frameX}" y="${frameY}" width="${frameSize}" height="${frameSize}" fill="none" stroke="${escapeXml(frameColor)}" stroke-width="${strokeWidth}" />`
    }
  }

  // Build center logo badge if present
  let logoSvg = ''
  if (hasLogo && logoAsset) {
    const rawLogoSize = logoOpt.size || 0.22
    const logoPx =
      rawLogoSize <= 1
        ? qrSize * rawLogoSize
        : Math.min(rawLogoSize, qrSize * 0.35)

    const logoBgColor =
      typeof logoOpt.background === 'string' ? logoOpt.background : '#ffffff'
    const logoPadding =
      logoOpt.backgroundPadding !== undefined
        ? logoOpt.backgroundPadding
        : Math.round(logoPx * 0.12)
    const borderRadius =
      logoOpt.borderRadius !== undefined
        ? logoOpt.borderRadius
        : Math.round(logoPx * 0.2)

    const centerX = qrX + qrSize / 2
    const centerY = qrY + qrSize / 2
    const bgTotalSize = logoPx + logoPadding * 2
    const bgX = centerX - bgTotalSize / 2
    const bgY = centerY - bgTotalSize / 2
    const imgX = centerX - logoPx / 2
    const imgY = centerY - logoPx / 2

    // Nested square badge with hairline border for crisp aesthetics
    const badgeSvg = `<rect x="${bgX.toFixed(2)}" y="${bgY.toFixed(2)}" width="${bgTotalSize.toFixed(2)}" height="${bgTotalSize.toFixed(2)}" rx="${borderRadius}" ry="${borderRadius}" fill="${escapeXml(logoBgColor)}" stroke="#e4e4e7" stroke-width="1.2" />`

    let assetSvg = ''
    if (logoAsset.href) {
      assetSvg = `<image href="${logoAsset.href}" x="${imgX.toFixed(2)}" y="${imgY.toFixed(2)}" width="${logoPx.toFixed(2)}" height="${logoPx.toFixed(2)}" preserveAspectRatio="xMidYMid meet" />`
    } else if (logoAsset.rawSvg) {
      assetSvg = `<svg x="${imgX.toFixed(2)}" y="${imgY.toFixed(2)}" width="${logoPx.toFixed(2)}" height="${logoPx.toFixed(2)}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${logoAsset.rawSvg}</svg>`
    }

    logoSvg = `
    <!-- Center Logo Badge -->
    ${badgeSvg}
    ${assetSvg}`
  }

  const canvasBgSvg =
    bgColor && bgColor !== 'transparent'
      ? `<rect width="100%" height="100%" fill="${escapeXml(bgColor)}" />`
      : ''

  return `<svg width="${canvasSize}" height="${canvasSize}" viewBox="0 0 ${canvasSize} ${canvasSize}" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
  ${canvasBgSvg}
  <!-- QR Code Modules -->
  <path d="${qrPath.trim()}" fill="${escapeXml(darkColor)}" />
  ${frameSvg}
  ${logoSvg}
</svg>`
}

/**
 * Generates an SVG string representation of the payment QR code.
 *
 * @param {object} options
 * @returns {string} SVG XML markup
 */
export function toSvg(options = {}) {
  return generateSvg(options)
}

/**
 * Generates a Data URL representation (SVG data URL or Canvas PNG in browser).
 *
 * @param {object} options
 * @returns {Promise<string>}
 */
export async function toDataUrl(options = {}) {
  const svg = generateSvg(options)
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export default {
  generateSvg,
  toSvg,
  toDataUrl,
  buildSpayd,
  czechAccountToIban,
  validateIban,
  removeDiacritics,
}
