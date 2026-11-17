// ISO 3166-1 alpha-2 codes offered in the geography dropdown. Names come from
// Intl.DisplayNames in the active language, with the code as a fallback so the
// field still reads if the runtime has no display names.
export const COUNTRY_CODES = [
  'ES', 'PT', 'FR', 'DE', 'IT', 'NL', 'BE', 'LU', 'IE', 'AT', 'CH', 'GB',
  'DK', 'SE', 'NO', 'FI', 'IS', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'RO',
  'BG', 'GR', 'EE', 'LV', 'LT', 'CY', 'MT', 'TR', 'MA', 'TN', 'EG', 'ZA',
  'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'UY',
  'CN', 'IN', 'JP', 'KR', 'TW', 'VN', 'TH', 'MY', 'SG', 'ID', 'PH',
  'AU', 'NZ', 'IL', 'AE', 'SA',
]

const caches = {}

function displayNames(lang) {
  if (!(lang in caches)) {
    try {
      caches[lang] = new Intl.DisplayNames([lang === 'es' ? 'es-ES' : 'en-GB'], { type: 'region' })
    } catch {
      caches[lang] = null
    }
  }
  return caches[lang]
}

export function countryName(code, lang = 'en') {
  if (!code) return ''
  const dn = displayNames(lang)
  try {
    return dn?.of(code) || code
  } catch {
    return code
  }
}

export function countryOptions(lang = 'en') {
  return COUNTRY_CODES
    .map((code) => ({ code, name: countryName(code, lang) }))
    .sort((a, b) => a.name.localeCompare(b.name, lang === 'es' ? 'es' : 'en'))
}

export const REFERENCE_YEARS = Array.from({ length: 12 }, (unused, i) => 2026 - i)
