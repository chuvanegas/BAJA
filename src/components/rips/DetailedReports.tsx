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
import type { CupsDataRow, Coincidence, CoincidenceReport, GlobalAfSummary, GenericRow, AfProviderData } from "@/lib/types";
import { Separator } from "../ui/separator";
import ContractAnalysis from "./ContractAnalysis";

interface DetailedReportsProps {
  cupsData: CupsDataRow[];
  setCupsData: (data: CupsDataRow[]) => void;
  ripsFileContents: Record<string, string>;
  globalAf: GlobalAfSummary;
  coincidenceReport: CoincidenceReport | null;
  setCoincidenceReport: (report: CoincidenceReport | null) => void;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [asisteFile, setAsisteFile] = useState<File | null>(null);
  const [especialidadesFile, setEspecialidadesFile] = useState<File | null>(null);
  const [asisteData, setAsisteData] = useState<GenericRow[]>([]);
  const [especialidadesData, setEspecialidadesData] = useState<GenericRow[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCupsFile(file);
      // Reset dependent state when a new file is chosen
      setCupsData([]);
      setCoincidenceReport(null);
      toast({
        title: "Archivo cargado",
        description: `Se ha seleccionado el archivo: ${file.name}`,
      });
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleRemoveFile = () => {
    setCupsFile(null);
    setCupsData([]);
    setCoincidenceReport(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    toast({
        title: "Archivo removido",
    });
  }

  const handleClean = () => {
    handleRemoveFile();
  }

  const handleProcessFile = () => {
    if (!cupsFile) return;

    setIsProcessing(true);
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
                Array.from(row.children).forEach((child, index) => {
                  rowData[headers[index]] = child.textContent;
                });
                return rowData as CupsDataRow;
              });
            } else {
               toast({
                title: "Formato XML no estándar",
                description: "No se pudieron encontrar filas ('<row>') en el XML.",
                variant: "destructive"
              });
            }
        } else {
            toast({
                title: "Formato no soportado",
                description: "Por favor, cargue un archivo .xlsx, .csv, .txt o .xml.",
                variant: "destructive"
            });
            setIsProcessing(false);
            return;
        }

        setCupsData(jsonData);
        toast({
          title: "Procesamiento completo",
          description: `Se encontraron y cargaron ${jsonData.length} registros.`,
        });

      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          title: "Error al procesar",
          description: "No se pudo leer el contenido del archivo. Verifique el formato.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
        toast({ title: "Error de lectura", description: "No se pudo leer el archivo.", variant: "destructive" });
        setIsProcessing(false);
    }
    
    if (cupsFile.name.endsWith('.xlsx')) {
        reader.readAsBinaryString(cupsFile);
    } else {
        reader.readAsText(cupsFile);
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

    // Enrich globalAf with Departamento and Municipio from asisteData
    const enrichedGlobalAf: GlobalAfSummary = { ...globalAf };
    if (asisteData.length > 0) {
        const asisteMap = new Map<string, GenericRow>();
        asisteData.forEach(row => {
            const nit = row['ID Nit'];
            if (nit) {
                asisteMap.set(nit.toString(), row);
            }
        });

        for (const key in enrichedGlobalAf) {
            const prestador = enrichedGlobalAf[key];
            const asisteRow = asisteMap.get(prestador.NI);
            if (asisteRow) {
                prestador.departamento = asisteRow['Departamento'];
                prestador.municipio = asisteRow['Municipio'];
            }
        }
    }


    const segmentsToSearch = ['AP', 'AC', 'AT', 'AN', 'AH', 'AU', 'US'];
    let globalCoincidences: Coincidence[] = [];

    const allRipsBlocks: Record<string, string[]> = {};

    for (const content of Object.values(ripsFileContents)) {
        const blocks = parseRIPS(content);
        for (const segment in blocks) {
            if (!allRipsBlocks[segment]) {
                allRipsBlocks[segment] = [];
            }
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
            const codePosition = {
                'AC': 6, 'AP': 7, 'AU': 6, 'AH': 8, 'AN': 6, 'AT': 6,
            };
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch /> Reportes Detallados
        </CardTitle>
        <CardDescription>
          Cruce datos RIPS con mapeos CUPS y analice plantillas de contratos para generar reportes enriquecidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-lg font-semibold">Cruce con Mapeo y Análisis de Contratos</AccordionTrigger>
            <AccordionContent className="pt-4 space-y-6">
              <div className="flex flex-col items-start gap-4 p-4 border rounded-lg md:flex-row md:items-center">
                <p className="text-sm text-muted-foreground flex-1">
                  Cargue un archivo de mapeo de códigos CUPS para cruzarlo con los RIPS.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".txt,.csv,.xml,.xlsx"
                />
                <div className="flex items-center gap-2">
                  <Button onClick={handleButtonClick} disabled={!!cupsFile}>
                    <Upload className="mr-2" />
                    Cargar Mapeo
                  </Button>
                  <Button variant="ghost" onClick={handleClean} disabled={!cupsFile && !coincidenceReport}>
                    <Trash2 className="mr-2" />
                    Limpiar
                  </Button>
                </div>
              </div>
              
              <ContractAnalysis 
                asisteFile={asisteFile}
                setAsisteFile={setAsisteFile}
                setAsisteData={setAsisteData}
                especialidadesFile={especialidadesFile}
                setEspecialidadesFile={setEspecialidadesFile}
                setEspecialidadesData={setEspecialidadesData}
              />
              
              {cupsFile && (
                  <div className="p-4 rounded-md bg-secondary/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                          <File className="text-primary"/>
                          <span className="text-sm font-medium">{cupsFile.name}</span>
                          <Badge variant="secondary">{Math.round(cupsFile.size / 1024)} KB</Badge>
                      </div>
                      <Button onClick={handleProcessFile} disabled={isProcessing}>
                          {isProcessing ? <Cog className="animate-spin" /> : <Cog />}
                          Procesar Mapeo
                      </Button>
                  </div>
              )}

              {cupsData.length > 0 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-md border-l-4 border-green-500 bg-green-500/10 flex items-center gap-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                          <p className="font-semibold text-green-700 dark:text-green-400">¡Mapeo procesado!</p>
                          <p className="text-sm text-muted-foreground">Se cargaron <span className="font-bold text-foreground">{cupsData.length}</span> registros. Ahora puede generar el reporte.</p>
                      </div>
                  </div>
                  <div className="flex justify-center py-4">
                      <Button onClick={handleGenerateCoincidenceReport} size="lg">
                          <Search className="mr-2"/>
                          Generar Reporte de Coincidencias
                      </Button>
                  </div>
                </div>
              )}
              
              {coincidenceReport && (
                  <div className="space-y-4 pt-6">
                      <Card>
                          <CardHeader>
                              <CardTitle>Reporte de Coincidencias CUPS</CardTitle>
                              <CardDescription>Resultados del cruce entre el mapeo CUPS y los archivos RIPS cargados.</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                              
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {cupsData.length === 0 && !cupsFile && (
            <div className="text-center text-muted-foreground p-8">
              <p>Seleccione una de las opciones superiores para empezar.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
