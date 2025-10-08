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
  departamento?: string;
  municipio?: string;
  valorPorContrato?: number;
  poblacion?: number;
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
  [key: string]: any; // Allow other properties
};

export type Coincidence = {
    cups: string;
    cupsVigente: string;
    nombre: string;
    tipoSer: string;
    coincidences: Record<string, number>;
    total: number;
    fu?: number;
    poblacionParaFU?: number;
}

export type CoincidenceReport = {
    prestadores: GlobalAfSummary;
    data: Coincidence[];
    poblacionTotal: number;
}

export type UserActivity = {
  segment: string;
  cups: string;
  description: string;
}

export type UserData = {
  tipoDoc: string;
  numDoc: string;
  codigoHabilitacion: string;
  tipoUsuario: string;
  primerApellido: string;
  segundoApellido: string;
  primerNombre: string;
  segundoNombre: string;
  edad: number;
  unidadMedidaEdad: string;
  sexo: string;
  departamento: string;
  municipio: string;
  zona: string;
  edadFormateada: string;
  nombreCompleto: string;
  grupoEtario: string;
  activities: UserActivity[];
};

export type ActivityRanking = {
  cups: string;
  description: string;
  count: number;
};

export type UserRanking = {
  user: UserData;
  count: number;
};

export type GenericRow = Record<string, any>;
