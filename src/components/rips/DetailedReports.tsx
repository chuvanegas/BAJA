'use client';

import { useState, useRef } from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSearch, Upload, File, X, Cog, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "../ui/scroll-area";

// Define a type for the CUPS data row
type CupsDataRow = {
  'Tipo Ser': string;
  'CUPS': string;
  'CUPS VIGENTE': string;
  'NOMBRE CUPS': string;
};

export default function DetailedReports() {
  const [cupsFile, setCupsFile] = useState<File | null>(null);
  const [cupsData, setCupsData] = useState<CupsDataRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCupsFile(file);
      setCupsData([]); // Reset data when a new file is loaded
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
            
            // This is a simple XML parser assuming a structure like <rows><row><column>value</column>...</row></rows>
            // This needs to be adapted to the actual XML structure.
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

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch /> Reportes Detallados
        </CardTitle>
        <CardDescription>
          Cargue y procese un archivo de mapeo de CUPS para enriquecer sus reportes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-start gap-4 p-4 border rounded-lg md:flex-row md:items-center">
          <p className="text-sm text-muted-foreground flex-1">
            Para enriquecer los reportes, puede cargar un archivo de mapeo de códigos CUPS.
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
                    <p className="font-semibold text-green-700 dark:text-green-400">¡Archivo procesado con éxito!</p>
                    <p className="text-sm text-muted-foreground">Se cargaron <span className="font-bold text-foreground">{cupsData.length}</span> registros del mapeo de CUPS.</p>
                </div>
            </div>
            <ScrollArea className="h-72 w-full rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead>CUPS</TableHead>
                    <TableHead>CUPS Vigente</TableHead>
                    <TableHead>Tipo Ser</TableHead>
                    <TableHead>Nombre CUPS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cupsData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-xs">{row['CUPS']}</TableCell>
                      <TableCell className="font-mono text-xs">{row['CUPS VIGENTE']}</TableCell>
                      <TableCell className="text-xs">{row['Tipo Ser']}</TableCell>
                      <TableCell className="text-xs">{row['NOMBRE CUPS']}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
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
