import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const svgPath = 'public/icon.svg'
const publicDir = 'public'

async function generate() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  // Regular icon 192x192
  await sharp(svgPath)
    .resize(192, 192)
    .toFile(path.join(publicDir, 'icon-192.png'))

  // Regular icon 512x512
  await sharp(svgPath)
    .resize(512, 512)
    .toFile(path.join(publicDir, 'icon-512.png'))

  // Maskable 192x192 (safe zone resize + background fill)
  const maskable192Buffer = await sharp(svgPath)
    .resize(Math.round(192 * 0.8), Math.round(192 * 0.8))
    .toBuffer()

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 18, g: 18, b: 18, alpha: 1 }, // #121212
    },
  })
    .composite([{ input: maskable192Buffer }])
    .toFile(path.join(publicDir, 'icon-maskable-192.png'))

  // Maskable 512x512 (safe zone resize + background fill)
  const maskable512Buffer = await sharp(svgPath)
    .resize(Math.round(512 * 0.8), Math.round(512 * 0.8))
    .toBuffer()

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 18, g: 18, b: 18, alpha: 1 }, // #121212
    },
  })
    .composite([{ input: maskable512Buffer }])
    .toFile(path.join(publicDir, 'icon-maskable-512.png'))

  console.log('All PWA icons generated successfully!')
}

generate().catch(console.error)
