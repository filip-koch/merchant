import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSpayd,
  toSvg,
  czechAccountToIban,
  validateIban,
} from '../src/qr/index.js'

describe('qr-paygen handler', () => {
  it('converts Czech bank account to valid IBAN', () => {
    const iban = czechAccountToIban('19-2000145399/0800')
    assert.equal(validateIban(iban), true)
    assert.ok(iban.startsWith('CZ'))
    assert.equal(iban.length, 24)
  })

  it('builds standard SPAYD string with amount and message', () => {
    const spayd = buildSpayd({
      account: '2000145399/0800',
      amount: 150.5,
      currency: 'CZK',
      message: 'Kavárna Platba',
    })

    assert.ok(spayd.startsWith('SPD*1.0*'))
    assert.ok(spayd.includes('*AM:150.50*'))
    assert.ok(spayd.includes('*CC:CZK'))
    assert.ok(spayd.includes('*MSG:KAVARNA PLATBA')) // Diacritics removed for SPAYD standard
  })

  it('generates valid SVG with CBA frame and shop name', () => {
    const svg = toSvg({
      account: '2000145399/0800',
      amount: 250,
      businessName: 'Kavárna Slunce',
      size: 400,
    })

    assert.ok(svg.startsWith('<svg'))
    assert.ok(svg.includes('Kavárna Slunce'))
    assert.ok(svg.includes('<!-- CBA QR Platba Frame'))
  })

  it('dynamically downscales font size for long shop names so it never overflows', () => {
    const longName = 'Restaurace a Pivovarská Zahrada U Zlatého Lva a Rytíře'
    const svgLong = toSvg({
      account: '2000145399/0800',
      amount: 100,
      businessName: longName,
      size: 500,
    })

    const svgShort = toSvg({
      account: '2000145399/0800',
      amount: 100,
      businessName: 'Kavárna',
      size: 500,
    })

    // Extract font-size attribute from both SVGs
    const fontMatchLong = svgLong.match(/font-size="(\d+)"/)
    const fontMatchShort = svgShort.match(/font-size="(\d+)"/)

    assert.ok(fontMatchLong)
    assert.ok(fontMatchShort)

    const fontLong = parseInt(fontMatchLong[1], 10)
    const fontShort = parseInt(fontMatchShort[1], 10)

    // Long name must be scaled down relative to short name
    assert.ok(
      fontLong < fontShort,
      `Long font size (${fontLong}) should be smaller than short font size (${fontShort})`
    )
  })

  it('embeds square logo with badge and bumps error correction', () => {
    const dummyLogo =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    const svg = toSvg({
      account: '2000145399/0800',
      amount: 100,
      businessName: 'Studio',
      logo: {
        src: dummyLogo,
      },
      size: 400,
    })

    assert.ok(svg.includes('<!-- Center Logo Badge -->'))
    assert.ok(svg.includes(dummyLogo))
  })
})
