import { describe, it, expect } from 'vitest'
import { buildChainPayload } from './api.js'

// A chain that mixes saved processes with newly inserted ones used to produce
// rows with different key sets, which PostgREST rejects outright, so inserting
// a process into an existing chain always failed. Every row now carries an id.
describe('chain payload', () => {
  const studyId = 'study-1'
  const ids = ['new-1', 'new-2']
  const makeId = () => ids.shift()

  it('gives every row the same keys, saved and new alike', () => {
    const payload = buildChainPayload(studyId, [
      { id: 'p-1', name: 'Moulding' },
      { id: null, name: ' Inserted step ' },
      { id: 'p-2', name: 'Packing' },
    ], makeId)
    const keys = payload.map((r) => Object.keys(r).sort().join(','))
    expect(new Set(keys).size).toBe(1)
    expect(keys[0]).toBe('id,name,position,study_id')
  })

  it('numbers positions from one in chain order and trims names', () => {
    const payload = buildChainPayload(studyId, [
      { id: 'p-2', name: 'Second' },
      { id: 'p-1', name: '  First  ' },
    ], () => 'x')
    expect(payload.map((r) => [r.id, r.position, r.name])).toEqual([
      ['p-2', 1, 'Second'],
      ['p-1', 2, 'First'],
    ])
  })

  it('keeps existing ids so a reorder updates rather than recreates', () => {
    const payload = buildChainPayload(studyId, [
      { id: 'p-3', name: 'C' }, { id: 'p-1', name: 'A' }, { id: 'p-2', name: 'B' },
    ], () => 'unused')
    expect(payload.map((r) => r.id)).toEqual(['p-3', 'p-1', 'p-2'])
    expect(payload.every((r) => r.study_id === studyId)).toBe(true)
  })
})
