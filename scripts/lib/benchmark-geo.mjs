const STATE_ABBR_BY_FIPS = {
  "01": "AL",
  "02": "AK",
  "04": "AZ",
  "05": "AR",
  "06": "CA",
  "08": "CO",
  "09": "CT",
  "10": "DE",
  "11": "DC",
  "12": "FL",
  "13": "GA",
  "15": "HI",
  "16": "ID",
  "17": "IL",
  "18": "IN",
  "19": "IA",
  "20": "KS",
  "21": "KY",
  "22": "LA",
  "23": "ME",
  "24": "MD",
  "25": "MA",
  "26": "MI",
  "27": "MN",
  "28": "MS",
  "29": "MO",
  "30": "MT",
  "31": "NE",
  "32": "NV",
  "33": "NH",
  "34": "NJ",
  "35": "NM",
  "36": "NY",
  "37": "NC",
  "38": "ND",
  "39": "OH",
  "40": "OK",
  "41": "OR",
  "42": "PA",
  "44": "RI",
  "45": "SC",
  "46": "SD",
  "47": "TN",
  "48": "TX",
  "49": "UT",
  "50": "VT",
  "51": "VA",
  "53": "WA",
  "54": "WV",
  "55": "WI",
  "56": "WY",
}

const STATE_NAME_BY_ABBR = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
}

export const GEO_LEVEL_ORDER = [
  "national",
  "regional_hub",
  "state",
  "cbsa",
  "county",
  "submarket",
  "zip",
]

export function norm(value) {
  return value.trim().toLowerCase()
}

export function parseNullableNumber(value) {
  if (value == null || value === "" || value === "null") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function parseNullableBoolean(value) {
  if (value == null || value === "" || value === "null") return null
  const normalized = value.trim().toLowerCase()
  if (normalized === "true") return true
  if (normalized === "false") return false
  return null
}

function nullableLabel(value) {
  if (value == null || value === "" || value === "null") return null
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export function stateAbbrFromRow(row) {
  const direct = row.state?.trim().toUpperCase()
  if (direct && STATE_NAME_BY_ABBR[direct]) return direct
  const fips = row.geo_id?.trim() ?? row.fips_state_code?.trim()
  return fips ? STATE_ABBR_BY_FIPS[fips.padStart(2, "0")] ?? null : null
}

export function stateNameFromAbbr(abbr) {
  return abbr ? STATE_NAME_BY_ABBR[abbr.toUpperCase()] ?? abbr : null
}

export function geoLabelForRow(row) {
  const geoLevel = row.geo_level?.trim()
  const geoId = row.geo_id?.trim() ?? ""
  const stateAbbr = stateAbbrFromRow(row)
  const exported = nullableLabel(row.geo_label)
  const zip = row.zip_code?.trim()

  // Prefer the export's geo_label when it carries more than a raw id/ZIP.
  if (
    exported &&
    exported !== geoId &&
    exported !== zip &&
    exported.toLowerCase() !== "null"
  ) {
    return exported
  }

  switch (geoLevel) {
    case "national":
      return "United States"
    case "regional_hub":
      return geoId
    case "state":
      return stateNameFromAbbr(stateAbbr) ?? geoId
    case "cbsa": {
      const title = nullableLabel(row.cbsa_title)
      if (title) return title
      const code = nullableLabel(row.cbsa_code) ?? geoId
      return code ? `CBSA ${code}` : geoId
    }
    case "county": {
      const county = nullableLabel(row.county)
      if (county && stateAbbr) return `${county} County, ${stateAbbr}`
      return geoId
    }
    case "submarket":
      return nullableLabel(row.office_submarket_name) ?? geoId
    case "zip": {
      const city = row.city?.trim()
      if (city && stateAbbr && zip) return `${city}, ${stateAbbr}, ${zip}`
      if (zip && stateAbbr) return `${stateAbbr}, ${zip}`
      return exported ?? geoId
    }
    default:
      return exported ?? geoId
  }
}

/** statsKey matches benchmarks.json lookup keys (see real-benchmarks.ts). */
export function statsKeyForRow(row) {
  const geoLevel = row.geo_level?.trim()
  const geoId = row.geo_id?.trim() ?? ""
  const stateAbbr = stateAbbrFromRow(row)

  switch (geoLevel) {
    case "national":
      return "national"
    case "regional_hub":
      return norm(geoId)
    case "state":
      return stateAbbr ?? geoId.toUpperCase()
    case "cbsa":
      return row.cbsa_code?.trim() || geoId
    case "county": {
      const county = row.county?.trim()
      if (county && stateAbbr) return `${norm(county)}|${stateAbbr.toUpperCase()}`
      return norm(geoId)
    }
    case "submarket":
      return norm(row.office_submarket_name?.trim() || geoId)
    case "zip":
      return row.zip_code?.trim() || geoId
    default:
      return norm(geoId)
  }
}

export function geoIdForRow(row) {
  const geoLevel = row.geo_level?.trim()
  const geoId = row.geo_id?.trim() ?? ""

  switch (geoLevel) {
    case "cbsa":
      return row.cbsa_code?.trim() || geoId
    case "submarket":
      return row.office_submarket_name?.trim() || geoId
    case "zip":
      return row.zip_code?.trim() || geoId
    default:
      return geoId
  }
}

export function compareGeoLevel(a, b) {
  const ai = GEO_LEVEL_ORDER.indexOf(a)
  const bi = GEO_LEVEL_ORDER.indexOf(b)
  if (ai === -1 && bi === -1) return a.localeCompare(b)
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
}
