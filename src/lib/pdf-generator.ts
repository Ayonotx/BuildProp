import { formatCurrency, formatDate } from "@/lib/utils"

export function downloadHTML(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const BRAND_CSS = `
  @page { margin: 1.5cm; size: A4; }
  @media print { body { padding: 0 !important; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; font-size: 13px; line-height: 1.5; padding: 32px; }
  .brand-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #f97316; padding-bottom: 16px; margin-bottom: 24px; }
  .brand h1 { font-size: 28px; font-weight: 700; color: #0f172a; }
  .brand p { font-size: 12px; color: #64748b; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h2 { font-size: 20px; font-weight: 700; color: #f97316; text-transform: uppercase; }
  .doc-title p { font-size: 12px; color: #64748b; margin-top: 2px; }
  .section { margin-bottom: 20px; }
  .section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f8fafc; text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .mono { font-family: "SF Mono", "Fira Code", monospace; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-table { width: 320px; }
  .totals-table td { padding: 6px 12px; }
  .totals-table .total-row td { border-top: 2px solid #0f172a; font-weight: 700; font-size: 15px; }
  .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
  .thank-you { text-align: center; margin-top: 32px; padding: 16px; background: #f8fafc; border-radius: 8px; color: #64748b; font-style: italic; }
`

function wrapDocument(title: string, body: string): string {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  return `<!DOCTYPE html>
<html>
<head>
  <title>${title} - BuildProp</title>
  <style>${BRAND_CSS}</style>
</head>
<body>
  <div class="brand-header">
    <div class="brand">
      <h1>BuildProp</h1>
      <p>123 Construction Ave, Building District</p>
      <p>+1 (555) 000-0000</p>
    </div>
    <div class="doc-title">
      <h2>${title}</h2>
    </div>
  </div>
  ${body}
  <div class="footer">
    <span>Generated on ${date}</span>
    <span>BuildProp &mdash; Construction & Real Estate Management</span>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body>
</html>`
}

export function generateInvoicePDF(invoice: any, items: any[], companyName: string = "BuildProp"): string {
  const itemRows = items.length > 0
    ? items.map((item: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.description}</td>
        <td class="text-right mono">${parseFloat(item.quantity).toLocaleString()}</td>
        <td class="text-right mono">${formatCurrency(item.unitPrice)}</td>
        <td class="text-right mono">${formatCurrency(item.amount || (item.quantity * item.unitPrice))}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" style="color:#94a3b8;text-align:center;padding:20px;">No line items</td></tr>`

  const subtotal = invoice.subtotal || 0
  const taxAmount = invoice.taxAmount || 0
  const totalAmount = invoice.totalAmount || 0
  const paidAmount = invoice.paidAmount || 0
  const balance = totalAmount - paidAmount

  const body = `
    <div style="display:flex;gap:40px;margin-bottom:20px;">
      <div style="flex:1;">
        <div class="section-label">Invoice Details</div>
        <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Type:</strong> ${invoice.type ? invoice.type.charAt(0).toUpperCase() + invoice.type.slice(1) : "N/A"}</p>
        <p><strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}</p>
        <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
      </div>
      <div style="flex:1;">
        <div class="section-label">Bill To</div>
        <p>${invoice.contactName || "N/A"}</p>
      </div>
    </div>
    <div class="section">
      <div class="section-label">Line Items</div>
      <table>
        <thead><tr><th>#</th><th>Description</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <div class="totals">
      <table class="totals-table">
        <tr><td>Subtotal</td><td class="text-right mono">${formatCurrency(subtotal)}</td></tr>
        <tr><td>VAT 15%</td><td class="text-right mono">${formatCurrency(taxAmount)}</td></tr>
        <tr class="total-row"><td>Total</td><td class="text-right mono">${formatCurrency(totalAmount)}</td></tr>
        <tr><td>Paid</td><td class="text-right mono">${formatCurrency(paidAmount)}</td></tr>
        <tr><td>Balance Due</td><td class="text-right mono" style="color:#dc2626;font-weight:700">${formatCurrency(balance)}</td></tr>
      </table>
    </div>
    <div class="section" style="margin-top:20px;">
      <div class="section-label">Payment Terms</div>
      <p style="font-size:12px;color:#64748b;">Payment is due by ${formatDate(invoice.dueDate)}. Please reference invoice number ${invoice.invoiceNumber} on your payment.</p>
    </div>
    <div class="thank-you">Thank you for your business!</div>`

  return wrapDocument(`Invoice ${invoice.invoiceNumber}`, body)
}

export function generateReceiptPDF(payment: any, companyName: string = "BuildProp"): string {
  const isReceived = payment.type === "received"

  const body = `
    <div style="max-width:500px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:24px;">
        <p style="font-size:32px;font-weight:700;color:${isReceived ? "#16a34a" : "#dc2626"};">PAYMENT RECEIPT</p>
        <p style="color:#64748b;">Receipt # ${payment.paymentNumber}</p>
      </div>
      <table style="width:100%;margin-bottom:20px;">
        <tr><td style="padding:8px 0;color:#64748b;width:40%;">Receipt Number</td><td style="padding:8px 0;font-weight:600;" class="mono">${payment.paymentNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;" class="mono">${formatDate(payment.paymentDate)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">From</td><td style="padding:8px 0;font-weight:600;">${payment.contactName || "N/A"}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Type</td><td style="padding:8px 0;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;${isReceived ? "background:#dcfce7;color:#16a34a;" : "background:#fee2e2;color:#dc2626;"}">${isReceived ? "Payment Received" : "Payment Made"}</span></td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Payment Method</td><td style="padding:8px 0;">${payment.paymentMethod ? payment.paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "N/A"}</td></tr>
        ${payment.invoice ? `<tr><td style="padding:8px 0;color:#64748b;">Related Invoice</td><td style="padding:8px 0;" class="mono">${payment.invoice.invoiceNumber || ""}</td></tr>` : ""}
      </table>
      <div style="background:${isReceived ? "#f0fdf4" : "#fef2f2"};border:2px solid ${isReceived ? "#bbf7d0" : "#fecaca"};border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
        <p style="font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:1px;">Amount</p>
        <p style="font-size:36px;font-weight:700;color:${isReceived ? "#16a34a" : "#dc2626"};" class="mono">${isReceived ? "+" : "-"}${formatCurrency(payment.amount)}</p>
      </div>
      <div class="thank-you">Thank you for your payment! If you have questions about this receipt, please contact us.</div>
    </div>`

  return wrapDocument(`Receipt ${payment.paymentNumber}`, body)
}

export function generatePropertyBrochurePDF(property: any, companyName: string = "BuildProp"): string {
  let images: string[] = []
  if (property.images) {
    try {
      const parsed = JSON.parse(property.images)
      if (Array.isArray(parsed)) images = parsed
    } catch {}
  }

  const imageHtml = images.length > 0
    ? images.map((url: string) => `<img src="${url}" style="width:100%;max-height:400px;object-fit:cover;border-radius:8px;margin-bottom:10px;" />`).join("")
    : `<div style="background:#f1f5f9;height:300px;display:flex;align-items:center;justify-content:center;border-radius:8px;margin:20px 0;color:#94a3b8;font-size:18px;">No images available</div>`

  const badgeColor = property.status === "sold"
    ? "background:#fee2e2;color:#dc2626;"
    : "background:#dcfce7;color:#16a34a;"

  const body = `
    ${imageHtml}
    <h1 style="font-size:28px;font-weight:700;color:#0f172a;margin:16px 0 8px;">${property.name}</h1>
    <p style="font-size:28px;font-weight:700;color:#f97316;margin-bottom:12px;">${formatCurrency(property.price)}</p>
    <div><span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;${badgeColor}">${property.status ? property.status.charAt(0).toUpperCase() + property.status.slice(1) : "N/A"}</span></div>
    <p style="color:#64748b;margin:16px 0;">${property.description || ""}</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:20px 0;">
      <div style="background:#f8fafc;padding:14px;border-radius:8px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#0f172a;">${property.areaSqft || "N/A"}</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;">Area (sqft)</div>
      </div>
      <div style="background:#f8fafc;padding:14px;border-radius:8px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#0f172a;">${property.bedrooms != null ? property.bedrooms : "N/A"}</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;">Bedrooms</div>
      </div>
      <div style="background:#f8fafc;padding:14px;border-radius:8px;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#0f172a;">${property.bathrooms != null ? property.bathrooms : "N/A"}</div>
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;">Bathrooms</div>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px;border-radius:8px;margin-top:20px;">
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="color:#64748b;">Type</span><span>${property.propertyType ? property.propertyType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "N/A"}</span></div>
      <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="color:#64748b;">Location</span><span>${[property.address, property.city].filter(Boolean).join(", ") || "N/A"}</span></div>
      ${property.rentalPrice ? `<div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="color:#64748b;">Rental Price</span><span>${formatCurrency(property.rentalPrice)}/mo</span></div>` : ""}
    </div>
    <div style="text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
      <p>For inquiries, contact ${companyName}</p>
      <p style="color:#f97316;font-size:14px;font-weight:bold;">Generated by BuildProp</p>
    </div>`

  return wrapDocument(property.name || "Property Brochure", body)
}

export function generateQuotationPDF(quotation: any, items: any[], companyName: string = "BuildProp"): string {
  const itemRows = items.length > 0
    ? items.map((item: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${item.description}</td>
        <td class="text-right mono">${parseFloat(item.quantity).toLocaleString()}</td>
        <td class="text-right mono">${formatCurrency(item.unitPrice)}</td>
        <td class="text-right mono">${formatCurrency(item.amount || (item.quantity * item.unitPrice))}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" style="color:#94a3b8;text-align:center;padding:20px;">No line items</td></tr>`

  const subtotal = quotation.subtotal || 0
  const taxAmount = quotation.taxAmount || 0
  const totalAmount = quotation.totalAmount || 0

  const body = `
    <div style="display:flex;gap:40px;margin-bottom:20px;">
      <div style="flex:1;">
        <div class="section-label">Quotation Details</div>
        <p><strong>Quote #:</strong> ${quotation.quoteNumber || quotation.id}</p>
        <p><strong>Issue Date:</strong> ${formatDate(quotation.issueDate || quotation.createdAt)}</p>
        <p><strong>Valid Until:</strong> ${formatDate(quotation.validUntil)}</p>
      </div>
      <div style="flex:1;">
        <div class="section-label">Prepared For</div>
        <p>${quotation.contactName || "N/A"}</p>
      </div>
    </div>
    <div class="section">
      <div class="section-label">Line Items</div>
      <table>
        <thead><tr><th>#</th><th>Description</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>
    <div class="totals">
      <table class="totals-table">
        <tr><td>Subtotal</td><td class="text-right mono">${formatCurrency(subtotal)}</td></tr>
        <tr><td>VAT 15%</td><td class="text-right mono">${formatCurrency(taxAmount)}</td></tr>
        <tr class="total-row"><td>Total</td><td class="text-right mono">${formatCurrency(totalAmount)}</td></tr>
      </table>
    </div>
    <div class="section" style="margin-top:20px;">
      <div class="section-label">Terms & Conditions</div>
      <p style="font-size:12px;color:#64748b;">This quotation is valid for 30 days from the date of issue. Prices are subject to change after this period. Payment terms will be agreed upon acceptance.</p>
    </div>
    <div class="thank-you">We look forward to working with you!</div>`

  return wrapDocument(`Quotation ${quotation.quoteNumber || quotation.id}`, body)
}
