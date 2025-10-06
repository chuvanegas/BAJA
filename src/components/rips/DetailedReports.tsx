'use client';

import { useState, useRef } from "react";
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
import type { CupsDataRow, Coincidence, CoincidenceReport, GlobalAfSummary, GenericRow } from "@/lib/types";

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


  const handleGenericFileChange = (
      event: React.ChangeEvent<HTMLInputElement>,
      setFile: (file: File | null) => void,
      setData: (data: GenericRow[]) => void
    ) => {
        const file = event.target.files?.[0];
        if (file) {
            setFile(file);
            setData([]); // Reset previous data
            toast({
              title: "Archivo seleccionado",
              description: `Se ha seleccionado: ${file.name}. Se procesará al generar el reporte.`,
            });
        }
    };
    
  const processEnrichmentFile = (file: File, setData: (data: GenericRow[]) => void) => {
    return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<GenericRow>(worksheet, {header: 1}); // header: 1 to get array of arrays
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

  const handleProcessFiles = async () => {
    if (!cupsFile) {
        toast({ title: "Falta archivo de mapeo", description: "Por favor, cargue el archivo de mapeo CUPS.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);

    const fileProcessingPromises: Promise<any>[] = [];

    // Process enrichment files
    if (asisteFile && asisteData.length === 0) {
        fileProcessingPromises.push(processEnrichmentFile(asisteFile, setAsisteData));
    }
    if (especialidadesFile && especialidadesData.length === 0) {
        fileProcessingPromises.push(processEnrichmentFile(especialidadesFile, setEspecialidadesData));
    }
    
    // Process main CUPS file
    const cupsProcessingPromise = new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let jsonData: CupsDataRow[] = [];
          if (cupsFile.name.endsWith('.xlsx') || cupsFile.name.endsWith('.csv') || cupsFile.name.endsWith('.txt')) {
            const workbook = cupsFile.name.endsWith('.xlsx') ? XLSX.read(data, { type: 'binary' }) : XLSX.read(data, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            jsonData = XLSX.utils.sheet_to_json<CupsDataRow>(worksheet);
          } else if (cupsFile.name.endsWith('.xml')) {
              const text = data as string;
              const parser = new DOMParser();
              const xmlDoc = parser.parseFromString(text, "application/xml");
              const rows = Array.from(xmlDoc.getElementsByTagName('row'));
              if (rows.length > 0) {
                const headers = Array.from(rows[0].children).map(child => child.tagName);
                jsonData = rows.map(row => {
                  const rowData: any = {};
                  Array.from(row.children).forEach((child, index) => { rowData[headers[index]] = child.textContent; });
                  return rowData as CupsDataRow;
                });
              }
            }
            setCupsData(jsonData);
            resolve();
        } catch (error) {
            console.error("Error processing CUPS file:", error);
            toast({ title: "Error al procesar archivo de mapeo", variant: "destructive" });
            reject(error);
        }
      };
      reader.onerror = (error) => {
          toast({ title: "Error de lectura en archivo de mapeo.", variant: "destructive" });
          reject(error);
      }
      if (cupsFile.name.endsWith('.xlsx')) reader.readAsBinaryString(cupsFile);
      else reader.readAsText(cupsFile);
    });

    fileProcessingPromises.push(cupsProcessingPromise);

    try {
        await Promise.all(fileProcessingPromises);
        toast({
          title: "Procesamiento completo",
          description: `Se procesaron los archivos cargados. Ahora puede generar el reporte.`,
        });
    } catch(e) {
        toast({
          title: "Procesamiento fallido",
          description: `Uno o más archivos no pudieron ser procesados.`,
          variant: "destructive"
        })
    } finally {
        setIsProcessing(false);
    }
  };

  const handleGenerateCoincidenceReport = () => {
    if (cupsData.length === 0) {
        toast({ title: "Sin datos de mapeo", description: "Cargue y procese un archivo de mapeo CUPS primero.", variant: "destructive"});
        return;
    }
    if (Object.keys(ripsFileContents).length === 0) {
        toast({ title: "Sin archivos RIPS", description: "Cargue y valide al menos un archivo RIPS en la otra pestaña.", variant: "destructive"});
        return;
    }
    if (Object.keys(globalAf).length === 0) {
        toast({ title: "Sin información de prestador (AF)", description: "Asegúrese de que los archivos RIPS incluyen un archivo AF válido.", variant: "destructive"});
        return;
    }

    // Create a deep copy to avoid mutating the original globalAf state
    const enrichedGlobalAf: GlobalAfSummary = JSON.parse(JSON.stringify(globalAf));
    
    // Create maps for faster lookups
    const asisteMapByNit = new Map<string, GenericRow>();
    if (asisteData.length > 0) {
        const asisteHeaders = asisteData[0];
        const nitIndex = asisteHeaders.indexOf('ID Nit');
        if(nitIndex !== -1) {
          for(let i = 1; i < asisteData.length; i++) {
              const row = asisteData[i];
              const nit = row[nitIndex]?.toString();
              if (nit) asisteMapByNit.set(nit, row);
          }
        }
    }

    const asisteMapByContrato = new Map<string, GenericRow>();
     if (asisteData.length > 0) {
        const headers = asisteData[0];
        const contratoIndex = headers.indexOf('Número de Contrato');
        if(contratoIndex !== -1) {
          for(let i = 1; i < asisteData.length; i++) {
              const row = asisteData[i];
              const contrato = row[contratoIndex]?.toString();
              if(contrato) asisteMapByContrato.set(contrato, row);
          }
        }
    }
    
    const especialidadesMapByContrato = new Map<string, GenericRow>();
    if (especialidadesData.length > 0) {
        const headers = especialidadesData[0];
        const contratoIndex = headers.indexOf('Número de Contrato');
        if(contratoIndex !== -1) {
           for(let i = 1; i < especialidadesData.length; i++) {
              const row = especialidadesData[i];
              const contrato = row[contratoIndex]?.toString();
              if(contrato) especialidadesMapByContrato.set(contrato, row);
          }
        }
    }

    for (const key in enrichedGlobalAf) {
        const prestador = enrichedGlobalAf[key];
        
        // Enrich with location data from Asiste-EspeB using NIT
        const asisteRowByNit = asisteMapByNit.get(prestador.NI);
        if (asisteRowByNit && asisteData[0]) {
            const headers = asisteData[0];
            const deptoIndex = headers.indexOf('Departamento');
            const municipioIndex = headers.indexOf('Municipio');
            if(deptoIndex !== -1) prestador.departamento = asisteRowByNit[deptoIndex];
            if(municipioIndex !== -1) prestador.municipio = asisteRowByNit[municipioIndex];
        }

        // Enrich with contract value based on regimen
        const regimen = prestador.regimen.toUpperCase();
        let foundValue: number | undefined = undefined;

        // Search in Asiste-EspeB by contract number
        const asisteRowByContrato = asisteMapByContrato.get(prestador.contrato);
        if (asisteRowByContrato && asisteData[0]) {
            const headers = asisteData[0];
            const colIndex = regimen === 'SUBSIDIADO' ? headers.indexOf('Valor Subsidiado') : headers.indexOf('Valor Contributivo'); // Assuming column names J and K are these
            if (colIndex !== -1 && typeof asisteRowByContrato[colIndex] === 'number') {
                foundValue = asisteRowByContrato[colIndex];
            }
        }

        // If not found, search in Especialidades by contract number
        if (foundValue === undefined) {
            const especialidadesRow = especialidadesMapByContrato.get(prestador.contrato);
            if (especialidadesRow && especialidadesData[0]) {
                 const headers = especialidadesData[0];
                 const colIndex = regimen === 'SUBSIDIADO' ? headers.indexOf('Valor Subsidiado') : headers.indexOf('Valor Contributivo'); // Assuming column names K and L are these
                 if (colIndex !== -1 && typeof especialidadesRow[colIndex] === 'number') {
                    foundValue = especialidadesRow[colIndex];
                }
            }
        }
        
        prestador.valorPorContrato = foundValue;
    }


    const segmentsToSearch = ['AP', 'AC', 'AT', 'AN', 'AH', 'AU', 'US'];
    let globalCoincidences: Coincidence[] = [];

    const allRipsBlocks: Record<string, string[]> = {};

    for (const content of Object.values(ripsFileContents)) {
        const blocks = parseRIPS(content);
        for (const segment in blocks) {
            if (!allRipsBlocks[segment]) allRipsBlocks[segment] = [];
            allRipsBlocks[segment].push(...blocks[segment]);
        }
    }
    
    cupsData.forEach(cupsRow => {
        const codeToSearch = cupsRow['CUPS'] || cupsRow['CUPS VIGENTE'];
        const vigenteCodeToSearch = cupsRow['CUPS VIGENTE'];
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
            const codePosition = { 'AC': 6, 'AP': 7, 'AU': 6, 'AH': 8, 'AN': 6, 'AT': 6 };
            const pos = codePosition[seg as keyof typeof codePosition];

            if (pos !== undefined) {
                 count = segmentLines.reduce((acc, line) => {
                    const cols = line.split(',');
                    if (cols[pos] === codeToSearch.toString() || (vigenteCodeToSearch && cols[pos] === vigenteCodeToSearch.toString())) {
                        return acc + 1;
                    }
                    return acc;
                }, 0);
            } else if(seg === 'US') {
                count = segmentLines.reduce((acc, line) => {
                     return acc + (line.includes(`,${codeToSearch},`) || (vigenteCodeToSearch && line.includes(`,${vigenteCodeToSearch},`)) ? 1 : 0);
                }, 0);
            }

            coincidence.coincidences[seg] = count;
            coincidence.total += count;
        });

        globalCoincidences.push(coincidence);
    });

    setCoincidenceReport({ prestadores: enrichedGlobalAf, data: globalCoincidences });
     toast({ title: "Reporte de coincidencias generado." });
  }

  const formatCurrency = (value?: number) => {
    if(value === undefined) return 'N/A';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
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
                onFileChange={(e) => handleGenericFileChange(e, setCupsFile, () => {})}
                onClean={() => {
                  setCupsFile(null);
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
                <Button onClick={handleProcessFiles} disabled={isProcessing || !cupsFile} size="lg">
                    {isProcessing ? <Cog className="animate-spin" /> : <Cog />}
                    Procesar Archivos Cargados
                </Button>
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
                          <p className="font-semibold text-green-700 dark:text-green-400">¡Archivos procesados!</p>
                          <p className="text-sm text-muted-foreground">Se cargaron <span className="font-bold text-foreground">{cupsData.length}</span> registros de mapeo. Ahora puede generar el reporte.</p>
                      </div>
                  </div>
                  <div className="flex justify-center py-4">
                      <Button onClick={handleGenerateCoincidenceReport} size="lg">
                          <Search className="mr-2"/>
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
                          {Object.values(coincidenceReport.prestadores).map((prestador, index) => (
                            <AccordionItem value={`item-${index}`} key={prestador.NI + index}>
                              <AccordionTrigger>
                                <div className="flex items-center gap-2">
                                  <Star className="text-amber-400" />
                                  <span className="font-semibold">{prestador.nombrePrestador}</span>
                                  <Badge variant="outline">NIT: {prestador.NI}</Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="p-4 border rounded-lg bg-card/50 space-y-2 text-sm">
                                  {prestador.departamento && <p><strong>Departamento:</strong> <span className="text-muted-foreground">{prestador.departamento}</span></p>}
                                  {prestador.municipio && <p><strong>Municipio:</strong> <span className="text-muted-foreground">{prestador.municipio}</span></p>}
                                  <p><strong>Número de contrato:</strong> <span className="text-muted-foreground">{prestador.contrato}</span></p>
                                  {prestador.valorPorContrato !== undefined && <p><strong>Valor por Contrato:</strong> <span className="font-bold text-primary">{formatCurrency(prestador.valorPorContrato)}</span></p>}
                                  <p><strong>Tipo de servicio:</strong> <span className="text-muted-foreground">{prestador.tipoServicio}</span></p>
                                  <p><strong>Régimen:</strong> <span className="text-muted-foreground">{prestador.regimen}</span></p>
                                  
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

    
