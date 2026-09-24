/* ────────────────────────────────────────────────────────────────────────
   A generic editor. Rather than hand-writing a form for each section type,
   fields are derived from the data — so adding a key to a project in the JSON
   makes an input appear here with no code change.

   What it now asks of the shared schema (/lib/validate-site.mjs):
   - validateSite: checked before anything is sent, with the same rules the
     server and CI apply, so problems show here instead of as a failed save;
   - listKind: whether a list holds text or groups, from the schema rather
     than from what is in it now — an emptied list used to turn into a list
     of text and corrupt the document;
   - itemTemplate: the fields a new entry needs, instead of an empty {}.

   Every change sends X-CMS and the version it edited (If-Match); see the
   server's README for why.
   ──────────────────────────────────────────────────────────────────────── */
import { validateSite, formatIssues, listKind, itemTemplate } from '/lib/validate-site.mjs'

let doc = null // the document being edited
let etag = null // the version of it the server gave us
let selected = 'profile' // 'profile' | section id
let dirty = false
// Which entries are expanded, by object identity, so deleting or reordering
// one entry doesn't collapse everything around it on the next render.
let openItems = new WeakSet()
let focusAfterRender = null

const $ = (s) => document.querySelector(s)
const el = (tag, props = {}, kids = []) => {
  const n = Object.assign(document.createElement(tag), props)
  for (const k of [].concat(kids)) n.append(k)
  return n
}

function toast(msg, isError) {
  const t = el('div', { className: 'toast' + (isError ? ' err' : ''), textContent: msg, role: isError ? 'alert' : 'status' })
  document.body.append(t)
  setTimeout(() => t.remove(), isError ? 8000 : 2600)
}

function setDirty(v) {
  dirty = v
  $('#status').textContent = v ? 'unsaved changes' : 'saved'
}

window.addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault() })

/* ── Problems panel ─────────────────────────────────────────────────────── */

/** Show validation problems; clicking one opens the section it is in. */
function showIssues(errors = [], warnings = [], title) {
  const box = $('#issues')
  box.textContent = ''
  if (!errors.length && !warnings.length && !title) { box.hidden = true; return }
  box.hidden = false
  box.append(el('div', { className: 'row' }, [
    el('strong', { textContent: title || (errors.length ? `Not saved — ${errors.length} problem${errors.length === 1 ? '' : 's'} to fix` : 'Saved, with notes') }),
    el('span', { className: 'grow' }),
    Object.assign(el('button', { className: 'icon', textContent: '✕', title: 'Dismiss' }), { onclick: () => { box.hidden = true } }),
  ]))
  const list = el('ul')
  const item = (text, cls) => {
    const li = el('li', { className: cls, textContent: text })
    const m = text.match(/^\$\.sections\[(\d+)\]/)
    const section = m && doc?.sections?.[Number(m[1])]
    if (section) {
      li.tabIndex = 0
      li.title = 'Open this section'
      li.onclick = li.onkeydown = (e) => {
        if (e.type === 'keydown' && e.key !== 'Enter') return
        selected = section.id
        render()
      }
    } else if (text.startsWith('$.profile') || text.startsWith('$.meta')) {
      li.tabIndex = 0
      li.onclick = () => { selected = 'profile'; render() }
    }
    list.append(li)
  }
  for (const e of errors) item(e, 'err')
  for (const w of warnings) item(w, 'warn')
  box.append(list)
}

/* ── Field rendering ─────────────────────────────────────────────────────── */

const LONG = 90
const label = (k) => k.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

/**
 * @param ctx {type, path} — the section type and the key path from the
 *   section (e.g. ['items', 'accomplishments']), so lists can be typed from
 *   the schema. Null for profile/meta.
 */
function field(obj, key, onChange, ctx = null) {
  const val = obj[key]
  const here = ctx ? { type: ctx.type, path: [...ctx.path, key] } : null
  const id = `f-${Math.random().toString(36).slice(2, 9)}`
  const labelled = (text, input) => {
    input.id = id
    return el('div', { className: 'field' }, [el('label', { htmlFor: id, textContent: text }), input])
  }

  if (typeof val === 'boolean') {
    const cb = el('input', { type: 'checkbox', checked: val, style: 'width:auto' })
    cb.onchange = () => { obj[key] = cb.checked; onChange() }
    return labelled(label(key), cb)
  }

  if (typeof val === 'number') {
    const inp = el('input', { type: 'number', value: String(val) })
    inp.oninput = () => { obj[key] = inp.value === '' ? null : Number(inp.value); onChange() }
    return labelled(label(key), inp)
  }

  if (Array.isArray(val)) {
    const kind = here ? listKind(here.type, here.path) : undefined
    const strings = kind === 'strings' || (kind === undefined && val.every((v) => typeof v === 'string'))
    if (strings) {
      // Lists of text edit far better as one per line than as a pile of inputs.
      const ta = el('textarea', { value: val.join('\n') })
      ta.oninput = () => { obj[key] = ta.value.split('\n').map((s) => s.trim()).filter(Boolean); onChange() }
      return labelled(label(key) + ' — one per line', ta)
    }
    return objectList(val, label(key), onChange, here)
  }

  if (val && typeof val === 'object') {
    const fs = el('fieldset', {}, [el('legend', { textContent: label(key) })])
    for (const k of Object.keys(val)) fs.append(field(val, k, onChange, here))
    return fs
  }

  const str = val == null ? '' : String(val)
  const node = str.length > LONG || str.includes('\n')
    ? el('textarea', { value: str })
    : el('input', { type: 'text', value: str })
  node.oninput = () => { obj[key] = node.value; onChange() }
  return labelled(label(key), node)
}

function titleOf(item, i) {
  if (!item || typeof item !== 'object') return `Item ${i + 1}`
  return item.title || item.name || item.position || item.degree || item.category || item.value || item.label || `Item ${i + 1}`
}

/** A blank entry shaped like the last one, or from the schema if the list is empty. */
function newEntry(arr, ctx) {
  const last = arr[arr.length - 1]
  if (!last || typeof last !== 'object') return ctx ? itemTemplate(ctx.type, ctx.path) : {}
  const blank = JSON.parse(JSON.stringify(last))
  const wipe = (o) => {
    for (const k of Object.keys(o)) {
      const v = o[k]
      if (typeof v === 'string') o[k] = ''
      else if (typeof v === 'boolean') o[k] = false
      else if (typeof v === 'number') delete o[k]
      else if (Array.isArray(v)) o[k] = []
      else if (v && typeof v === 'object') wipe(v)
    }
  }
  wipe(blank)
  if ('id' in blank) blank.id = 'new-' + Math.random().toString(36).slice(2, 8)
  // Fields the schema needs that the last entry happened not to have.
  if (ctx) for (const [k, v] of Object.entries(itemTemplate(ctx.type, ctx.path))) if (!(k in blank)) blank[k] = v
  return blank
}

function objectList(arr, heading, onChange, ctx) {
  const wrap = el('fieldset', {}, [el('legend', { textContent: `${heading} (${arr.length})` })])

  arr.forEach((item, i) => {
    const body = el('div')
    if (item && typeof item === 'object') for (const k of Object.keys(item)) body.append(field(item, k, onChange, ctx))

    const up = el('button', { className: 'icon', title: 'Move up', textContent: '↑', ariaLabel: `Move "${titleOf(item, i)}" up` })
    const dn = el('button', { className: 'icon', title: 'Move down', textContent: '↓', ariaLabel: `Move "${titleOf(item, i)}" down` })
    const rm = el('button', { className: 'icon danger', title: 'Delete', textContent: '✕', ariaLabel: `Delete "${titleOf(item, i)}"` })
    up.onclick = (e) => { e.preventDefault(); if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; onChange(true) } }
    dn.onclick = (e) => { e.preventDefault(); if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; onChange(true) } }
    rm.onclick = (e) => {
      e.preventDefault()
      if (confirm(`Delete "${titleOf(item, i)}"? You can undo by reloading without saving, or restore from History after saving.`)) {
        arr.splice(i, 1); onChange(true)
      }
    }

    const isObj = item && typeof item === 'object'
    const d = el('details', { className: 'item', open: isObj && openItems.has(item) }, [
      el('summary', {}, [
        el('span', { className: 'ty', textContent: String(i + 1).padStart(2, '0') }),
        el('span', { className: 't', textContent: titleOf(item, i) }),
        up, dn, rm,
      ]),
      body,
    ])
    if (isObj) d.addEventListener('toggle', () => (d.open ? openItems.add(item) : openItems.delete(item)))
    if (item === focusAfterRender) {
      focusAfterRender = null
      requestAnimationFrame(() => d.querySelector('input,textarea')?.focus())
    }
    wrap.append(d)
  })

  const add = el('button', { textContent: `+ Add ${heading.toLowerCase().replace(/\s*\(\d+\)$/, '').replace(/s$/, '')}` })
  add.onclick = (e) => {
    e.preventDefault()
    const entry = newEntry(arr, ctx)
    arr.push(entry)
    // Open the new entry and put the cursor in it.
    openItems.add(entry)
    focusAfterRender = entry
    onChange(true)
  }
  wrap.append(add)
  return wrap
}

/* ── Panes ────────────────────────────────────────────────────────────────── */

function renderSidebar() {
  const host = $('#sections')
  host.textContent = ''
  $('#count').textContent = doc.sections.length + ' total'

  const profileRow = el('button', { className: 'sec' + (selected === 'profile' ? ' on' : '') }, [el('span', { className: 'nm', textContent: 'Profile & meta' })])
  profileRow.onclick = () => { selected = 'profile'; render() }
  host.append(profileRow)
  host.append(el('div', { style: 'height:10px' }))

  doc.sections.forEach((s, i) => {
    const name = s.title || s.id
    const eye = el('button', { className: 'icon', title: s.visible ? 'Visible — click to hide' : 'Hidden — click to show', textContent: s.visible ? '👁' : '—', ariaLabel: `${s.visible ? 'Hide' : 'Show'} "${name}"` })
    const up = el('button', { className: 'icon', title: 'Move up', textContent: '↑', ariaLabel: `Move "${name}" up` })
    const dn = el('button', { className: 'icon', title: 'Move down', textContent: '↓', ariaLabel: `Move "${name}" down` })
    eye.onclick = () => { s.visible = !s.visible; setDirty(true); render() }
    up.onclick = () => { if (i > 0) { [doc.sections[i - 1], doc.sections[i]] = [doc.sections[i], doc.sections[i - 1]]; setDirty(true); render() } }
    dn.onclick = () => { if (i < doc.sections.length - 1) { [doc.sections[i + 1], doc.sections[i]] = [doc.sections[i], doc.sections[i + 1]]; setDirty(true); render() } }

    const open = el('button', { className: 'nm linklike', textContent: name })
    open.onclick = () => { selected = s.id; render() }
    host.append(el('div', { className: 'sec' + (selected === s.id ? ' on' : '') + (s.visible ? '' : ' off') }, [
      open, el('span', { className: 'ty', textContent: s.type }), eye, up, dn,
    ]))
  })
}

function renderPane() {
  const pane = $('#pane')
  pane.textContent = ''
  const change = (rerender) => { setDirty(true); if (rerender) render() }

  if (selected === 'profile') {
    pane.append(el('h2', { textContent: 'Profile & page metadata' }))
    pane.append(el('p', { className: 'hint', textContent: 'Name, headline, intro and links. Meta is the page title and description; the site currently reads those from the built copy, so edits here take effect at the next deploy.' }))
    const fs1 = el('fieldset', {}, [el('legend', { textContent: 'Profile' })])
    for (const k of Object.keys(doc.profile)) fs1.append(field(doc.profile, k, change))
    const fs2 = el('fieldset', {}, [el('legend', { textContent: 'Meta' })])
    for (const k of Object.keys(doc.meta)) fs2.append(field(doc.meta, k, change))
    pane.append(fs1, fs2)
    return
  }

  const s = doc.sections.find((x) => x.id === selected)
  if (!s) { pane.append(el('p', { className: 'hint', textContent: 'Select a section.' })); return }

  pane.append(el('h2', { textContent: s.title || s.id }))
  pane.append(el('p', { className: 'hint', textContent: `type: ${s.type} · id: ${s.id} · ${s.visible ? 'visible' : 'hidden'}` }))
  if (!s.visible) pane.append(el('div', { className: 'warn', textContent: 'This section is hidden — it will not appear on the public site, and its link is removed from the nav.' }))

  const ctx = { type: s.type, path: [] }
  for (const k of ['title', 'navLabel', 'lead', 'body']) if (k in s) pane.append(field(s, k, change, ctx))
  if (Array.isArray(s.categoryOrder)) pane.append(field(s, 'categoryOrder', change, ctx))
  if (Array.isArray(s.items)) pane.append(objectList(s.items, 'Items', change, { type: s.type, path: ['items'] }))
}

function render() { renderSidebar(); renderPane() }

/* ── Server ───────────────────────────────────────────────────────────────── */

async function api(url, { method = 'GET', body, headers = {}, raw } = {}) {
  const opts = { method, headers: { ...headers } }
  if (method !== 'GET') opts.headers['x-cms'] = '1'
  if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['content-type'] = 'application/json' }
  if (raw) opts.body = raw
  const r = await fetch(url, opts)
  let json = null
  try { json = await r.json() } catch { /* empty or not JSON */ }
  if (!r.ok) {
    const err = new Error(json?.error || `${r.status} ${r.statusText}`)
    Object.assign(err, { status: r.status, details: json?.details || [], warnings: json?.warnings || [], etag: json?.etag, usedBy: json?.usedBy })
    throw err
  }
  return { json, etag: r.headers.get('etag') }
}

const currentVariant = () => $('#variant').value || 'default'
const q = (v) => '?variant=' + encodeURIComponent(v)

async function loadVariants(keep) {
  const { json } = await api('/api/variants')
  const sel = $('#variant')
  sel.textContent = ''
  for (const v of json.variants) sel.append(el('option', { value: v, textContent: v === 'default' ? 'default (live)' : v }))
  if (keep && json.variants.includes(keep)) sel.value = keep
}

async function load() {
  const r = await api('/api/content' + q(currentVariant()))
  doc = r.json
  etag = r.etag
  openItems = new WeakSet()
  selected = 'profile'
  showIssues()
  setDirty(false)
  render()
}

/** Show why a change failed, with a way forward for the common cases. */
function explain(e, verb) {
  if (e.status === 422) return showIssues(e.details, e.warnings)
  if (e.status === 412) {
    showIssues([], [], 'Someone saved this document since you opened it (another tab?). Reload to get their version; your unsaved edits here will be lost.')
    const box = $('#issues')
    const reload = el('button', { className: 'primary', textContent: 'Reload latest' })
    reload.onclick = () => { dirty = false; load().catch((err) => toast(err.message, true)) }
    box.append(reload)
    return
  }
  toast(`${verb} failed: ${e.message}`, true)
}

$('#save').onclick = async () => {
  const { errors, warnings } = validateSite(doc)
  if (errors.length) return showIssues(formatIssues(errors), formatIssues(warnings))
  try {
    const r = await api('/api/content' + q(currentVariant()), { method: 'PUT', body: doc, headers: { 'if-match': etag } })
    etag = r.json.etag
    setDirty(false)
    showIssues([], r.json.warnings || [])
    toast(currentVariant() === 'default' ? 'Saved — live on the site at the next page load' : `Saved "${currentVariant()}"`)
  } catch (e) { explain(e, 'Save') }
}

$('#variant').onchange = async () => {
  if (dirty && !confirm('You have unsaved changes. Switch anyway?')) return
  await load().catch((e) => toast(e.message, true))
}

$('#newVariant').onclick = async () => {
  if (dirty) return toast('Save or discard your changes first — the copy is made from the saved version.', true)
  const name = prompt('Name for the copy (lowercase letters, numbers, hyphens).\n\nNote: every variant is public at aliharizanuari.org/?v=<name>.')
  if (!name) return
  try {
    await api('/api/variants', { method: 'POST', body: { name: name.trim().toLowerCase(), source: currentVariant() } })
    await loadVariants(name.trim().toLowerCase())
    await load()
    toast(`Created "${name}" — viewable at /?v=${name}`)
  } catch (e) { explain(e, 'Copy') }
}

$('#publish').onclick = async () => {
  const v = currentVariant()
  if (v === 'default') return toast('This already is the live document.')
  if (dirty) return toast('Save this variant first — Publish copies the saved version.', true)
  if (!confirm(`Replace the live site with "${v}"? The current live version is kept in History.`)) return
  try {
    await api('/api/publish', { method: 'POST', body: { variant: v }, headers: { 'if-match': etag } })
    toast(`"${v}" is now live`)
  } catch (e) { explain(e, 'Publish') }
}

/* ── History ──────────────────────────────────────────────────────────────── */

$('#history').onclick = async () => {
  const v = currentVariant()
  const pane = $('#pane')
  selected = null
  pane.textContent = ''
  pane.append(el('h2', { textContent: `History — ${v === 'default' ? 'live document' : v}` }))
  pane.append(el('p', { className: 'hint', textContent: 'A copy is kept of every version this editor replaced, newest first. Restoring one keeps the current version here too, so a restore can itself be undone.' }))
  try {
    const { json } = await api('/api/backups' + q(v))
    if (!json.backups.length) return pane.append(el('p', { className: 'hint', textContent: 'No earlier versions yet — the first save will create one.' }))
    const list = el('ul', { className: 'history' })
    for (const b of json.backups) {
      const when = new Date(b.savedAt)
      const restore = el('button', { textContent: 'Restore' })
      restore.onclick = async () => {
        if (dirty && !confirm('You have unsaved changes, which restoring will discard. Continue?')) return
        if (!confirm(`Replace the current ${v === 'default' ? 'live document' : `"${v}"`} with the version from ${when.toLocaleString()}?`)) return
        try {
          await api('/api/restore', { method: 'POST', body: { file: b.file } })
          await load()
          toast('Restored')
        } catch (e) { explain(e, 'Restore') }
      }
      list.append(el('li', { className: 'row' }, [
        el('span', { className: 'grow', textContent: `${when.toLocaleString()} · ${Math.round(b.size / 1024)} KB` }),
        restore,
      ]))
    }
    pane.append(list)
  } catch (e) { toast(e.message, true) }
}

/* ── Media ────────────────────────────────────────────────────────────────── */

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast('Copied ' + text)
  } catch {
    prompt('Copy this path:', text) // clipboard needs HTTPS; this always works
  }
}

$('#media').onclick = async () => {
  const pane = $('#pane')
  selected = null
  pane.textContent = ''
  pane.append(el('h2', { textContent: 'Images' }))
  pane.append(el('p', { className: 'hint', textContent: 'PNG, JPEG, WebP or AVIF, up to 8 MB each. They are converted to WebP, scaled to at most 2400 px wide and stripped of camera data (including location). Paste the path into a project’s images list or the profile portrait.' }))

  const input = el('input', { type: 'file', multiple: true, accept: 'image/png,image/jpeg,image/webp,image/avif', style: 'width:auto' })
  input.onchange = async () => {
    if (!input.files.length) return
    const fd = new FormData()
    for (const f of input.files) fd.append('files', f)
    try {
      const { json } = await api('/api/media', { method: 'POST', raw: fd })
      toast(`Uploaded ${json.files.length} image${json.files.length === 1 ? '' : 's'}`)
      $('#media').click()
    } catch (e) { toast(e.message, true) }
  }
  pane.append(input)

  const grid = el('div', { className: 'media', style: 'margin-top:16px' })
  const { json } = await api('/api/media')
  if (!json.files.length) grid.append(el('p', { className: 'hint', textContent: 'No images uploaded yet.' }))
  for (const f of json.files) {
    const copy = el('button', { className: 'icon', textContent: 'Copy path', style: 'margin-top:5px;width:100%' })
    copy.onclick = () => copyText(f.url)
    const del = el('button', { className: 'icon danger', textContent: 'Delete', style: 'margin-top:5px;width:100%' })
    del.onclick = async () => {
      if (!confirm(`Delete ${f.name}?`)) return
      try {
        await api(`/api/media/${encodeURIComponent(f.name)}`, { method: 'DELETE' })
      } catch (e) {
        if (e.status !== 409) return toast(e.message, true)
        if (!confirm(`${e.message}\n\nDelete anyway? Those pages will show a broken image.`)) return
        try { await api(`/api/media/${encodeURIComponent(f.name)}?force=1`, { method: 'DELETE' }) } catch (e2) { return toast(e2.message, true) }
      }
      toast('Deleted')
      $('#media').click()
    }
    grid.append(el('figure', {}, [
      el('img', { src: f.url, alt: f.name, loading: 'lazy' }),
      el('figcaption', { textContent: `${f.name} · ${Math.round(f.size / 1024)} KB` }),
      copy, del,
    ]))
  }
  pane.append(grid)
}

/* ── Boot ─────────────────────────────────────────────────────────────────── */

try {
  await loadVariants()
  await load()
} catch (e) {
  $('#status').textContent = 'failed to load'
  toast('Could not load content: ' + e.message, true)
}
