import type { GlobalAfSummary } from './types';

export function parseRIPS(text: string): Record<string, string[]> {
  const lines = (text || "").replace(/\r/g, "").split("\n");
  let current: string | null = null;
  const blocks: Record<string, string[]> = {};

  for (const raw of lines) {
    const line = (raw || "").trim();
    if (!line) continue;

    if (line.includes("ARCHIVO-RIPS-")) {
      const match = line.match(/ARCHIVO-RIPS-([A-Z]+)/i);
      if (match) {
        const seg = match[1].toUpperCase();
        if (current === seg) {
          current = null;
        } else {
          current = seg;
          if (!blocks[current]) blocks[current] = [];
        }
      }
      continue;
    }
    if (current && !line.startsWith("***")) {
      blocks[current].push(line.replace(/\|$/, ""));
    }
  }
  return blocks;
}

export function extractAF(blocks: Record<string, string[]>, fileName: string): GlobalAfSummary {
  const afInfo: GlobalAfSummary = {};
  if (blocks.AF) {
    blocks.AF.forEach(row => {
      const cols = row.split(",");
      if (cols.length >= 17) {
        const nombrePrestador = cols[1];
        const NI = cols[3];
        const inicio = cols[6];
        const fin = cols[7];
        const contrato = cols[10];
        const tipoServicio = cols[11];
        const regimen = cols[12];
        const valorNeto = parseFloat(cols[16] || "0");
        const key = `${NI}-${nombrePrestador}`;

        if (!afInfo[key]) {
          afInfo[key] = { nombrePrestador, NI, contrato, tipoServicio, regimen, detalles: [], valorTotal: 0 };
        }
        afInfo[key].detalles.push({ periodo: `${inicio} a ${fin}`, valor: valorNeto, archivo: fileName });
        afInfo[key].valorTotal += isNaN(valorNeto) ? 0 : valorNeto;
      }
    });
  }
  return afInfo;
}

export function expectedFromCT(blocks: Record<string, string[]>): Record<string, number> {
  const exp: Record<string, number> = {};
  if (blocks.CT) {
    blocks.CT.forEach(row => {
      const cols = row.split(",");
      if (cols.length >= 4) {
        const tipo = (cols[2] || "").substring(0, 2).toUpperCase();
        const cant = parseInt((cols[3] || "0").trim(), 10);
        if (!isNaN(cant)) exp[tipo] = (exp[tipo] || 0) + cant;
      }
    });
  }
  return exp;
}

export function foundBySegment(blocks: Record<string, string[]>): Record<string, number> {
  const f: Record<string, number> = {};
  Object.entries(blocks).forEach(([seg, rows]) => {
    if (seg !== "CT") f[seg] = rows.length;
  });
  return f;
}
