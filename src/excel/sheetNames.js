// Excel forbids : \ / ? * [ ] in sheet names and caps them at 31 characters.
// Two different process names can truncate to the same sheet name, so a short
// numeric suffix keeps them distinct. The upload matches sheets by the hidden
// process id, never by name, so a suffix never breaks the round trip.
export function sanitiseSheetName(name) {
  const cleaned = String(name || '')
    .replace(/[:\\/?*[\]]/g, '')
    .replace(/^'+|'+$/g, '')
    .trim()
  return (cleaned || 'Process').slice(0, 31)
}

export function uniqueSheetNames(names, reserved = []) {
  const taken = new Set(reserved.map((n) => n.toLowerCase()))
  return names.map((raw) => {
    const base = sanitiseSheetName(raw)
    let candidate = base
    let n = 2
    while (taken.has(candidate.toLowerCase())) {
      const suffix = ` (${n})`
      candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`
      n += 1
    }
    taken.add(candidate.toLowerCase())
    return candidate
  })
}
