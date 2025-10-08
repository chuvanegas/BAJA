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
    const titleStyle = { font: { bold: true, sz: 16 }, fill: { fgColor: { rgb: "2E75B5" } }, alignment: { horizontal: "center", vertical: "center" } };
    const labelStyle = { font: { bold: true } };
    const currencyFormat = '$#,##0';
    const numberFormat = '#,##0';
    const fuFormat = '0.0000';

    // --- HEADER ---
    let currentRow = 0;
    XLSX.utils.sheet_add_aoa(ws, [["Reporte de Coincidencias y Frecuencia de Uso"]], { origin: `A${currentRow + 1}` });
    ws[`A${currentRow + 1}`].s = titleStyle;
    ws['!merges'] = [{ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 13 } }];
    currentRow += 2;

    // --- PRESTADOR INFO ---
    if (prestador) {
        const prestadorData = [
            ["Nombre Prestador:", prestador.nombrePrestador, "", "NIT:", prestador.NI],
            ["Departamento:", prestador.departamento, "", "Municipio:", prestador.municipio],
            ["Número de contrato:", prestador.contrato, "", "Tipo de servicio:", prestador.tipoServicio],
            ["Valor por Contrato:", prestador.valorPorContrato, "", "Régimen:", prestador.regimen],
            ["Población por Contrato:", prestador.poblacion, "", "Población Total (RIPS):", report.poblacionTotal],
        ];

        XLSX.utils.sheet_add_aoa(ws, prestadorData, { origin: `A${currentRow + 1}` });
        
        prestadorData.forEach((_, r) => {
            const rowIndex = currentRow + r + 1;
            if (ws[`A${rowIndex}`]) ws[`A${rowIndex}`].s = labelStyle;
            if (ws[`D${rowIndex}`]) ws[`D${rowIndex}`].s = labelStyle;
        });

        // Format specific cells
        const baseRow = currentRow + 1;
        if (ws[`B${baseRow + 3}`]) { ws[`B${baseRow + 3}`].t = 'n'; ws[`B${baseRow + 3}`].z = currencyFormat; } // Valor por Contrato
        if (ws[`B${baseRow + 4}`]) { ws[`B${baseRow + 4}`].t = 'n'; ws[`B${baseRow + 4}`].z = numberFormat; }   // Poblacion por Contrato
        if (ws[`E${baseRow + 4}`]) { ws[`E${baseRow + 4}`].t = 'n'; ws[`E${baseRow + 4}`].z = numberFormat; }   // Poblacion Total (RIPS)

        currentRow += prestadorData.length + 1;
    }
    
    // --- CUPS TABLE ---
    const tableHeaders = ["CUPS", "CUPS Vigente", "Nombre CUPS", "Tipo Ser", ...Object.keys(report.data[0]?.coincidences || {}), "Total", "FU"];
    XLSX.utils.sheet_add_aoa(ws, [tableHeaders], { origin: `A${currentRow + 1}` });

    const dataToExport = report.data.map(row => {
        const coincidences = Object.values(row.coincidences);
        return [row.cups, row.cupsVigente, row.nombre, row.tipoSer, ...coincidences, row.total, row.fu];
    });

    XLSX.utils.sheet_add_aoa(ws, dataToExport, { origin: `A${currentRow + 2}` });
    
    // --- Table Styles & Formatting ---
    tableHeaders.forEach((_h, i) => {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: i });
        if(ws[cellRef]) ws[cellRef].s = headerStyle;
    });

    const totalColumnIndex = tableHeaders.length - 2;
    const fuColumnIndex = tableHeaders.length - 1;
    
    dataToExport.forEach((_row, r) => {
        const rowIndex = currentRow + r + 2;

        const totalCellRef = XLSX.utils.encode_cell({ r: rowIndex -1, c: totalColumnIndex });
        if(ws[totalCellRef] && typeof ws[totalCellRef].v === 'number') {
            ws[totalCellRef].z = numberFormat; ws[totalCellRef].t = 'n';
        }
        
        const fuCellRef = XLSX.utils.encode_cell({ r: rowIndex - 1, c: fuColumnIndex });
        if(ws[fuCellRef] && typeof ws[fuCellRef].v === 'number') {
            ws[fuCellRef].z = fuFormat; ws[fuCellRef].t = 'n';
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
