import autoTable from "jspdf-autotable"
import { createPdfDoc, drawPdfHeader, drawPdfFooter, pdfSafe } from "@/lib/pdf-generator"
import type { jsPDF } from "jspdf"

const MARGIN = 15
const PAGE_WIDTH = 210

const COLOR = {
  dark: [15, 23, 42] as [number, number, number],
  slate: [30, 41, 59] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  lightBg: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  orange: [249, 115, 22] as [number, number, number],
}

function ensurePdfExtension(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`
}

function drawReportHeader(doc: jsPDF, title: string, subtitle?: string): number {
  let y = drawPdfHeader(doc, "BuildProp", title)
  if (subtitle) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.gray)
    doc.text(pdfSafe(subtitle), PAGE_WIDTH - MARGIN, y, { align: "right" })
    y += 6
  } else {
    y += 2
  }
  return y
}

/** Draws a small continuation header when a report spills onto a new page. */
function drawContinuationHeader(doc: jsPDF, title: string) {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(...COLOR.dark)
  doc.text(pdfSafe(title), MARGIN, 15)
  doc.setDrawColor(...COLOR.orange)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, 18, PAGE_WIDTH - MARGIN, 18)
}

export function exportToPdf(options: {
  title: string
  subtitle?: string
  headers: string[]
  rows: (string | number)[][]
  filename?: string
}) {
  const { title, subtitle, headers, rows, filename } = options
  const doc = createPdfDoc()
  const y = drawReportHeader(doc, title, subtitle)

  const body = rows.length > 0
    ? rows.map((row) => row.map((cell) => pdfSafe(cell)))
    : [headers.map(() => "No data available")]

  autoTable(doc, {
    head: [headers.map((h) => pdfSafe(h))],
    body,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5, textColor: COLOR.slate, lineColor: COLOR.border, lineWidth: 0.2 },
    headStyles: { fillColor: COLOR.dark, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: COLOR.lightBg },
  })

  drawPdfFooter(doc)
  doc.save(ensurePdfExtension(filename || "buildprop-export"))
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
  const { title, subtitle, sections, filename } = options
  const doc = createPdfDoc()
  let y = drawReportHeader(doc, title, subtitle)

  sections.forEach((section) => {
    const body = section.rows.length > 0
      ? section.rows.map((row) => row.map((cell) => pdfSafe(cell)))
      : [section.headers.map(() => "No data available")]

    // Start a new page (with a small continuation header) if the section won't fit.
    if (y > 250) {
      doc.addPage()
      drawContinuationHeader(doc, title)
      y = 24
    }

    // Section heading + rule
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(...COLOR.dark)
    doc.text(pdfSafe(section.title), MARGIN, y)
    y += 3
    doc.setDrawColor(...COLOR.border)
    doc.setLineWidth(0.4)
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
    y += 5

    autoTable(doc, {
      head: [section.headers.map((h) => pdfSafe(h))],
      body,
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.5, textColor: COLOR.slate, lineColor: COLOR.border, lineWidth: 0.2 },
      headStyles: { fillColor: COLOR.dark, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: COLOR.lightBg },
    })
    y = (doc as any).lastAutoTable?.finalY ?? y
    y += 12
  })

  drawPdfFooter(doc)
  doc.save(ensurePdfExtension(filename || "buildprop-report"))
}
