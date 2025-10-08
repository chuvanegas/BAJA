import * as XLSX from 'xlsx';
import type { GlobalAfSummary, CoincidenceReport } from './types';

export const exportToExcel = (globalAF: GlobalAfSummary) => {
  if (Object.keys(globalAF).length === 0) {
    console.error("No hay datos AF para exportar");
    return;
  }
  const wb = XLSX.utils.book_new();

  // Hoja Consolidado
  const consolidadoData = [
    ["Nombre del prestador", "NI", "Contrato", "Tipo de servicio", "Régimen", "Valor LMA Total", "Departamento", "Municipio"]
  ];
  let totalGeneral = 0;
  Object.values(globalAF).forEach(af => {
    consolidadoData.push([af.nombrePrestador, af.NI, af.contrato, af.tipoServicio, af.regimen, af.valorTotal, af.departamento || '', af.municipio || '']);
    totalGeneral += af.valorTotal;
  });
  consolidadoData.push([]);
  consolidadoData.push(["", "", "", "", "TOTAL GENERAL", totalGeneral]);

  const wsCons = XLSX.utils.aoa_to_sheet(consolidadoData);
  // Formatting currency columns
  wsCons['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  Object.keys(wsCons).forEach(key => {
    if(key.startsWith('F')) {
      const cell = wsCons[key];
      if (cell.v && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = '$#,##0';
      }
    }
  });

  XLSX.utils.book_append_sheet(wb, wsCons, "Consolidado");

  // Hojas individuales
  Object.values(globalAF).forEach(af => {
    const individualData = [
      ["Nombre del prestador", af.nombrePrestador],
      ["NI", af.NI],
      ["Número de contrato", af.contrato],
      ["Tipo de servicio", af.tipoServicio],
      ["Régimen", af.regimen],
      ["Departamento", af.departamento || ''],
      ["Municipio", af.municipio || ''],
      [],
      ["Periodo", "Valor LMA", "Archivo origen"]
    ];
    af.detalles.forEach(d => {
      individualData.push([d.periodo, d.valor, d.archivo]);
    });
    individualData.push([]);
    individualData.push(["TOTAL", af.valorTotal]);

    const ws = XLSX.utils.aoa_to_sheet(individualData);
    ws['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 30 }];
     Object.keys(ws).forEach(key => {
      if(key.startsWith('B')) {
        const cell = ws[key];
        if (cell.v && typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = '$#,##0';
        }
      }
    });

    const safeSheetName = af.nombrePrestador.replace(/[/\\?*[\]]/g, '').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  });

  XLSX.writeFile(wb, "Resumen_AF.xlsx");
};


export const exportCoincidenceToExcel = (report: CoincidenceReport) => {
    if (!report || !report.data || report.data.length === 0) {
        console.error("No hay datos de coincidencia para exportar");
        return;
    }
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([]);
    const prestador = Object.values(report.prestadores)[0];

    // --- STYLES ---
    const headerStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "4F81BD" } }, alignment: { horizontal: "center", vertical: "center" } };
    const labelStyle = { font: { bold: true } };
    const currencyFormat = '$#,##0';
    const numberFormat = '#,##0';
    const fuFormat = '0.0000';

    // --- HEADER ---
    XLSX.utils.sheet_add_aoa(ws, [["Reporte de Coincidencias y Frecuencia de Uso"]], { origin: "A1" });
    if(ws["A1"]) {
        ws["A1"].s = { font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "2E75B5" } }, alignment: { horizontal: "center", vertical: "center" } };
    }
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }]; // Merge A1 to H1

    // --- PRESTADOR INFO ---
    const prestadorData = prestador ? [
        ["Nombre Prestador:", prestador.nombrePrestador, "NIT:", prestador.NI],
        ["Departamento:", prestador.departamento, "Municipio:", prestador.municipio],
        ["Número de contrato:", prestador.contrato, "Tipo de servicio:", prestador.tipoServicio],
        ["Valor por Contrato:", prestador.valorPorContrato, "Régimen:", prestador.regimen],
        ["Población por Contrato:", prestador.poblacion, "Población Total (RIPS):", report.poblacionTotal],
    ] : [["No se encontró información del prestador."]];

    XLSX.utils.sheet_add_aoa(ws, prestadorData, { origin: "A3" });
    
    if (prestador) {
        for (let r = 2; r < 7; r++) { // Iterate through rows 3 to 7
            if (ws[`A${r + 1}`]) ws[`A${r + 1}`].s = labelStyle; // A3, A4, A5, A6, A7
            if (ws[`C${r + 1}`]) ws[`C${r + 1}`].s = labelStyle; // C3, C4, C5, C6, C7
        }
        // Format specific cells
        if (ws['B6']) { ws['B6'].t = 'n'; ws['B6'].z = currencyFormat; }
        if (ws['B7']) { ws['B7'].t = 'n'; ws['B7'].z = numberFormat; }
        if (ws['D7']) { ws['D7'].t = 'n'; ws['D7'].z = numberFormat; }
    }
    
    // --- CUPS TABLE ---
    const tableHeaders = ["CUPS", "CUPS Vigente", "Nombre CUPS", "Tipo Ser", ...Object.keys(report.data[0]?.coincidences || {}), "Total", "FU"];
    XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: "A9" });

    const dataToExport = report.data.map(row => {
        const coincidences = Object.values(row.coincidences);
        return [row.cups, row.cupsVigente, row.nombre, row.tipoSer, ...coincidences, row.total, row.fu];
    });

    XLSX.utils.sheet_add_aoa(ws, dataToExport, { origin: "A10" });
    
    // --- Table Styles & Formatting ---
    tableHeaders.forEach((_h, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: 8, c: i });
        if(ws[cellRef]) ws[cellRef].s = headerStyle;
    });

    const fuColumn = tableHeaders.length - 1;
    dataToExport.forEach((_row, r) => {
        const fuCellRef = XLSX.utils.encode_cell({ r: r + 9, c: fuColumn });
        if(ws[fuCellRef] && typeof ws[fuCellRef].v === 'number') {
            ws[fuCellRef].z = fuFormat;
            ws[fuCellRef].t = 'n';
        }
    });
    
    // --- Column Widths ---
    ws['!cols'] = [
        { wch: 15 }, // CUPS
        { wch: 15 }, // CUPS Vigente
        { wch: 50 }, // Nombre CUPS
        { wch: 25 }, // Tipo Ser
        ...Object.keys(report.data[0]?.coincidences || {}).map(() => ({ wch: 8 })), // Segments
        { wch: 10 },  // Total
        { wch: 12 }   // FU
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Reporte Coincidencias");
    XLSX.writeFile(wb, "Reporte_Coincidencias_CUPS.xlsx");
}
