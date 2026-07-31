import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { formatDate, getCurrency, toNum } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Shared layout constants and helpers (also used by src/lib/pdf-export.ts)
// ---------------------------------------------------------------------------

type RGB = [number, number, number]

const PAGE_WIDTH = 210 // A4 in mm
const MARGIN = 15
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2 // 180

const COLOR = {
  orange: [249, 115, 22] as RGB,
  dark: [15, 23, 42] as RGB,
  slate: [30, 41, 59] as RGB,
  gray: [100, 116, 139] as RGB,
  lightGray: [148, 163, 184] as RGB,
  lightBg: [248, 250, 252] as RGB,
  border: [226, 232, 240] as RGB,
  red: [220, 38, 38] as RGB,
  green: [22, 163, 74] as RGB,
}

export function createPdfDoc(): jsPDF {
  return new jsPDF({ unit: "mm", format: "a4" })
}

/** Strip characters the built-in Helvetica (WinAnsi) font cannot render. */
export function pdfSafe(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return ""
  return String(text)
    .replace(/\u20b5/g, "") // ₵ (Ghana cedi) -> keep the "GH" prefix
    .replace(/\u20a6/g, "NGN ") // ₦ (Naira)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "")
}

/** Currency formatting that is safe for jsPDF's built-in fonts. */
export function pdfCurrency(amount: number | string): string {
  const num = toNum(amount)
  const currency = getCurrency()
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
  return `${currency} ${formatted}`
}

/** Remove characters that are invalid in Windows filenames. */
export function safeFilename(name: string): string {
  const cleaned = pdfSafe(name).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim()
  return cleaned || "BuildProp-Document"
}

function ensurePdfExtension(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`
}

/** Draws the BuildProp-branded document header. Returns the Y position after it. */
export function drawPdfHeader(doc: jsPDF, companyName: string, title: string): number {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(17)
  doc.setTextColor(...COLOR.dark)
  doc.text(pdfSafe(companyName) || "BuildProp", MARGIN, 20)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...COLOR.gray)
  doc.text("123 Construction Ave, Building District", MARGIN, 25)
  doc.text("+1 (555) 000-0000", MARGIN, 29)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(...COLOR.orange)
  doc.text(pdfSafe(title), PAGE_WIDTH - MARGIN, 24, { align: "right" })

  doc.setDrawColor(...COLOR.orange)
  doc.setLineWidth(1)
  doc.line(MARGIN, 35, PAGE_WIDTH - MARGIN, 35)

  return 42
}

/** Draws the footer (generated date + brand) on every page. Call after all content. */
export function drawPdfFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(...COLOR.border)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, 287, PAGE_WIDTH - MARGIN, 287)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...COLOR.lightGray)
    doc.text(`Generated on ${date}`, MARGIN, 291)
    doc.text("BuildProp - Construction & Real Estate Management", PAGE_WIDTH - MARGIN, 291, { align: "right" })
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH / 2, 291, { align: "center" })
  }
}

function drawSectionLabel(doc: jsPDF, text: string, x: number, y: number): number {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...COLOR.orange)
  doc.text(text.toUpperCase(), x, y)
  return y + 5
}

function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""
}

function methodLabel(m: string): string {
  return (m || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusLabel(s: string): string {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function lastAutoTableY(doc: jsPDF): number {
  return (doc as any).lastAutoTable?.finalY ?? 42
}

const baseTableStyles = {
  fontSize: 9,
  cellPadding: 2.5,
  textColor: COLOR.slate,
  lineColor: COLOR.border,
  lineWidth: 0.2,
} as const

// ---------------------------------------------------------------------------
// downloadHTML — kept exported; some features export HTML to a .html file
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export function generateInvoicePDF(invoice: any, items: any[], companyName: string = "BuildProp") {
  const doc = createPdfDoc()
  let y = drawPdfHeader(doc, companyName, "INVOICE") + 3

  // --- Invoice details + Bill To (side by side) ---
  const labelY = y
  const leftLabelY = drawSectionLabel(doc, "Invoice Details", MARGIN, labelY)

  const detailRows: [string, string][] = [
    ["Invoice #", pdfSafe(invoice.invoiceNumber) || "—"],
    ["Type", capFirst(invoice.type) || "N/A"],
    ["Issue Date", pdfSafe(formatDate(invoice.issueDate))],
    ["Due Date", pdfSafe(formatDate(invoice.dueDate))],
  ]
  autoTable(doc, {
    body: detailRows,
    startY: leftLabelY,
    margin: { left: MARGIN, right: PAGE_WIDTH / 2 },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, textColor: COLOR.slate, lineColor: COLOR.border, lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: COLOR.gray, cellWidth: 34 },
      1: { fontStyle: "bold" },
    },
  })
  const leftY = lastAutoTableY(doc)

  const billRows: [string, string][] = [["Client", pdfSafe(invoice.contactName) || "N/A"]]
  if (invoice.contactId) billRows.push(["Contact ID", pdfSafe(invoice.contactId)])
  const rightLabelY = drawSectionLabel(doc, "Bill To", PAGE_WIDTH / 2, labelY)
  autoTable(doc, {
    body: billRows,
    startY: rightLabelY,
    margin: { left: PAGE_WIDTH / 2, right: MARGIN },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, textColor: COLOR.slate, lineColor: COLOR.border, lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: COLOR.gray, cellWidth: 30 },
      1: { fontStyle: "bold" },
    },
  })
  const rightY = lastAutoTableY(doc)
  y = Math.max(leftY, rightY) + 8

  // --- Line items ---
  y = drawSectionLabel(doc, "Line Items", MARGIN, y)
  const itemBody = items.length > 0
    ? items.map((item, i) => [
        String(i + 1),
        pdfSafe(item.description) || "—",
        toNum(item.quantity).toLocaleString(),
        pdfCurrency(item.unitPrice),
        pdfCurrency(item.amount ?? (item.quantity * item.unitPrice)),
      ])
    : [["", "No line items", "", "", ""]]

  autoTable(doc, {
    head: [["#", "Description", "Qty", "Unit Price", "Total"]],
    body: itemBody,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: baseTableStyles,
    headStyles: { fillColor: COLOR.orange, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: COLOR.lightBg },
    columnStyles: {
      0: { cellWidth: 14 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  })
  y = lastAutoTableY(doc) + 10

  // --- Totals ---
  const subtotal = toNum(invoice.subtotal)
  const taxAmount = toNum(invoice.taxAmount)
  const totalAmount = toNum(invoice.totalAmount)
  const paidAmount = toNum(invoice.paidAmount)
  const balance = totalAmount - paidAmount

  autoTable(doc, {
    body: [
      ["Subtotal", pdfCurrency(subtotal)],
      ["VAT 15%", pdfCurrency(taxAmount)],
      ["Total", pdfCurrency(totalAmount)],
      ["Paid", pdfCurrency(paidAmount)],
      ["Balance Due", pdfCurrency(balance)],
    ],
    startY: y,
    margin: { left: 110, right: MARGIN },
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 1.8, textColor: COLOR.slate },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.section !== "body") return
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = "bold"
        data.cell.styles.fontSize = 11
        data.cell.styles.textColor = COLOR.dark
        data.cell.styles.lineWidth = { top: 0.4 }
        data.cell.styles.lineColor = COLOR.dark
      }
      if (data.row.index === 4) {
        data.cell.styles.fontStyle = "bold"
        data.cell.styles.textColor = COLOR.red
      }
    },
  })
  y = lastAutoTableY(doc) + 10

  // --- Payment terms ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...COLOR.orange)
  doc.text("PAYMENT TERMS", MARGIN, y)
  y += 5.5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  const terms = `Payment is due by ${formatDate(invoice.dueDate)}. Please reference invoice number ${pdfSafe(invoice.invoiceNumber)} on your payment.`
  const termLines = doc.splitTextToSize(terms, CONTENT_WIDTH)
  doc.text(termLines, MARGIN, y)
  y += termLines.length * 4.5 + 10

  // --- Thank you ---
  doc.setFont("helvetica", "italic")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  doc.text("Thank you for your business!", PAGE_WIDTH / 2, y, { align: "center" })

  drawPdfFooter(doc)
  doc.save(ensurePdfExtension(`Invoice-${safeFilename(invoice.invoiceNumber)}`))
}

// ---------------------------------------------------------------------------
// Receipt
// ---------------------------------------------------------------------------

export function generateReceiptPDF(payment: any, companyName: string = "BuildProp") {
  const doc = createPdfDoc()
  drawPdfHeader(doc, companyName, "PAYMENT RECEIPT")

  const isReceived = payment.type === "received"
  const accent = isReceived ? COLOR.green : COLOR.red

  doc.setFont("helvetica", "bold")
  doc.setFontSize(24)
  doc.setTextColor(...accent)
  doc.text("PAYMENT RECEIPT", PAGE_WIDTH / 2, 56, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...COLOR.gray)
  doc.text(`Receipt # ${pdfSafe(payment.paymentNumber)}`, PAGE_WIDTH / 2, 62, { align: "center" })

  const rows: [string, string][] = [
    ["Receipt Number", pdfSafe(payment.paymentNumber) || "—"],
    ["Date", pdfSafe(formatDate(payment.paymentDate))],
    [isReceived ? "Received From" : "Paid To", pdfSafe(payment.contactName) || "N/A"],
    ["Type", isReceived ? "Payment Received" : "Payment Made"],
    ["Payment Method", methodLabel(payment.paymentMethod) || "N/A"],
  ]
  if (payment.invoice?.invoiceNumber) rows.push(["Related Invoice", pdfSafe(payment.invoice.invoiceNumber)])

  autoTable(doc, {
    body: rows,
    startY: 74,
    margin: { left: 50, right: 50 },
    theme: "grid",
    styles: { fontSize: 9.5, cellPadding: 3, textColor: COLOR.slate, lineColor: COLOR.border, lineWidth: 0.2 },
    columnStyles: { 0: { fontStyle: "bold", textColor: COLOR.gray, cellWidth: 45 } },
  })
  let y = lastAutoTableY(doc) + 14

  // Amount box
  const boxX = 60
  const boxW = PAGE_WIDTH - 120
  const amountBoxFill = (isReceived ? [240, 253, 244] : [254, 242, 242]) as RGB
  doc.setFillColor(...amountBoxFill)
  doc.setDrawColor(...accent)
  doc.setLineWidth(0.5)
  doc.roundedRect(boxX, y, boxW, 34, 4, 4, "FD")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...COLOR.gray)
  doc.text("AMOUNT", PAGE_WIDTH / 2, y + 10, { align: "center" })
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(...accent)
  doc.text(`${isReceived ? "+" : "-"}${pdfCurrency(payment.amount)}`, PAGE_WIDTH / 2, y + 23, { align: "center" })
  y += 34 + 16

  doc.setFont("helvetica", "italic")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  const thanks = doc.splitTextToSize(
    "Thank you for your payment! If you have questions about this receipt, please contact us.",
    CONTENT_WIDTH,
  )
  doc.text(thanks, PAGE_WIDTH / 2, y, { align: "center" })

  drawPdfFooter(doc)
  doc.save(ensurePdfExtension(`Receipt-${safeFilename(payment.paymentNumber)}`))
}

// ---------------------------------------------------------------------------
// Property brochure
// ---------------------------------------------------------------------------

export function generatePropertyBrochurePDF(property: any, companyName: string = "BuildProp") {
  const doc = createPdfDoc()
  const title = pdfSafe(property.name) || "Property Brochure"
  drawPdfHeader(doc, companyName, "PROPERTY BROCHURE")

  let y = 52

  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(...COLOR.dark)
  doc.text(title, MARGIN, y)
  y += 9

  doc.setFontSize(18)
  doc.setTextColor(...COLOR.orange)
  doc.text(pdfCurrency(property.price), MARGIN, y)
  y += 8

  const status = statusLabel(property.status)
  if (status) {
    const statusColor = property.status === "sold" ? COLOR.red : COLOR.green
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...statusColor)
    doc.text(status, MARGIN, y)
    y += 7
  }

  const description = pdfSafe(property.description)
  if (description) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9.5)
    doc.setTextColor(...COLOR.gray)
    const descLines = doc.splitTextToSize(description, CONTENT_WIDTH)
    doc.text(descLines, MARGIN, y)
    y += descLines.length * 4.5 + 8
  }

  // Stats boxes
  const stats: { label: string; value: string }[] = [
    {
      label: "Area (sqft)",
      value: property.areaSqft != null && property.areaSqft !== "" ? Number(property.areaSqft).toLocaleString() : "N/A",
    },
    { label: "Bedrooms", value: property.bedrooms != null ? String(property.bedrooms) : "N/A" },
    { label: "Bathrooms", value: property.bathrooms != null ? String(property.bathrooms) : "N/A" },
  ]
  const statBoxW = (CONTENT_WIDTH - 16) / 3
  stats.forEach((s, i) => {
    const x = MARGIN + i * (statBoxW + 8)
    doc.setFillColor(...COLOR.lightBg)
    doc.setDrawColor(...COLOR.border)
    doc.setLineWidth(0.2)
    doc.roundedRect(x, y, statBoxW, 20, 2, 2, "FD")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(...COLOR.dark)
    doc.text(s.value, x + statBoxW / 2, y + 8, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7)
    doc.setTextColor(...COLOR.gray)
    doc.text(s.label, x + statBoxW / 2, y + 14.5, { align: "center" })
  })
  y += 20 + 10

  // Details block
  const details: [string, string][] = [
    ["Type", capFirst(property.propertyType) || "N/A"],
    ["Location", pdfSafe([property.address, property.city, property.state].filter(Boolean).join(", ")) || "N/A"],
  ]
  if (property.rentalPrice != null && property.rentalPrice !== "") {
    details.push(["Rental Price", `${pdfCurrency(property.rentalPrice)}/mo`])
  }

  autoTable(doc, {
    body: details,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: { fontSize: 9.5, cellPadding: 3, textColor: COLOR.slate, lineColor: COLOR.border, lineWidth: 0.2 },
    columnStyles: { 0: { fontStyle: "bold", textColor: COLOR.gray, cellWidth: 45 }, 1: { fontStyle: "bold" } },
  })
  y = lastAutoTableY(doc) + 12

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  doc.text(`For inquiries, contact ${pdfSafe(companyName)}`, PAGE_WIDTH / 2, y, { align: "center" })
  y += 5.5
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...COLOR.orange)
  doc.text("Generated by BuildProp", PAGE_WIDTH / 2, y, { align: "center" })

  drawPdfFooter(doc)
  doc.save(ensurePdfExtension(`Property-${safeFilename(property.name)}`))
}

// ---------------------------------------------------------------------------
// Quotation
// ---------------------------------------------------------------------------

export function generateQuotationPDF(quotation: any, items: any[], companyName: string = "BuildProp") {
  const doc = createPdfDoc()
  let y = drawPdfHeader(doc, companyName, "QUOTATION") + 3
  const quoteNumber = pdfSafe(quotation.quoteNumber ?? quotation.id) || "—"

  // --- Quotation details + Prepared For ---
  const labelY = y
  const leftLabelY = drawSectionLabel(doc, "Quotation Details", MARGIN, labelY)

  const detailRows: [string, string][] = [
    ["Quote #", quoteNumber],
    ["Issue Date", pdfSafe(formatDate(quotation.issueDate || quotation.createdAt))],
    ["Valid Until", pdfSafe(formatDate(quotation.validUntil))],
  ]
  autoTable(doc, {
    body: detailRows,
    startY: leftLabelY,
    margin: { left: MARGIN, right: PAGE_WIDTH / 2 },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, textColor: COLOR.slate, lineColor: COLOR.border, lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: COLOR.gray, cellWidth: 34 },
      1: { fontStyle: "bold" },
    },
  })
  const leftY = lastAutoTableY(doc)

  const rightLabelY = drawSectionLabel(doc, "Prepared For", PAGE_WIDTH / 2, labelY)
  autoTable(doc, {
    body: [["Client", pdfSafe(quotation.contactName) || "N/A"]],
    startY: rightLabelY,
    margin: { left: PAGE_WIDTH / 2, right: MARGIN },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2, textColor: COLOR.slate, lineColor: COLOR.border, lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: COLOR.gray, cellWidth: 30 },
      1: { fontStyle: "bold" },
    },
  })
  const rightY = lastAutoTableY(doc)
  y = Math.max(leftY, rightY) + 8

  // --- Line items ---
  y = drawSectionLabel(doc, "Line Items", MARGIN, y)
  const itemBody = items.length > 0
    ? items.map((item, i) => [
        String(i + 1),
        pdfSafe(item.description) || "—",
        toNum(item.quantity).toLocaleString(),
        pdfCurrency(item.unitPrice),
        pdfCurrency(item.amount ?? (item.quantity * item.unitPrice)),
      ])
    : [["", "No line items", "", "", ""]]

  autoTable(doc, {
    head: [["#", "Description", "Qty", "Unit Price", "Total"]],
    body: itemBody,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: baseTableStyles,
    headStyles: { fillColor: COLOR.orange, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: COLOR.lightBg },
    columnStyles: {
      0: { cellWidth: 14 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  })
  y = lastAutoTableY(doc) + 10

  // --- Totals ---
  autoTable(doc, {
    body: [
      ["Subtotal", pdfCurrency(quotation.subtotal)],
      ["VAT 15%", pdfCurrency(quotation.taxAmount)],
      ["Total", pdfCurrency(quotation.totalAmount)],
    ],
    startY: y,
    margin: { left: 110, right: MARGIN },
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: 1.8, textColor: COLOR.slate },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    didParseCell: (data) => {
      if (data.section !== "body") return
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = "bold"
        data.cell.styles.fontSize = 11
        data.cell.styles.textColor = COLOR.dark
        data.cell.styles.lineWidth = { top: 0.4 }
        data.cell.styles.lineColor = COLOR.dark
      }
    },
  })
  y = lastAutoTableY(doc) + 10

  // --- Terms & conditions ---
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(...COLOR.orange)
  doc.text("TERMS & CONDITIONS", MARGIN, y)
  y += 5.5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  const terms = "This quotation is valid for 30 days from the date of issue. Prices are subject to change after this period. Payment terms will be agreed upon acceptance."
  const termLines = doc.splitTextToSize(terms, CONTENT_WIDTH)
  doc.text(termLines, MARGIN, y)
  y += termLines.length * 4.5 + 10

  doc.setFont("helvetica", "italic")
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.gray)
  doc.text("We look forward to working with you!", PAGE_WIDTH / 2, y, { align: "center" })

  drawPdfFooter(doc)
  doc.save(ensurePdfExtension(`Quotation-${safeFilename(quotation.quoteNumber ?? quotation.id)}`))
}
