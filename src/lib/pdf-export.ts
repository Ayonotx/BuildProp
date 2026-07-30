export function exportToPdf(options: {
  title: string
  subtitle?: string
  headers: string[]
  rows: (string | number)[][]
  filename?: string
}) {
  const { title, subtitle, headers, rows, filename } = options
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  const rowsHTML = rows.map((row, i) => {
    const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc"
    return `<tr style="background:${bg}">${row.map(cell => `<td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;">${cell}</td>`).join("")}</tr>`
  }).join("")

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title} - BuildProp</title>
  <style>
    @page { margin: 1.5cm; size: A4; }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.5;
      padding: 32px;
    }
    .brand-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #f97316;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand h1 { font-size: 28px; font-weight: 700; color: #0f172a; }
    .brand p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h2 { font-size: 20px; font-weight: 700; color: #f97316; text-transform: uppercase; }
    .doc-title p { font-size: 12px; color: #64748b; margin-top: 2px; }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    table.data-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.data-table th:first-child { border-radius: 6px 0 0 0; }
    table.data-table th:last-child { border-radius: 0 6px 0 0; }
    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="brand-header">
    <div class="brand">
      <h1>BuildProp</h1>
      <p>Construction & Real Estate Management</p>
    </div>
    <div class="doc-title">
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>
  </div>
  <table class="data-table">
    <thead>
      <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${rowsHTML || `<tr><td colspan="${headers.length}" style="padding:24px;text-align:center;color:#94a3b8;">No data available</td></tr>`}
    </tbody>
  </table>
  <div class="footer">
    <span>Generated on ${date}</span>
    <span>BuildProp &mdash; Construction & Real Estate Management</span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) {
    alert("Please allow popups to export PDF.")
    return
  }
  win.document.write(html)
  win.document.close()
}

interface ReportSection {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

export function exportAllReports(options: {
  title: string
  subtitle?: string
  sections: ReportSection[]
  filename?: string
}) {
  const { title, subtitle, sections } = options
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  const sectionsHTML = sections.map((section) => {
    const rowsHTML = section.rows.map((row, i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc"
      return `<tr style="background:${bg}">${row.map(cell => `<td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;">${cell}</td>`).join("")}</tr>`
    }).join("")

    return `
      <div class="report-section">
        <h3>${section.title}</h3>
        <table class="data-table">
          <thead>
            <tr>${section.headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rowsHTML || `<tr><td colspan="${section.headers.length}" style="padding:24px;text-align:center;color:#94a3b8;">No data available</td></tr>`}
          </tbody>
        </table>
      </div>
    `
  }).join("")

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title} - BuildProp</title>
  <style>
    @page { margin: 1.5cm; size: A4; }
    @media print {
      body { margin: 0; padding: 0; }
      .report-section { page-break-inside: avoid; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.5;
      padding: 32px;
    }
    .brand-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #f97316;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .brand h1 { font-size: 28px; font-weight: 700; color: #0f172a; }
    .brand p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .doc-title { text-align: right; }
    .doc-title h2 { font-size: 20px; font-weight: 700; color: #f97316; text-transform: uppercase; }
    .doc-title p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .report-section {
      margin-bottom: 32px;
    }
    .report-section h3 {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    table.data-table th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.data-table th:first-child { border-radius: 6px 0 0 0; }
    table.data-table th:last-child { border-radius: 0 6px 0 0; }
    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="brand-header">
    <div class="brand">
      <h1>BuildProp</h1>
      <p>Construction & Real Estate Management</p>
    </div>
    <div class="doc-title">
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ""}
    </div>
  </div>
  ${sectionsHTML}
  <div class="footer">
    <span>Generated on ${date}</span>
    <span>BuildProp &mdash; Construction & Real Estate Management</span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`

  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) {
    alert("Please allow popups to export PDF.")
    return
  }
  win.document.write(html)
  win.document.close()
}
