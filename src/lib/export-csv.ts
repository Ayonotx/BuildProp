export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) {
    alert("No data to export.")
    return
  }

  const headers = Object.keys(data[0])

  function escapeCSV(value: unknown): string {
    const str = value === null || value === undefined ? "" : String(value)
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  const csvRows = [
    headers.join(","),
    ...data.map(row => headers.map(h => escapeCSV(row[h])).join(","))
  ]

  const csvString = csvRows.join("\n")
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".csv") ? filename : filename + ".csv"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
