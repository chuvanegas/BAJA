'use client';

import { useState, useRef } from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { File, Upload, Cog, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";

type GenericRow = Record<string, any>;

export default function ContractAnalysis() {
  const [asisteFile, setAsisteFile] = useState<File | null>(null);
  const [especialidadesFile, setEspecialidadesFile] = useState<File | null>(null);
  
  const [asisteData, setAsisteData] = useState<GenericRow[]>([]);
  const [especialidadesData, setEspecialidadesData] = useState<GenericRow[]>([]);
  
  const [isProcessingAsiste, setIsProcessingAsiste] = useState(false);
  const [isProcessingEspecialidades, setIsProcessingEspecialidades] = useState(false);
  
  const asisteInputRef = useRef<HTMLInputElement>(null);
  const especialidadesInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (type: 'asiste' | 'especialidades') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === 'asiste') {
        setAsisteFile(file);
        setAsisteData([]);
      } else {
        setEspecialidadesFile(file);
        setEspecialidadesData([]);
      }
      toast({
        title: "Archivo cargado",
        description: `Se ha seleccionado el archivo: ${file.name}`,
      });
    }
  };

  const handleProcessFile = (type: 'asiste' | 'especialidades') => () => {
    const file = type === 'asiste' ? asisteFile : especialidadesFile;
    if (!file) return;

    if (type === 'asiste') setIsProcessingAsiste(true);
    else setIsProcessingEspecialidades(true);
    
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<GenericRow>(worksheet);

        if (type === 'asiste') {
          setAsisteData(jsonData);
        } else {
          setEspecialidadesData(jsonData);
        }
        
        toast({
          title: "Procesamiento completo",
          description: `Se encontraron y cargaron ${jsonData.length} registros de ${file.name}.`,
        });
      } catch (error) {
        console.error("Error processing file:", error);
        toast({ title: "Error al procesar", variant: "destructive" });
      } finally {
        if (type === 'asiste') setIsProcessingAsiste(false);
        else setIsProcessingEspecialidades(false);
      }
    };

    reader.onerror = () => {
        toast({ title: "Error de lectura", variant: "destructive" });
        if (type === 'asiste') setIsProcessingAsiste(false);
        else setIsProcessingEspecialidades(false);
    }
    
    reader.readAsBinaryString(file);
  };
  
  const handleClean = (type: 'asiste' | 'especialidades') => () => {
      if (type === 'asiste') {
          setAsisteFile(null);
          setAsisteData([]);
          if(asisteInputRef.current) asisteInputRef.current.value = "";
      } else {
          setEspecialidadesFile(null);
          setEspecialidadesData([]);
          if(especialidadesInputRef.current) especialidadesInputRef.current.value = "";
      }
      toast({ title: "Archivos y datos limpiados." });
  }

  const renderTable = (data: GenericRow[]) => {
      if (data.length === 0) return null;
      const headers = Object.keys(data[0]);
      return (
        <ScrollArea className="whitespace-nowrap rounded-md border max-h-96">
            <Table>
                <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                        {headers.map(h => <TableHead key={h}>{h}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, i) => (
                        <TableRow key={i}>
                            {headers.map(h => <TableCell key={h}>{row[h]}</TableCell>)}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      );
  }

  return (
    <div className="space-y-8">
        {/* Asiste-EspeB Uploader */}
        <Card>
            <CardHeader>
                <CardTitle>Plantilla Asiste-EspeB</CardTitle>
                <CardDescription>Cargue el archivo de Excel para el análisis de contratos Asistenciales y de Especialidades Básicas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col items-start gap-4 p-4 border rounded-lg md:flex-row md:items-center">
                    <input type="file" ref={asisteInputRef} onChange={handleFileChange('asiste')} className="hidden" accept=".xlsx"/>
                    <div className="flex-1">
                        <Button onClick={() => asisteInputRef.current?.click()} disabled={!!asisteFile}>
                            <Upload className="mr-2" /> Cargar Asiste-EspeB
                        </Button>
                    </div>
                    {asisteFile && (
                        <div className="flex items-center gap-2">
                             <File className="text-primary"/>
                            <span className="text-sm font-medium">{asisteFile.name}</span>
                            <Badge variant="secondary">{Math.round(asisteFile.size / 1024)} KB</Badge>
                            <Button variant="ghost" size="icon" onClick={handleClean('asiste')}>
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        </div>
                    )}
                </div>
                 {asisteFile && (
                     <div className="flex justify-end">
                        <Button onClick={handleProcessFile('asiste')} disabled={isProcessingAsiste}>
                            {isProcessingAsiste ? <Cog className="animate-spin" /> : <Cog />}
                            Procesar Plantilla
                        </Button>
                    </div>
                 )}
                 {asisteData.length > 0 && renderTable(asisteData)}
            </CardContent>
        </Card>

        {/* Especialidades Uploader */}
        <Card>
            <CardHeader>
                <CardTitle>Plantilla Especialidades</CardTitle>
                <CardDescription>Cargue el archivo de Excel para el análisis de contratos de Especialidades.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex flex-col items-start gap-4 p-4 border rounded-lg md:flex-row md:items-center">
                    <input type="file" ref={especialidadesInputRef} onChange={handleFileChange('especialidades')} className="hidden" accept=".xlsx"/>
                    <div className="flex-1">
                        <Button onClick={() => especialidadesInputRef.current?.click()} disabled={!!especialidadesFile}>
                            <Upload className="mr-2" /> Cargar Especialidades
                        </Button>
                    </div>
                     {especialidadesFile && (
                        <div className="flex items-center gap-2">
                             <File className="text-primary"/>
                            <span className="text-sm font-medium">{especialidadesFile.name}</span>
                            <Badge variant="secondary">{Math.round(especialidadesFile.size / 1024)} KB</Badge>
                            <Button variant="ghost" size="icon" onClick={handleClean('especialidades')}>
                                <Trash2 className="w-4 h-4"/>
                            </Button>
                        </div>
                    )}
                </div>
                {especialidadesFile && (
                    <div className="flex justify-end">
                        <Button onClick={handleProcessFile('especialidades')} disabled={isProcessingEspecialidades}>
                            {isProcessingEspecialidades ? <Cog className="animate-spin" /> : <Cog />}
                            Procesar Plantilla
                        </Button>
                    </div>
                )}
                {especialidadesData.length > 0 && renderTable(especialidadesData)}
            </CardContent>
        </Card>
    </div>
  );
}
