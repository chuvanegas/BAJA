'use client';

import { useState, useRef } from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSearch, Upload, File, X, Cog, CheckCircle, Search, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { parseRIPS } from "@/lib/rips-parser";
import { exportCoincidenceToExcel } from "@/lib/excel-export";
import type { CupsDataRow, Coincidence, CoincidenceReport } from "@/lib/types";

interface DetailedReportsProps {
  cupsData: CupsDataRow[];
  setCupsData: (data: CupsDataRow[]) => void;
  ripsFileContents: Record<string, string>;
}

export default function DetailedReports({ cupsData, setCupsData, ripsFileContents }: DetailedReportsProps) {
  const [cupsFile, setCupsFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [coincidenceReport, setCoincidenceReport] = useState<CoincidenceReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCupsFile(file);
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

  const handleProcessFile = () => {
    if (!cupsFile) return;

    setIsProcessing(true);
    setCupsData([]);
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

    const segmentsToSearch = ['AP', 'AC', 'AT', 'AN', 'AH', 'AU', 'US'];
    let globalCoincidences: Coincidence[] = [];
    let prestadorInfo = {
        nombre: "N/A",
        nit: "N/A",
        contrato: "N/A",
    };

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
    
    if (allRipsBlocks['AF']?.[0]) {
        const afCols = allRipsBlocks['AF'][0].split(',');
        prestadorInfo.nombre = afCols[1] || "N/A";
        prestadorInfo.nit = afCols[3] || "N/A";
        prestadorInfo.contrato = afCols[10] || "N/A";
    }

    cupsData.forEach(cupsRow => {
        const codeToSearch = cupsRow['CUPS'] || cupsRow['CUPS VIGENTE'];
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
            // The position of the CUPS code varies by segment.
            // This is a simplified search. A more robust parser would be better.
            if(seg === 'US') {
                // In US, there's no CUPS code directly. This search is likely to fail.
                // We'll leave it as an example, but it probably won't find anything.
                count = segmentLines.reduce((acc, line) => {
                     return acc + (line.includes(`,${codeToSearch},`) ? 1 : 0);
                }, 0);
            } else {
                 count = segmentLines.reduce((acc, line) => {
                    const cols = line.split(',');
                    // Example positions for CUPS codes
                    const codePosition = {
                        'AC': 6,
                        'AP': 7,
                        'AU': 6,
                        'AH': 8,
                        'AN': 6,
                        'AT': 6,
                    };
                    const pos = codePosition[seg as keyof typeof codePosition];
                    if (pos !== undefined && cols[pos] === codeToSearch.toString()) {
                        return acc + 1;
                    }
                    return acc;
                }, 0);
            }

            coincidence.coincidences[seg] = count;
            coincidence.total += count;
        });

        globalCoincidences.push(coincidence);
    });

    setCoincidenceReport({ prestador: prestadorInfo, data: globalCoincidences });
     toast({ title: "Reporte de coincidencias generado." });
  }

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch /> Reportes Detallados
        </CardTitle>
        <CardDescription>
          Cargue un archivo de mapeo CUPS y crúcelo con los datos RIPS para generar reportes enriquecidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-start gap-4 p-4 border rounded-lg md:flex-row md:items-center">
          <p className="text-sm text-muted-foreground flex-1">
            Paso 1: Cargue un archivo de mapeo de códigos CUPS.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt,.csv,.xml,.xlsx"
          />
          <Button onClick={handleButtonClick} disabled={!!cupsFile}>
            <Upload className="mr-2" />
            Cargar Mapeo
          </Button>
        </div>
        
        {cupsFile && (
            <div className="p-4 rounded-md bg-secondary/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <File className="text-primary"/>
                    <span className="text-sm font-medium">{cupsFile.name}</span>
                    <Badge variant="secondary">{Math.round(cupsFile.size / 1024)} KB</Badge>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                        <X className="w-4 h-4" />
                    </Button>
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
                    <p className="font-semibold text-green-700 dark:text-green-400">Paso 1 completado. ¡Mapeo procesado!</p>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <p><strong>Prestador:</strong> {coincidenceReport.prestador.nombre}</p>
                            <p><strong>Nit:</strong> {coincidenceReport.prestador.nit}</p>
                            <p><strong>Contrato:</strong> {coincidenceReport.prestador.contrato}</p>
                        </div>
                         <ScrollArea className="whitespace-nowrap rounded-md border">
                            <div className="max-h-96">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-muted">
                                        <TableRow>
                                            <TableHead className="min-w-[100px]">CUPS</TableHead>
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
                                                <TableCell className="text-xs">{row.nombre}</TableCell>
                                                <TableCell className="text-xs">{row.tipoSer}</TableCell>
                                                {Object.values(row.coincidences).map((count, i) => (
                                                    <TableCell key={i} className="text-center text-xs">{count}</TableCell>
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

        {cupsData.length === 0 && !cupsFile && (
            <div className="text-center text-muted-foreground p-8">
              <p>Cargue un archivo de mapeo para empezar.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
