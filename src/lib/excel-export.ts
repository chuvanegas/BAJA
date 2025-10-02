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
    ["Nombre del prestador", "NI", "Contrato", "Tipo de servicio", "Régimen", "Valor LMA Total"]
  ];
  let totalGeneral = 0;
  Object.values(globalAF).forEach(af => {
    consolidadoData.push([af.nombrePrestador, af.NI, af.contrato, af.tipoServicio, af.regimen, af.valorTotal]);
    totalGeneral += af.valorTotal;
  });
  consolidadoData.push([]);
  consolidadoData.push(["", "", "", "", "TOTAL GENERAL", totalGeneral]);

  const wsCons = XLSX.utils.aoa_to_sheet(consolidadoData);
  // Formatting currency columns
  wsCons['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 20 }];
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
    if (!report) {
        console.error("No hay datos de coincidencia para exportar");
        return;
    }

    const wb = XLSX.utils.book_new();
    const headers = ["CUPS", "CUPS Vigente", "Nombre CUPS", "Tipo Ser", ...Object.keys(report.data[0]?.coincidences || {}), "Total"];
    
    const dataToExport = report.data.map(row => {
        const coincidences = Object.values(row.coincidences);
        return [row.cups, row.cupsVigente, row.nombre, row.tipoSer, ...coincidences, row.total];
    });

    const wsData = [
        ["Reporte de Coincidencias CUPS"],
        [],
        ["Prestador:", report.prestador.nombre],
        ["Nit:", report.prestador.nit],
        ["Contrato:", report.prestador.contrato],
        [],
        headers,
        ...dataToExport
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
        { wch: 15 }, // CUPS
        { wch: 15 }, // CUPS Vigente
        { wch: 50 }, // Nombre CUPS
        { wch: 25 }, // Tipo Ser
        ...Object.keys(report.data[0]?.coincidences || {}).map(() => ({ wch: 8 })), // Segments
        { wch: 10 }  // Total
    ];
    
    // Merge title cell
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];


    XLSX.utils.book_append_sheet(wb, ws, "Coincidencias_CUPS");
    XLSX.writeFile(wb, "Reporte_Coincidencias_CUPS.xlsx");
}
