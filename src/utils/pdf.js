let jsPDFCargado = false;

export function cargarjsPDF() {
  return new Promise((res, rej) => {
    if (jsPDFCargado && window.jspdf) { res(); return; }
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      s2.onload = () => { jsPDFCargado = true; res(); };
      s2.onerror = rej;
      document.head.appendChild(s2);
    };
    s1.onerror = rej;
    document.head.appendChild(s1);
  });
}

export function construirPDF(doc, grupo, columnas, titulo, colGrupo) {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(9, 9, 11);
  doc.rect(0, 0, ancho, 30, 'F');
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(10, 7, 16, 16, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OX', 18, 17, { align: 'center' });

  const nombre = grupo.name.length > 68 ? grupo.name.slice(0, 66) + '\u2026' : grupo.name;
  doc.setFontSize(14);
  doc.text(nombre, 30, 13);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(161, 161, 170);
  doc.text(
    `${titulo}  ·  Columna: ${colGrupo}  ·  ${grupo.count} participante${grupo.count !== 1 ? 's' : ''}`,
    30, 22,
  );

  const fecha = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(8);
  doc.text(fecha, ancho - 14, 13, { align: 'right' });

  const heads = columnas.map(c => c.clave.length > 22 ? c.clave.slice(0, 20) + '\u2026' : c.clave);
  const body = grupo.members.map((m, i) => [
    String(i + 1),
    ...columnas.map(c => {
      const v = String(m[c.clave] ?? '\u2014');
      return v.length > 48 ? v.slice(0, 46) + '\u2026' : v;
    }),
  ]);

  doc.autoTable({
    startY: 36,
    head: [['#', ...heads]],
    body,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, textColor: [9, 9, 11], font: 'helvetica' },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    columnStyles: { 0: { cellWidth: 10, halign: 'center', textColor: [113, 113, 122] } },
    margin: { left: 12, right: 12 },
    didDrawPage: data => {
      const pg = doc.internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(161, 161, 170);
      doc.text(
        `P\u00e1gina ${data.pageNumber} de ${pg}  \u00b7  OpenExcel  \u00b7  ${new Date().toLocaleDateString('es-DO')}`,
        ancho / 2,
        doc.internal.pageSize.getHeight() - 6,
        { align: 'center' },
      );
    },
  });
}

export async function exportarPDF(grupo, columnas, titulo, colGrupo) {
  await cargarjsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  construirPDF(doc, grupo, columnas, titulo, colGrupo);
  doc.save(`${grupo.name.replace(/[^\w\s]/g, '_').slice(0, 48)}.pdf`);
}

export async function exportarTodosPDF(grupos, columnas, titulo, colGrupo) {
  await cargarjsPDF();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  grupos.forEach((g, i) => {
    if (i > 0) doc.addPage();
    construirPDF(doc, g, columnas, titulo, colGrupo);
  });
  doc.save(`${titulo.replace(/[^\w\s]/g, '_').slice(0, 40)}_todos.pdf`);
}
