import fs from "node:fs"

/** Parse a CSV string into an array of row objects keyed by header names. */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field)
      field = ""
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row)
      }
      row = []
      if (char === "\r") index += 1
    } else if (char !== "\r") {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.some((cell) => cell.trim() !== "")) {
      rows.push(row)
    }
  }

  if (rows.length === 0) return []

  const headers = rows[0].map((header) => header.trim())
  return rows.slice(1).map((cells) => {
    /** @type {Record<string, string>} */
    const record = {}
    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index]
      if (header) record[header] = (cells[index] ?? "").trim()
    }
    return record
  })
}

export function readCsvFile(filePath) {
  return parseCsv(fs.readFileSync(filePath, "utf8"))
}

export function escapeCsvField(value) {
  const text = value == null ? "" : String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function writeCsvFile(filePath, headers, records) {
  const lines = [
    headers.join(","),
    ...records.map((record) =>
      headers.map((header) => escapeCsvField(record[header])).join(",")
    ),
  ]
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`)
}
