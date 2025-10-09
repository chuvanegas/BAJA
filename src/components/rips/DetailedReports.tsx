'use client';

import { useState, useRef, useMemo } from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSearch, Upload, File, Trash2, Cog, CheckCircle, Search, Download, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { parseRIPS } from "@/lib/rips-parser";
import { exportCoincidenceToExcel } from "@/lib/excel-export";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { CupsDataRow, Coincidence, CoincidenceReport, GlobalAfSummary, GenericRow, UserData, AfProviderData } from "@/lib/types";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DetailedReportsProps {
  cupsData: CupsDataRow[];
  setCupsData: (data: CupsDataRow[]) => void;
  ripsFileContents: Record<string, string>;
  globalAf: GlobalAfSummary;
  coincidenceReport: CoincidenceReport | null;
  setCoincidenceReport: (report: CoincidenceReport | null) => void;
}

const Uploader = ({
    title,
    description,
    file,
    inputRef,
    onFileChange,
    onClean
}: {
    title: string;
    description: string;
    file: File | null;
    inputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClean: () => void;
}) => (
     <div className="p-4 border rounded-lg space-y-3 bg-card/30">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input type="file" ref={inputRef} onChange={onFileChange} className="hidden" accept=".xlsx"/>
          <div className="flex-1">
              <Button onClick={() => inputRef.current?.click()} variant="outline" size="sm" disabled={!!file}>
                  <Upload className="mr-2" /> Cargar
              </Button>
          </div>
          {file && (
              <div className="flex items-center gap-2 text-sm">
                   <File className="text-primary w-4 h-4"/>
                  <span className="font-medium truncate max-w-xs">{file.name}</span>
                  <Badge variant="secondary">{Math.round(file.size / 1024)} KB</Badge>
                  <Button variant="ghost" size="icon" onClick={onClean} className="h-6 w-6">
                      <Trash2 className="w-4 h-4"/>
                  </Button>
              </div>
          )}
        </div>
     </div>
);


export default function DetailedReports({ 
  cupsData, 
  setCupsData, 
  ripsFileContents, 
  globalAf,
  coincidenceReport,
  setCoincidenceReport 
}: DetailedReportsProps) {
  const [cupsFile, setCupsFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const [asisteFile, setAsisteFile] = useState<File | null>(null);
  const [especialidadesFile, setEspecialidadesFile] = useState<File | null>(null);
  const [asisteData, setAsisteData] = useState<GenericRow[]>([]);
  const [especialidadesData, setEspecialidadesData] = useState<GenericRow[]>([]);
  
  const cupsInputRef = useRef<HTMLInputElement>(null);
  const asisteInputRef = useRef<HTMLInputElement>(null);
  const especialidadesInputRef = useRef<HTMLInputElement>(null);

  const processEnrichmentFile = (file: File, setData: (data: GenericRow[]) => void) => {
    return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<GenericRow>(worksheet, { header: 1 });
                setData(jsonData);
                resolve();
            } catch (error) {
                console.error("Error processing enrichment file:", error);
                toast({ title: `Error al procesar ${file.name}`, variant: "destructive" });
                reject(error);
            }
        };
        reader.onerror = (error) => {
            toast({ title: `Error de lectura en ${file.name}`, variant: "destructive" });
            reject(error);
        }
        reader.readAsBinaryString(file);
    });
  }
  
  const handleGenericFileChange = (
      event: React.ChangeEvent<HTMLInputElement>,
      setFile: (file: File | null) => void,
      setData: (data: any[]) => void,
      isCups: boolean = false,
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            setFile(file);
            setData([]); // Reset previous data on new file selection
            setIsProcessing(true);
            const promise = isCups ? processCupsFile(file) : processEnrichmentFile(file, setData as (data: GenericRow[]) => void);
            promise.then(() => {
              toast({
                title: "Archivo procesado",
                description: `${file.name} ha sido cargado y procesado.`,
              });
            }).catch(() => {
              toast({
                title: `Error al procesar ${file.name}`,
                variant: "destructive",
              });
            }).finally(() => {
              setIsProcessing(false);
            });
        }
    };
    
  const handleClean = () => {
    setCupsFile(null);
    setCupsData([]);
    setCoincidenceReport(null);
    setAsisteFile(null);
    setAsisteData([]);
    setEspecialidadesFile(null);
    setEspecialidadesData([]);

    if(cupsInputRef.current) cupsInputRef.current.value = "";
    if(asisteInputRef.current) asisteInputRef.current.value = "";
    if(especialidadesInputRef.current) especialidadesInputRef.current.value = "";

    toast({ title: "Archivos y datos limpiados" });
  }

 const processCupsFile = (file: File) => {
    return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<CupsDataRow>(worksheet);
                setCupsData(jsonData);
                resolve();
            } catch (error) {
                console.error("Error processing CUPS file:", error);
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};

  const getColumnIndex = (headerRow: string[], possibleNames: string[]): number => {
    if (!headerRow) return -1;
    for (const name of possibleNames) {
        const index = headerRow.findIndex(cell => typeof cell === 'string' && cell.toLowerCase().trim() === name.toLowerCase());
        if (index !== -1) return index;
    }
    return -1;
  };
  
  const asisteMapByContrato = useMemo(() => {
    if (asisteData.length < 2) return new Map();
    const header = asisteData[0];
    const contractColIndex = getColumnIndex(header, ["numero de contratos 2025", "numero de contrato 2025", "contrato"]);
    if (contractColIndex === -1) return new Map();

    const map = new Map<string, any[]>();
    for (let i = 1; i < asisteData.length; i++) {
        const row = asisteData[i];
        const contractId = row[contractColIndex]?.toString().trim();
        if (contractId) {
            map.set(contractId, row);
        }
    }
    return map;
  }, [asisteData]);
  
  const especialidadesMapByContrato = useMemo(() => {
    if (especialidadesData.length < 2) return new Map();
    const header = especialidadesData[0];
    const contractColIndex = getColumnIndex(header, ["numero de contratos 2025", "numero de contrato 2025", "contrato"]);
    if (contractColIndex === -1) return new Map();
    
    const map = new Map<string, any[]>();
    for (let i = 1; i < especialidadesData.length; i++) {
        const row = especialidadesData[i];
        const contractId = row[contractColIndex]?.toString().trim();
        if (contractId) {
            map.set(contractId, row);
        }
    }
    return map;
  }, [especialidadesData]);

  const getPoblacionParaFU = (prestador: AfProviderData, tipoSer: string): number => {
    if (!prestador || !tipoSer) return prestador?.poblacion || 0;
    
    const regimen = prestador.regimen?.toUpperCase();
    const contratoKey = prestador.contrato?.trim();
    if (!contratoKey || !regimen) return prestador.poblacion || 0;
    
    const tipoSerLower = tipoSer.toLowerCase();

    const servicesWithTotalPopulation = [
        "nutricion", "psicologia", "medicina general", "odontologia", 
        "enfermeria", "laboratorio", "imagenes", "transporte", 
        "urgencias", "hospitalizacion"
    ];

    if (servicesWithTotalPopulation.some(s => tipoSerLower.includes(s))) {
        return prestador.poblacion || 0;
    }
    
    if (especialidadesMapByContrato.has(contratoKey)) {
        const rowData = especialidadesMapByContrato.get(contratoKey);
        const header = especialidadesData[0];
        if(!rowData || !header) return prestador.poblacion || 0;
        
        let colIndex = -1;

        if (tipoSerLower.includes('pediatria')) {
            colIndex = regimen === 'SUBSIDIADO' ? getColumnIndex(header, ['pb pediatrica sub']) : getColumnIndex(header, ['pb pediatrica contri']); // K, L
        } else if (tipoSerLower.includes('ginecologia')) {
            colIndex = regimen === 'SUBSIDIADO' ? getColumnIndex(header, ['poblacion gineco sub']) : getColumnIndex(header, ['poblacion gineco contri']); // M, N
        } else if (tipoSerLower.includes('medicina interna')) {
            colIndex = regimen === 'SUBSIDIADO' ? getColumnIndex(header, ['poblacion medicina interna sub']) : getColumnIndex(header, ['poblacion medicina interna contri']); // O, P
        }

        if (colIndex !== -1 && rowData[colIndex]) {
            const val = parseInt(rowData[colIndex], 10);
            if (!isNaN(val)) return val;
        }
    }
    
    if (asisteMapByContrato.has(contratoKey)) {
        const rowData = asisteMapByContrato.get(contratoKey);
        const header = asisteData[0];
        if(!rowData || !header) return prestador.poblacion || 0;

        let colIndex = -1;

        if (tipoSerLower.includes('pediatria')) {
            colIndex = regimen === 'SUBSIDIADO' ? getColumnIndex(header, ['pb pediatrica sub']) : getColumnIndex(header, ['pb pediatrica contri']); // L, M
        } else if (tipoSerLower.includes('ginecologia')) {
            colIndex = regimen === 'SUBSIDIADO' ? getColumnIndex(header, ['poblacion gineco sub']) : getColumnIndex(header, ['poblacion gineco contri']); // N, O
        } else if (tipoSerLower.includes('medicina interna')) {
             colIndex = regimen === 'SUBSIDIADO' ? getColumnIndex(header, ['poblacion medicina interna sub']) : getColumnIndex(header, ['poblacion medicina interna contri']); // P, Q
        }

        if (colIndex !== -1 && rowData[colIndex]) {
            const val = parseInt(rowData[colIndex], 10);
            if (!isNaN(val)) return val;
        }
    }

    return prestador.poblacion || 0;
  };


  const handleGenerateCoincidenceReport = async (updatedPrestadores?: GlobalAfSummary) => {
    if (cupsData.length === 0) {
        toast({ title: "Sin datos de mapeo", description: "Cargue y procese un archivo de mapeo CUPS primero.", variant: "destructive"});
        return;
    }
    if (Object.keys(ripsFileContents).length === 0) {
        toast({ title: "Sin archivos RIPS", description: "Cargue y valide al menos un archivo RIPS en la otra pestaña.", variant: "destructive"});
        return;
    }
    if (Object.keys(globalAf).length === 0 && !updatedPrestadores) {
        toast({ title: "Sin información de prestador (AF)", description: "Asegúrese de que los archivos RIPS incluyen un archivo AF válido.", variant: "destructive"});
        return;
    }

    setIsProcessing(true);

    const prestadoresSource = updatedPrestadores || globalAf;
    const enrichedGlobalAf: GlobalAfSummary = JSON.parse(JSON.stringify(prestadoresSource));
    
    const asisteHeader = asisteData.length > 0 ? asisteData[0] : [];
    const asisteDeptoCol = getColumnIndex(asisteHeader, ['departamento']);
    const asisteMunCol = getColumnIndex(asisteHeader, ['municipio']);
    const asistePobSubCol = getColumnIndex(asisteHeader, ['pb s', 'poblacion subsidiada', 'pb sub', 'j']);
    const asistePobContCol = getColumnIndex(asisteHeader, ['pb contr', 'poblacion contributiva', 'pb contri', 'k']);
    const asisteValContratoCol = getColumnIndex(asisteHeader, ['valor total contrato', 'valor total del contrato', 'aw']);


    const especialidadesHeader = especialidadesData.length > 0 ? especialidadesData[0] : [];
    const espDeptoCol = getColumnIndex(especialidadesHeader, ['departamento']);
    const espMunCol = getColumnIndex(especialidadesHeader, ['municipio']);
    const espPobSubCol = 8; // Column I 
    const espPobContCol = 9; // Column J
    const espValSubCol = 24; // Column Y
    const espValContCol = 25; // Column Z

    for (const key in enrichedGlobalAf) {
        const prestador = enrichedGlobalAf[key];
        const regimen = prestador.regimen?.toUpperCase();
        const contratoKey = prestador.contrato?.trim();
        
        if (!contratoKey) continue;
        
        let found = false;
        if(asisteMapByContrato.has(contratoKey)){
            const rowData = asisteMapByContrato.get(contratoKey);
            if(rowData){
                prestador.departamento = asisteDeptoCol !== -1 ? rowData[asisteDeptoCol] : 'N/A';
                prestador.municipio = asisteMunCol !== -1 ? rowData[asisteMunCol] : 'N/A';
                
                if(asisteValContratoCol !== -1) {
                  const cellValue = rowData[asisteValContratoCol];
                  const numericValue = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue).replace(/[^0-9.-]+/g,""));
                  if(!isNaN(numericValue)) prestador.valorPorContrato = numericValue;
                }
                
                const pobIndex = regimen === 'SUBSIDIADO' ? asistePobSubCol : asistePobContCol;
                if(pobIndex !== -1 && rowData[pobIndex]) {
                  const pobValue = rowData[pobIndex];
                  const numericValue = typeof pobValue === 'number' ? pobValue : parseInt(String(pobValue).replace(/[^0-9.-]+/g,""), 10);
                  if(!isNaN(numericValue)) prestador.poblacion = numericValue;
                }
                
                found = true;
            }
        }
        
        if (!found && especialidadesMapByContrato.has(contratoKey)) {
            const rowData = especialidadesMapByContrato.get(contratoKey);
             if(rowData){
                prestador.departamento = espDeptoCol !== -1 ? rowData[espDeptoCol] : 'N/A';
                prestador.municipio = espMunCol !== -1 ? rowData[espMunCol] : 'N/A';
                
                const valIndex = regimen === 'SUBSIDIADO' ? espValSubCol : espValContCol;
                if(valIndex !== -1 && rowData[valIndex]) {
                    const cellValue = rowData[valIndex];
                    const numericValue = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue).replace(/[^0-9.-]+/g,""));
                    if(!isNaN(numericValue)) prestador.valorPorContrato = numericValue;
                }
                
                const pobIndex = regimen === 'SUBSIDIADO' ? espPobSubCol : espPobContCol;
                 if(pobIndex !== -1 && rowData[pobIndex]) {
                    const pobValue = rowData[pobIndex];
                    const numericValue = typeof pobValue === 'number' ? pobValue : parseInt(String(pobValue).replace(/[^0-9.-]+/g,""), 10);
                    if(!isNaN(numericValue)) prestador.poblacion = numericValue;
                }
            }
        }
    }
    
    // User data processing
    const allRipsBlocks: Record<string, string[]> = {};
    for (const content of Object.values(ripsFileContents)) {
        const blocks = parseRIPS(content);
        for (const segment in blocks) {
            if (!allRipsBlocks[segment]) allRipsBlocks[segment] = [];
            allRipsBlocks[segment].push(...blocks[segment]);
        }
    }
    
    const usersMap = new Map<string, Pick<UserData, 'edad' | 'unidadMedidaEdad' | 'sexo'>>();
    if (allRipsBlocks['US']) {
      allRipsBlocks['US'].forEach(line => {
        const cols = line.split(',');
        if (cols.length > 10) {
          const numDoc = cols[1];
          if (numDoc && !usersMap.has(numDoc)) {
            usersMap.set(numDoc, {
              edad: parseInt(cols[8], 10),
              unidadMedidaEdad: cols[9],
              sexo: cols[10]
            });
          }
        }
      });
    }

    const segmentsToSearch = ['AP', 'AC', 'AT', 'AN', 'AH', 'AU', 'US'];
    let globalCoincidences: Coincidence[] = [];

    const activityPositions: { [key: string]: { user: number, code: number } } = {
        'AC': { user: 2, code: 6 },
        'AP': { user: 3, code: 7 },
        'AU': { user: 2, code: 6 },
        'AH': { user: 2, code: 8 },
        'AN': { user: 2, code: 6 },
        'AT': { user: 2, code: 6 }
    };
    
    const mainPrestador = Object.values(enrichedGlobalAf)[0];
    
    cupsData.forEach(cupsRow => {
        const codeToSearch = (cupsRow['CUPS'] || cupsRow['CUPS VIGENTE'])?.toString();
        if (!codeToSearch) return;

        const coincidence: Coincidence = {
            cups: cupsRow['CUPS'],
            cupsVigente: cupsRow['CUPS VIGENTE'],
            nombre: cupsRow['NOMBRE CUPS'],
            tipoSer: cupsRow['Tipo Ser'],
            coincidences: {},
            total: 0
        };

        segmentsToSearch.forEach(seg => {
            const segmentLines = allRipsBlocks[seg] || [];
            let count = 0;
            const posInfo = activityPositions[seg];

            if (posInfo) {
                count = segmentLines.reduce((acc, line) => {
                    const cols = line.split(',');
                    const lineCode = cols[posInfo.code];
                    if (lineCode === codeToSearch) {
                        return acc + 1;
                    }
                    return acc;
                }, 0);
            } else if(seg === 'US') {
                count = segmentLines.reduce((acc, line) => acc + (line.includes(`,${codeToSearch},`) ? 1 : 0), 0);
            }

            coincidence.coincidences[seg] = count;
            coincidence.total += count;
        });
        
        if (mainPrestador) {
            const poblacionParaFU = getPoblacionParaFU(mainPrestador, coincidence.tipoSer);
            coincidence.fu = poblacionParaFU > 0 ? coincidence.total / poblacionParaFU : 0;
        } else {
            coincidence.fu = 0;
        }
        
        globalCoincidences.push(coincidence);
    });
    
    const poblacionTotal = usersMap.size;

    setIsProcessing(false);
    setCoincidenceReport({ prestadores: enrichedGlobalAf, data: globalCoincidences, poblacionTotal });
    if (!updatedPrestadores) {
      toast({ title: "Reporte de coincidencias generado." });
    } else {
      toast({ title: "Reporte de coincidencias actualizado." });
    }
  }

  const formatCurrency = (value?: number) => {
    if(value === undefined || value === null || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };
  
  const formatNumber = (value?: number) => {
    if(value === undefined || value === null || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('es-CO').format(value);
  };

  const handleProviderUpdate = (prestadorKey: string, field: 'tipoServicio' | 'regimen', value: string) => {
    if (!coincidenceReport) return;
    
    const updatedPrestadores = { ...coincidenceReport.prestadores };
    if (updatedPrestadores[prestadorKey]) {
        (updatedPrestadores[prestadorKey] as any)[field] = value;
    }
    
    handleGenerateCoincidenceReport(updatedPrestadores);
  };

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"> <FileSearch /> Reportes Detallados </CardTitle>
        <CardDescription> Cruce datos RIPS con mapeos CUPS y plantillas de enriquecimiento para generar reportes detallados. </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-semibold">Paso 1: Carga y Procesamiento de Archivos</AccordionTrigger>
            <AccordionContent className="pt-4 space-y-6">
              
              <Uploader
                title="Cargue Mapeo CUPS"
                description="Archivo principal para cruzar los códigos CUPS con los RIPS."
                file={cupsFile}
                inputRef={cupsInputRef}
                onFileChange={(e) => handleGenericFileChange(e, setCupsFile, setCupsData, true)}
                onClean={() => {
                  setCupsFile(null);
                  setCupsData([]);
                  if(cupsInputRef.current) cupsInputRef.current.value = "";
                }}
              />
              
              <Card>
                <CardHeader>
                    <CardTitle className="text-base">Plantillas de Enriquecimiento (Opcional)</CardTitle>
                    <CardDescription className="text-sm">Cargue estos archivos para añadir datos de ubicación y contratos al reporte.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <Uploader
                        title="Plantilla Asiste-EspeB"
                        description="Para datos de ubicación (Depto/Municipio) y valores de contrato."
                        file={asisteFile}
                        inputRef={asisteInputRef}
                        onFileChange={(e) => handleGenericFileChange(e, setAsisteFile, setAsisteData)}
                        onClean={() => {
                            setAsisteFile(null);
                            setAsisteData([]);
                            if(asisteInputRef.current) asisteInputRef.current.value = "";
                        }}
                    />
                    <Uploader
                        title="Plantilla Especialidades"
                        description="Para cruzar por número de contrato y valores."
                        file={especialidadesFile}
                        inputRef={especialidadesInputRef}
                        onFileChange={(e) => handleGenericFileChange(e, setEspecialidadesFile, setEspecialidadesData)}
                        onClean={() => {
                            setEspecialidadesFile(null);
                            setEspecialidadesData([]);
                            if(especialidadesInputRef.current) especialidadesInputRef.current.value = "";
                        }}
                    />
                </CardContent>
              </Card>

              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" onClick={handleClean}> <Trash2 /> Limpiar Todo </Button>
              </div>

            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        {cupsData.length > 0 && (
          <div className="space-y-4">
            <Accordion type="single" collapsible className="w-full" defaultValue="item-2">
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-lg font-semibold">Paso 2: Generación de Reporte</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-6">
                  <div className="p-4 rounded-md border-l-4 border-green-500 bg-green-500/10 flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                          <p className="font-semibold text-green-700 dark:text-green-400">¡Archivos listos!</p>
                          <p className="text-sm text-muted-foreground">Se cargaron <span className="font-bold text-foreground">{cupsData.length}</span> registros de mapeo. Ahora puede generar el reporte.</p>
                      </div>
                  </div>
                  <div className="flex justify-center py-4">
                      <Button onClick={() => handleGenerateCoincidenceReport()} disabled={isProcessing} size="lg">
                          {isProcessing ? <Cog className="animate-spin" /> : <Search />}
                          Generar Reporte de Coincidencias
                      </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
              
        {coincidenceReport && (
            <div className="space-y-4 pt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Reporte de Coincidencias CUPS</CardTitle>
                        <CardDescription>Resultados del cruce entre el mapeo CUPS y los archivos RIPS cargados, enriquecido con datos de plantillas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                        
                        <Accordion type="single" collapsible className="w-full" defaultValue='item-0'>
                          {Object.entries(coincidenceReport.prestadores).map(([key, prestador], index) => (
                            <AccordionItem value={`item-${index}`} key={prestador.NI + index}>
                              <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                  <Star className="text-amber-400" />
                                  <span className="font-semibold">{prestador.nombrePrestador}</span>
                                  <Badge variant="outline">NIT: {prestador.NI}</Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="p-4 border rounded-lg bg-card/50 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                  <p><strong>Departamento:</strong> <span className="text-muted-foreground">{prestador.departamento || 'No encontrado'}</span></p>
                                  <p><strong>Municipio:</strong> <span className="text-muted-foreground">{prestador.municipio || 'No encontrado'}</span></p>
                                  <p><strong>Número de contrato:</strong> <span className="text-muted-foreground">{prestador.contrato}</span></p>
                                  <p><strong>Valor por Contrato:</strong> <span className="font-bold text-primary">{formatCurrency(prestador.valorPorContrato)}</span></p>
                                  <p><strong>Población por Contrato:</strong> <span className="font-bold text-primary">{formatNumber(prestador.poblacion)}</span></p>

                                  <div>
                                    <strong>Tipo de servicio:</strong>
                                    {prestador.tipoServicio ? (
                                      <span className="text-muted-foreground ml-2">{prestador.tipoServicio}</span>
                                    ) : (
                                      <Input
                                        placeholder="ej: ESPECIALIDADES_BASICA"
                                        className="mt-1 h-8"
                                        defaultValue={prestador.tipoServicio}
                                        onBlur={(e) => handleProviderUpdate(key, 'tipoServicio', e.target.value)}
                                      />
                                    )}
                                  </div>
                                  
                                  <div>
                                    <strong>Régimen:</strong>
                                    <Select 
                                      onValueChange={(value) => handleProviderUpdate(key, 'regimen', value)}
                                      defaultValue={prestador.regimen}
                                    >
                                      <SelectTrigger className="w-full mt-1 h-8">
                                        <SelectValue placeholder="Seleccione Régimen" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="SUBSIDIADO">SUBSIDIADO</SelectItem>
                                        <SelectItem value="CONTRIBUTIVO">CONTRIBUTIVO</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="md:col-span-2">
                                      <p className="font-semibold pt-2">Periodos de radicación y valores:</p>
                                      <ul className="list-none pl-2 space-y-1 text-sm text-muted-foreground">
                                        {prestador.detalles.map((d, i) => (
                                          <li key={i}>{d.periodo} → <span className="font-medium text-foreground">{formatCurrency(d.valor)}</span> <span className="text-xs italic opacity-80"> (Archivo: {d.archivo})</span></li>
                                        ))}
                                      </ul>
                                      <p className="font-bold text-lg text-right pt-2">
                                        Valor LMA Total: <span className="text-primary">{formatCurrency(prestador.valorTotal)}</span>
                                      </p>
                                  </div>

                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                        
                        <ScrollArea className="whitespace-nowrap rounded-md border">
                            <div className="max-h-96">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-muted">
                                        <TableRow>
                                            <TableHead className="min-w-[100px]">CUPS</TableHead>
                                            <TableHead className="min-w-[100px]">CUPS Vigente</TableHead>
                                            <TableHead className="min-w-[250px]">Nombre CUPS</TableHead>
                                            <TableHead className="min-w-[150px]">Tipo Ser</TableHead>
                                            <TableHead className="text-center">AP</TableHead>
                                            <TableHead className="text-center">AC</TableHead>
                                            <TableHead className="text-center">AT</TableHead>
                                            <TableHead className="text-center">AN</TableHead>
                                            <TableHead className="text-center">AH</TableHead>
                                            <TableHead className="text-center">AU</TableHead>
                                            <TableHead className="text-center">US</TableHead>
                                            <TableHead className="text-center font-bold">Total</TableHead>
                                            <TableHead className="text-center font-bold">FU</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {coincidenceReport.data.map((row, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-mono text-xs">{row.cups}</TableCell>
                                                <TableCell className="font-mono text-xs">{row.cupsVigente}</TableCell>
                                                <TableCell className="text-xs">{row.nombre}</TableCell>
                                                <TableCell className="text-xs">{row.tipoSer}</TableCell>
                                                {Object.values(row.coincidences).map((count, i) => (
                                                    <TableCell key={i} className="text-center text-xs">{count > 0 ? <Badge variant="default">{count}</Badge> : count}</TableCell>
                                                ))}
                                                <TableCell className="text-center text-xs font-bold">{row.total}</TableCell>
                                                <TableCell className="text-center text-xs font-bold">{row.fu?.toFixed(4)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                        <div className="flex justify-end pt-4">
                            <Button onClick={() => exportCoincidenceToExcel(coincidenceReport)}>
                                <Download className="mr-2"/>
                                Exportar Reporte a Excel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {!cupsFile && !isProcessing && (
            <div className="text-center text-muted-foreground p-8">
              <p>Comience cargando un archivo de mapeo CUPS en el Paso 1.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
