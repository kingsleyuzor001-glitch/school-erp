import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Renders a DOM element to a downloadable PDF. "card" produces a
 * CR80-sized PDF (standard ID card, 85.6 x 54mm) for ID cards;
 * "a4" is for letters/report cards. The element is captured at 2x
 * scale for print-quality output, then centered on the page.
 */
export async function exportElementToPdf(
  element: HTMLElement, filename: string, format: "a4" | "card" = "a4"
) {
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");

  const pdf = format === "card"
    ? new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] })
    : new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;

  pdf.addImage(imgData, "PNG", (pageWidth - w) / 2, (pageHeight - h) / 2, w, h);
  pdf.save(filename);
}
