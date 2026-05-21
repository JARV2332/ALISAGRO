/** Genera PDF desde un nodo HTML (plantilla ReportPdfTemplate). */

export async function descargarReportePdf(elemento, nombreArchivo = 'alisagro-reporte.pdf') {
  if (!elemento) throw new Error('No hay plantilla PDF')

  const html2pdf = (await import('html2pdf.js')).default

  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 350)))

  const opt = {
    margin: [10, 10, 12, 10],
    filename: nombreArchivo,
    image: { type: 'jpeg', quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], before: '.pdf-page-break' },
  }

  await html2pdf().set(opt).from(elemento).save()
}
