// Every database call lives here. Nothing in this file writes to the example
// study: the RLS policies refuse that at the database, and the interface also
// hides the controls.
import { supabase, IMAGE_BUCKET } from './supabase.js'
import { INDICATOR_CODES } from './indicators.js'

/** A client-side uuid, so new rows can carry an id before they are written. */
function newId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* fall through */ }
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 36; i += 1) {
    if (i === 8 || i === 13 || i === 18 || i === 23) out += '-'
    else if (i === 14) out += '4'
    else if (i === 19) out += hex[(Math.random() * 4) | 8]
    else out += hex[(Math.random() * 16) | 0]
  }
  return out
}

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

let vocabPromise = null

/** Vocabulary is fixed and read-only, so it is fetched once per page load. */
export function loadVocabulary() {
  if (!vocabPromise) {
    vocabPromise = supabase
      .from('lca_vocabulary')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(unwrap)
      .catch((e) => { vocabPromise = null; throw e })
  }
  return vocabPromise
}

export function vocabularyMap(items) {
  return Object.fromEntries((items || []).map((v) => [v.id, v]))
}

/** Home: every company with its products and studies, in display order. */
export async function loadHome() {
  const [companies, products, studies] = await Promise.all([
    supabase.from('lca_companies').select('*').then(unwrap),
    supabase.from('lca_products').select('*').then(unwrap),
    supabase.from('lca_studies').select('*').then(unwrap),
  ])
  const byProduct = {}
  for (const s of studies) (byProduct[s.product_id] ||= []).push(s)
  for (const list of Object.values(byProduct)) {
    list.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
  }
  const byCompany = {}
  for (const p of products) {
    (byCompany[p.company_id] ||= []).push({ ...p, studies: byProduct[p.id] || [] })
  }
  for (const list of Object.values(byCompany)) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  const tree = companies
    .map((c) => ({ ...c, products: byCompany[c.id] || [] }))
    .sort((a, b) => {
      if (a.is_example !== b.is_example) return a.is_example ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  return tree
}

export async function loadStudy(studyId) {
  const study = await supabase
    .from('lca_studies').select('*').eq('id', studyId).maybeSingle().then(unwrap)
  if (!study) return null
  const product = await supabase
    .from('lca_products').select('*').eq('id', study.product_id).maybeSingle().then(unwrap)
  const company = product
    ? await supabase
        .from('lca_companies').select('*').eq('id', product.company_id).maybeSingle().then(unwrap)
    : null
  const [processes, rows] = await Promise.all([
    supabase.from('lca_processes').select('*').eq('study_id', studyId)
      .order('position', { ascending: true }).then(unwrap),
    supabase.from('lca_inventory_rows').select('*').eq('study_id', studyId)
      .order('source_row', { ascending: true }).then(unwrap),
  ])
  return { study, product, company, processes, rows, readOnly: isReadOnly(study, product, company) }
}

export function isReadOnly(study, product, company) {
  return Boolean(study?.is_example || product?.is_example || company?.is_example)
}

export async function findCompanyByName(name) {
  const key = name.trim().toLowerCase()
  if (!key) return null
  const rows = await supabase.from('lca_companies').select('*').eq('name_key', key).then(unwrap)
  return rows?.[0] || null
}

export async function findProduct(companyId, name) {
  const key = name.trim().toLowerCase()
  const rows = await supabase.from('lca_products').select('*')
    .eq('company_id', companyId).eq('name_key', key).then(unwrap)
  return rows?.[0] || null
}

export async function ensureCompany(name) {
  const existing = await findCompanyByName(name)
  if (existing) {
    if (existing.is_example) {
      const err = new Error('example'); err.code = 'EXAMPLE_COMPANY'; throw err
    }
    return existing
  }
  return supabase.from('lca_companies').insert({ name: name.trim() })
    .select().single().then(unwrap)
}

export async function ensureProduct(companyId, name) {
  const existing = await findProduct(companyId, name)
  if (existing) return existing
  return supabase.from('lca_products').insert({ company_id: companyId, name: name.trim() })
    .select().single().then(unwrap)
}

const SCOPE_FIELDS = [
  'fu_amount', 'fu_unit', 'units_per_package', 'annual_production',
  'intended_application', 'intended_audience', 'cutoff', 'allocation',
  'data_quality_approach', 'geography', 'reference_year', 'selected_indicators',
]

function scopePayload(scope) {
  const out = {}
  for (const f of SCOPE_FIELDS) if (f in scope) out[f] = scope[f]
  if (out.fu_unit && !['box', 'pallet'].includes(out.fu_unit)) out.units_per_package = null
  return out
}

export async function createStudy({ companyName, productName, scope }) {
  const company = await ensureCompany(companyName)
  const product = await ensureProduct(company.id, productName)
  const study = await supabase.from('lca_studies')
    .insert({ product_id: product.id, ...scopePayload(scope), status: 'scope' })
    .select().single().then(unwrap)
  return { company, product, study }
}

export async function updateScope(studyId, scope) {
  return supabase.from('lca_studies').update(scopePayload(scope)).eq('id', studyId)
    .select().single().then(unwrap)
}

export async function renameCompany(companyId, name) {
  return supabase.from('lca_companies').update({ name: name.trim() }).eq('id', companyId)
    .select().single().then(unwrap)
}

export async function renameProduct(productId, name) {
  return supabase.from('lca_products').update({ name: name.trim() }).eq('id', productId)
    .select().single().then(unwrap)
}

export async function setStatus(studyId, status) {
  return supabase.from('lca_studies').update({ status }).eq('id', studyId)
    .select().single().then(unwrap)
}

/** Advances status only forwards, so revisiting an earlier step never demotes it. */
const RANK = { scope: 0, chain: 1, data: 2, results: 3 }
export async function advanceStatus(study, status) {
  if (RANK[status] <= RANK[study.status]) return study
  return setStatus(study.id, status)
}

/**
 * Replaces a study's whole chain in one request, so the deferred unique
 * constraints on (study_id, position) and (study_id, name) are checked once at
 * the end of the transaction and reordering never trips over itself.
 */
/**
 * Rows for a chain write. Every row carries an id, including the new ones:
 * PostgREST refuses a bulk write whose objects do not all have the same keys,
 * so a chain mixing existing and new processes would be rejected outright.
 * Exported so the shape can be tested without touching the network.
 */
export function buildChainPayload(studyId, chain, makeId = newId) {
  return chain.map((p, i) => ({
    id: p.id || makeId(),
    study_id: studyId,
    position: i + 1,
    name: p.name.trim(),
  }))
}

export async function saveChain(studyId, chain, { clearInventory, chainVersion }) {
  const payload = buildChainPayload(studyId, chain)
  const keepIds = payload.map((p) => p.id)
  if (keepIds.length) {
    await supabase.from('lca_processes').delete().eq('study_id', studyId)
      .not('id', 'in', `(${keepIds.join(',')})`).then(unwrap)
  } else {
    await supabase.from('lca_processes').delete().eq('study_id', studyId).then(unwrap)
  }
  const saved = payload.length
    ? await supabase.from('lca_processes').upsert(payload, { onConflict: 'id' })
        .select().then(unwrap)
    : []
  if (clearInventory) {
    await supabase.from('lca_inventory_rows').delete().eq('study_id', studyId).then(unwrap)
    await supabase.from('lca_studies')
      .update({ chain_version: chainVersion + 1, status: 'chain' })
      .eq('id', studyId).then(unwrap)
  }
  return [...saved].sort((a, b) => a.position - b.position)
}

/** Successful upload: all previous rows are replaced, then status becomes results. */
export async function replaceInventory(studyId, rows) {
  await supabase.from('lca_inventory_rows').delete().eq('study_id', studyId).then(unwrap)
  if (rows.length) {
    await supabase.from('lca_inventory_rows').insert(rows).then(unwrap)
  }
  return setStatus(studyId, 'results')
}

export async function deleteStudy(studyId) {
  const study = await supabase.from('lca_studies').select('*').eq('id', studyId)
    .maybeSingle().then(unwrap)
  if (!study) return
  const productId = study.product_id
  await supabase.from('lca_studies').delete().eq('id', studyId).then(unwrap)

  const siblings = await supabase.from('lca_studies').select('id')
    .eq('product_id', productId).then(unwrap)
  if (siblings.length) return

  const product = await supabase.from('lca_products').select('*').eq('id', productId)
    .maybeSingle().then(unwrap)
  if (!product) return
  if (product.image_path) await removeImage(product.image_path)
  const companyId = product.company_id
  await supabase.from('lca_products').delete().eq('id', productId).then(unwrap)

  const otherProducts = await supabase.from('lca_products').select('id')
    .eq('company_id', companyId).then(unwrap)
  if (otherProducts.length) return
  await supabase.from('lca_companies').delete().eq('id', companyId).then(unwrap)
}

const FACTOR_FIELDS = INDICATOR_CODES.map((c) => `factor_${c === 'gwp' ? 'gwp' : c}`)

/** Full copy of scope, chain and inventory rows, with their factor snapshots. */
export async function duplicateStudy(sourceStudyId, { companyName, productName, companyId }) {
  const source = await loadStudy(sourceStudyId)
  if (!source) throw new Error('not found')

  const company = companyId
    ? await supabase.from('lca_companies').select('*').eq('id', companyId)
        .maybeSingle().then(unwrap)
    : await ensureCompany(companyName)
  if (company?.is_example) {
    const err = new Error('example'); err.code = 'EXAMPLE_COMPANY'; throw err
  }
  const product = await ensureProduct(company.id, productName)

  if (source.product?.image_path && !product.image_path) {
    // The example illustration lives under example/, which anonymous users
    // cannot write to. The copy references it in place instead.
    const copied = source.product.image_path.startsWith('example/')
      ? source.product.image_path
      : await copyImage(source.product.image_path, product.id)
    if (copied) {
      await supabase.from('lca_products').update({ image_path: copied })
        .eq('id', product.id).then(unwrap)
      product.image_path = copied
    }
  }

  const s = source.study
  const study = await supabase.from('lca_studies').insert({
    product_id: product.id,
    fu_amount: s.fu_amount,
    fu_unit: s.fu_unit,
    units_per_package: s.units_per_package,
    annual_production: s.annual_production,
    intended_application: s.intended_application,
    intended_audience: s.intended_audience,
    cutoff: s.cutoff,
    allocation: s.allocation,
    data_quality_approach: s.data_quality_approach,
    geography: s.geography,
    reference_year: s.reference_year,
    selected_indicators: s.selected_indicators,
    chain_version: 1,
    status: s.status,
  }).select().single().then(unwrap)

  const processes = source.processes.length
    ? await supabase.from('lca_processes').insert(
        source.processes.map((p) => ({ study_id: study.id, position: p.position, name: p.name })),
      ).select().then(unwrap)
    : []
  const byPosition = Object.fromEntries(processes.map((p) => [p.position, p.id]))
  const oldToNew = Object.fromEntries(
    source.processes.map((p) => [p.id, byPosition[p.position]]),
  )

  if (source.rows.length) {
    await supabase.from('lca_inventory_rows').insert(source.rows.map((r) => ({
      study_id: study.id,
      process_id: oldToNew[r.process_id],
      source_sheet: r.source_sheet,
      source_row: r.source_row,
      direction: r.direction,
      vocabulary_id: r.vocabulary_id,
      annual_quantity: r.annual_quantity,
      unit: r.unit,
      distance_km: r.distance_km,
      data_quality: r.data_quality,
      factor_gwp: r.factor_gwp,
      factor_water: r.factor_water,
      factor_res_minerals: r.factor_res_minerals,
      factor_res_fossils: r.factor_res_fossils,
      factor_ecotox: r.factor_ecotox,
    }))).then(unwrap)
  }
  return study
}

// ---- Product images -------------------------------------------------------

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024

function extensionFor(type) {
  return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type] || 'jpg'
}

export async function uploadProductImage(productId, file, previousPath) {
  const path = `products/${productId}.${extensionFor(file.type)}`
  const { error } = await supabase.storage.from(IMAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  if (previousPath && previousPath !== path) await removeImage(previousPath)
  await supabase.from('lca_products').update({ image_path: path }).eq('id', productId).then(unwrap)
  return path
}

export async function clearProductImage(productId, path) {
  if (path) await removeImage(path)
  await supabase.from('lca_products').update({ image_path: null }).eq('id', productId).then(unwrap)
}

async function removeImage(path) {
  try { await supabase.storage.from(IMAGE_BUCKET).remove([path]) } catch { /* best effort */ }
}

async function copyImage(fromPath, newProductId) {
  try {
    const { data, error } = await supabase.storage.from(IMAGE_BUCKET).download(fromPath)
    if (error || !data) return null
    const ext = (fromPath.split('.').pop() || 'jpg').toLowerCase()
    const type = data.type && IMAGE_TYPES.includes(data.type)
      ? data.type
      : { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext]
    if (!type) return null
    const path = `products/${newProductId}.${extensionFor(type)}`
    const up = await supabase.storage.from(IMAGE_BUCKET)
      .upload(path, data, { upsert: true, contentType: type })
    if (up.error) return null
    return path
  } catch { return null }
}

export { FACTOR_FIELDS }
