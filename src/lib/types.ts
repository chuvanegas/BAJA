export type AfDetail = {
  inicio: string; // Keep original start date for sorting
  periodo: string;
  valor: number;
  archivo: string;
};

export type AfProviderData = {
  nombrePrestador: string;
  NI: string;
  contrato: string;
  tipoServicio: string;
  regimen: string;
  detalles: AfDetail[];
  valorTotal: number;
};

export type GlobalAfSummary = Record<string, AfProviderData>;

export type ValidationSegment = {
  name: string;
  expected: number;
  found: number;
  status: 'ok' | 'fail';
};

export type ValidationResult = {
  fileName: string;
  segments: ValidationSegment[];
};

export type AnalysisTarget = {
  fileName: string;
  segment: string;
  expected: number;
  found: number;
  fileContent: string;
}

export type CupsDataRow = {
  'Tipo Ser': string;
  'CUPS': string;
  'CUPS VIGENTE': string;
  'NOMBRE CUPS': string;
};

export type Coincidence = {
    cups: string;
    cupsVigente: string;
    nombre: string;
    tipoSer: string;
    coincidences: Record<string, number>;
    total: number;
}

export type CoincidenceReport = {
    prestadores: GlobalAfSummary;
    data: Coincidence[];
}
