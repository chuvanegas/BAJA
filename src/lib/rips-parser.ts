import type { GlobalAfSummary } from './types';

export function parseRIPS(text: string): Record<string, string[]> {
  const lines = (text || "").replace(/\r/g, "").split("\n");
  let current: string | null = null;
  const blocks: Record<string, string[]> = {};

  for (const raw of lines) {
    const line = (raw || "").trim();
    if (!line) continue;

    // This logic seems flawed for detecting segments, as it relies on special marker lines.
    // A more robust approach might be needed if files don't have these markers.
    if (line.includes("ARCHIVO-RIPS-")) {
      const match = line.match(/ARCHIVO-RIPS-([A-Z]+)/i);
      if (match) {
        const seg = match[1].toUpperCase();
        if (current === seg) {
          current = null; // End of block
        } else {
          current = seg; // Start of new block
          if (!blocks[current]) blocks[current] = [];
        }
      }
      continue;
    }
    
    // A simplified heuristic: guess segment from the first few columns.
    // This is brittle. A better way is needed.
    const cols = line.split(',');
    if (!current) {
        if (cols.length > 2 && /^[A-Z]{2}$/.test(cols[2]?.substring(0, 2))) {
            const seg = cols[2].substring(0, 2).toUpperCase();
            if(!blocks[seg]) blocks[seg] = [];
            blocks[seg].push(line.replace(/\|$/, ""));
        } else if (cols.length > 1 && /^[A-Z]{2}/.test(cols[0])) {
            // Fallback for other types
        } else {
            // Catch-all for files without clear markers
            if(!blocks['AF']) blocks['AF'] = [];
            if(cols.length > 16) blocks['AF'].push(line.replace(/\|$/, ""));
            if(cols.length > 10 && cols.length < 15) blocks['US'].push(line.replace(/\|$/, ""));
        }
    }


    if (current && !line.startsWith("***")) {
      blocks[current].push(line.replace(/\|$/, ""));
    }
  }

  // If parsing with markers failed, try a heuristic approach.
  if (Object.keys(blocks).length === 0) {
      for (const raw of lines) {
          const line = (raw || "").trim();
          if (!line) continue;
          const cols = line.split(',');
          // CT files have a specific structure
          if (cols.length >= 4 && /^[A-Z]{2}/.test(cols[2])) {
              if(!blocks['CT']) blocks['CT'] = [];
              blocks['CT'].push(line);
          } else if (cols.length > 16) { // AF likely has many columns
              if(!blocks['AF']) blocks['AF'] = [];
              blocks['AF'].push(line);
          } else if (cols.length > 10) { // US has a moderate number
              if(!blocks['US']) blocks['US'] = [];
              blocks['US'].push(line);
          } else {
              // Could be AP, AC, etc. Requires more specific rules.
              // For now, let's just push to a generic bucket or ignore.
          }
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
        // Corresponds to: 440010095404,IPS INDIGENA KOTTUSHI SAO ANAA,NI,900794134,ACP170,05/05/2025,01/04/2025,30/04/2025,EPSI01,DUSAKAWI EPSI,44847-08EB,2025_DUSAKAWI_ESPECIALIDADES_BASICA_URIBIA_SUBSIDIADO,,0,0,0,254135089,
        const nombrePrestador = cols[1];
        const NI = cols[3];
        const inicio = cols[6];
        const fin = cols[7];
        const contrato = cols[10];
        const tipoServicio = cols[11];
        const regimen = "SUBSIDIADO"; // This seems to be static in your example.
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
