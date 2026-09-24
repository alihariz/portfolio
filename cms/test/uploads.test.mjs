/**
 * Step 4: only real images can be uploaded, and what is stored is a clean
 * re-encode with no metadata, under a name that cannot collide.
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { startCms, multipart } from './helpers.mjs'

let cms
before(async () => { cms = await startCms({ mediaQuotaBytes: 400 * 1024 }) })
after(() => cms.close())

const image = (fmt, { width = 64, height = 48, exif } = {}) => {
  let s = sharp({ create: { width, height, channels: 3, background: { r: 198, g: 113, b: 57 } } })
  if (exif) s = s.withExif(exif)
  return s.toFormat(fmt).toBuffer()
}
// A noisy image does not compress away, so it can test quotas.
const noise = (width, height) => sharp(Buffer.from(Array.from({ length: width * height * 3 }, () => Math.floor(Math.random() * 256))), { raw: { width, height, channels: 3 } }).png().toBuffer()

const upload = async (files) => cms.call('POST', '/api/media', await multipart(files))
const mediaFiles = () => readdirSync(path.join(cms.contentDir, 'media')).sort()

test('PNG, JPEG, WebP and AVIF are accepted and stored as WebP', async () => {
  for (const fmt of ['png', 'jpeg', 'webp', 'avif']) {
    const r = await upload([{ name: `shot.${fmt}`, type: `image/${fmt}`, data: await image(fmt, { width: 70 + fmt.length }) }])
    assert.equal(r.status, 200, `${fmt}: ${r.json?.error}`)
    const [f] = r.json.files
    assert.match(f.name, /^[a-f0-9]{16}\.webp$/)
    assert.equal(f.url, `/media/${f.name}`)
    const meta = await sharp(readFileSync(path.join(cms.contentDir, 'media', f.name))).metadata()
    assert.equal(meta.format, 'webp')
  }
})

test('stored images carry no EXIF (phone photos include GPS)', async () => {
  const jpeg = await image('jpeg', { exif: { IFD0: { Copyright: 'SECRET-LOCATION', Artist: 'someone' } } })
  assert.ok((await sharp(jpeg).metadata()).exif, 'fixture really has EXIF')
  const r = await upload([{ name: 'phone.jpg', type: 'image/jpeg', data: jpeg }])
  const stored = readFileSync(path.join(cms.contentDir, 'media', r.json.files[0].name))
  assert.equal((await sharp(stored).metadata()).exif, undefined)
  assert.ok(!stored.includes('SECRET-LOCATION'))
})

test('wide images are scaled down to 2400px', async () => {
  const r = await upload([{ name: 'wide.png', type: 'image/png', data: await image('png', { width: 3000, height: 100 }) }])
  assert.equal(r.json.files[0].width, 2400)
})

test('HTML or script declared as an image is refused (was: stored and served as text/html)', async () => {
  const before = mediaFiles()
  for (const [name, type, data] of [
    ['Evil Page.HTML', 'image/png', '<html><script>alert(document.domain)</script></html>'],
    ['x.png', 'image/png', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'],
    ['x.js', 'image/jpeg', 'fetch("/api/content")'],
  ]) {
    const r = await upload([{ name, type, data: Buffer.from(data) }])
    assert.equal(r.status, 415, name)
    assert.match(r.json.error, /not a PNG, JPEG, WebP or AVIF/)
  }
  assert.deepEqual(mediaFiles(), before)
})

test('SVG is refused even when honestly labelled', async () => {
  const r = await upload([{ name: 'logo.svg', type: 'image/svg+xml', data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') }])
  assert.equal(r.status, 415)
})

test('a damaged image with a valid signature is refused cleanly', async () => {
  const png = await image('png')
  const r = await upload([{ name: 'broken.png', type: 'image/png', data: Buffer.concat([png.subarray(0, 40), Buffer.alloc(200)]) }])
  assert.equal(r.status, 415)
  assert.match(r.json.error, /could not be read/)
})

test('one bad file in a batch stores nothing from that batch', async () => {
  const before = mediaFiles()
  const r = await upload([
    { name: 'good.png', type: 'image/png', data: await image('png', { width: 91 }) },
    { name: 'bad.png', type: 'image/png', data: Buffer.from('<html>') },
  ])
  assert.equal(r.status, 415)
  assert.deepEqual(mediaFiles(), before)
})

test('two files with the same name in one upload no longer overwrite each other (L9)', async () => {
  const r = await upload([
    { name: 'photo.png', type: 'image/png', data: await image('png', { width: 101 }) },
    { name: 'photo.png', type: 'image/png', data: await image('png', { width: 102 }) },
  ])
  assert.equal(r.status, 200)
  const [a, b] = r.json.files
  assert.notEqual(a.name, b.name)
  assert.ok(mediaFiles().includes(a.name) && mediaFiles().includes(b.name))
})

test('uploading the same picture twice is a no-op, not a duplicate', async () => {
  const data = await image('png', { width: 111 })
  const one = await upload([{ name: 'a.png', type: 'image/png', data }])
  const count = mediaFiles().length
  const two = await upload([{ name: 'renamed.png', type: 'image/png', data }])
  assert.equal(two.json.files[0].name, one.json.files[0].name)
  assert.equal(mediaFiles().length, count)
})

test('limits: size, count, field name, and not-multipart are JSON errors (were HTML 500s)', async () => {
  const big = await upload([{ name: 'big.png', type: 'image/png', data: Buffer.alloc(9 * 1024 * 1024) }])
  assert.equal(big.status, 413)
  assert.match(big.headers['content-type'], /json/)
  const small = await image('png')
  const many = await upload(Array.from({ length: 11 }, (_, i) => ({ name: `${i}.png`, type: 'image/png', data: small })))
  assert.equal(many.status, 413)
  const field = await upload([{ field: 'other', name: 'a.png', type: 'image/png', data: small }])
  assert.equal(field.status, 400)
  const notMultipart = await cms.call('POST', '/api/media', { body: { files: [] } })
  assert.equal(notMultipart.status, 415)
  const empty = await cms.call('POST', '/api/media', await multipart([]))
  assert.equal(empty.status, 400)
})

test('the media quota is enforced', async () => {
  let last
  for (let i = 0; i < 12; i++) {
    last = await upload([{ name: `n${i}.png`, type: 'image/png', data: await noise(320, 320) }])
    if (last.status !== 200) break
  }
  assert.equal(last.status, 507)
  assert.match(last.json.error, /limit/)
})

test('an image still used by a document cannot be deleted by accident', async () => {
  const r = await upload([{ name: 'portrait.png', type: 'image/png', data: await image('png', { width: 121 }) }])
  const { name, url } = r.json.files[0]
  const cur = await cms.call('GET', '/api/content')
  cur.json.profile.portrait = url
  const saved = await cms.call('PUT', '/api/content', { body: cur.json, headers: { 'if-match': cur.headers.etag } })
  assert.equal(saved.status, 200)
  const del = await cms.call('DELETE', `/api/media/${name}`)
  assert.equal(del.status, 409)
  assert.deepEqual(del.json.usedBy, ['default'])
  const forced = await cms.call('DELETE', `/api/media/${name}?force=1`)
  assert.equal(forced.status, 200)
})

test('delete refuses anything that is not an image name', async () => {
  for (const name of ['..%2Fsite.json', '.staging', 'site.json', 'x.html']) {
    const r = await cms.call('DELETE', `/api/media/${name}`)
    assert.ok([400, 404].includes(r.status), `${name}: ${r.status}`)
  }
})

test('the editor serves only images from /media, sandboxed', async () => {
  const r = await upload([{ name: 'a.png', type: 'image/png', data: await image('png', { width: 131 }) }])
  const img = await cms.call('GET', r.json.files[0].url)
  assert.equal(img.status, 200)
  assert.equal(img.headers['content-type'], 'image/webp')
  assert.equal(img.headers['x-content-type-options'], 'nosniff')
  assert.match(img.headers['content-security-policy'], /sandbox/)
  // Even if something non-image got into the folder by other means:
  writeFileSync(path.join(cms.contentDir, 'media', 'planted.html'), '<script>alert(1)</script>')
  assert.equal((await cms.call('GET', '/media/planted.html')).status, 404)
})
