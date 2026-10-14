// scripts/brand/ico.cjs
'use strict'
// Fichier .ico Windows : chaque image est un PNG complet (accepté depuis Windows Vista).

function packIco(entries) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // réservé
  header.writeUInt16LE(1, 2) // type : icône
  header.writeUInt16LE(entries.length, 4)
  const dir = Buffer.alloc(16 * entries.length)
  let offset = 6 + 16 * entries.length
  entries.forEach((e, i) => {
    if (!(e.size >= 1 && e.size <= 256)) throw new Error(`Taille d’icône invalide : ${e.size}`)
    const b = i * 16
    dir.writeUInt8(e.size === 256 ? 0 : e.size, b) // 0 signifie 256
    dir.writeUInt8(e.size === 256 ? 0 : e.size, b + 1)
    dir.writeUInt8(0, b + 2) // pas de palette
    dir.writeUInt8(0, b + 3)
    dir.writeUInt16LE(1, b + 4) // plans
    dir.writeUInt16LE(32, b + 6) // bits par pixel
    dir.writeUInt32LE(e.png.length, b + 8)
    dir.writeUInt32LE(offset, b + 12)
    offset += e.png.length
  })
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)])
}

function readIcoDirectory(buf) {
  const out = []
  for (let i = 0; i < buf.readUInt16LE(4); i++) {
    const b = 6 + i * 16
    const w = buf.readUInt8(b)
    out.push({ size: w === 0 ? 256 : w, bytes: buf.readUInt32LE(b + 8), offset: buf.readUInt32LE(b + 12) })
  }
  return out
}

module.exports = { packIco, readIcoDirectory }
