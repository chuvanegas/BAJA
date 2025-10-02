import * as XLSX from 'xlsx';
import type { GlobalAfSummary } from './types';

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
