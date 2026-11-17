// Shared between the template writer and the upload reader, so both agree on
// where everything sits. Changing these means changing TEMPLATE_VERSION.
export const TEMPLATE_VERSION = 'LCA_STUDIO_TEMPLATE_V1'

export const HEADER_ROW = 6
export const FIRST_DATA_ROW = 7
export const DATA_ROWS = 200
export const LAST_DATA_ROW = FIRST_DATA_ROW + DATA_ROWS - 1

export const COL = {
  direction: 1, // A
  type: 2,      // B
  quantity: 3,  // C
  unit: 4,      // D
  distance: 5,  // E
  quality: 6,   // F
}

// Hidden, locked metadata columns on every process sheet.
export const META = {
  marker: 8,       // H1
  studyId: 9,      // I1
  processId: 10,   // J1
  chainVersion: 11,// K1
  position: 12,    // L1
}

export const COLUMN_KEYS = ['direction', 'type', 'quantity', 'unit', 'distance', 'quality']

export const COLUMN_HEADER_KEY = {
  direction: 'common.direction',
  type: 'common.type',
  quantity: 'exportDoc.quantityAnnual',
  unit: 'common.unit',
  distance: 'exportDoc.distanceKm',
  quality: 'common.dataQuality',
}

export const QUALITY_KEYS = ['measured', 'calculated', 'estimated']
