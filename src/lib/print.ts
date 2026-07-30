export interface PrintOptions {
  title: string
  content: string
}

const COMPANY = "BuildProp"
const ADDRESS = "123 Construction Ave, Building District"
const PHONE = "+1 (555) 000-0000"

function printCSS(): string {
  return `
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
    .header {
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
    .section { margin-bottom: 20px; }
    .section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f8fafc; text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .text-right { text-align: right; }
    .mono { font-family: "SF Mono", "Fira Code", monospace; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 320px; }
    .totals-table td { padding: 6px 12px; }
    .totals-table .total-row td { border-top: 2px solid #0f172a; font-weight: 700; font-size: 15px; }
    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    .thank-you { text-align: center; margin-top: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; color: #64748b; font-style: italic; }
  `
}

export function printDocument({ title, content }: PrintOptions) {
  const win = window.open("", "_blank", "width=800,height=900")
  if (!win) {
    alert("Please allow popups to print documents.")
    return
  }

  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title} - ${COMPANY}</title>
  <style>${printCSS()}</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>${COMPANY}</h1>
      <p>${ADDRESS}</p>
      <p>${PHONE}</p>
    </div>
    <div class="doc-title">
      <h2>${title}</h2>
    </div>
  </div>
  ${content}
  <div class="footer">
    <span>Printed on ${date}</span>
    <span>${COMPANY} &mdash; Construction & Real Estate Management</span>
    <span>Page <span class="page-num"></span></span>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`

  win.document.write(html)
  win.document.close()
}
