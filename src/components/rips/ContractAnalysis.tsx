'use client';

import { useRef } from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { File, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";
import type { GenericRow } from "@/lib/types";

interface ContractAnalysisProps {
  asisteFile: File | null;
  setAsisteFile: (file: File | null) => void;
  setAsisteData: (data: GenericRow[]) => void;
  especialidadesFile: File | null;
  setEspecialidadesFile: (file: File | null) => void;
  setEspecialidadesData: (data: GenericRow[]) => void;
}

export default function ContractAnalysis({
  asisteFile,
  setAsisteFile,
  setAsisteData,
  especialidadesFile,
  setEspecialidadesFile,
  setEspecialidadesData,
}: ContractAnalysisProps) {
  const asisteInputRef = useRef<HTMLInputElement>(null);
  const especialidadesInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = (file: File, setData: (data: GenericRow[]) => void) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<GenericRow>(worksheet);

        setData(jsonData);
        
        toast({
          title: "Archivo procesado en segundo plano",
          description: `Se cargaron ${jsonData.length} registros de ${file.name}.`,
        });
      } catch (error) {
        console.error("Error processing file:", error);
        toast({ title: "Error al procesar", variant: "destructive" });
      }
    };

    reader.onerror = () => {
        toast({ title: "Error de lectura", variant: "destructive" });
    }
    
    reader.readAsBinaryString(file);
  }

  const handleFileChange = (type: 'asiste' | 'especialidades') => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (type === 'asiste') {
        setAsisteFile(file);
        setAsisteData([]);
        processFile(file, setAsisteData);
      } else {
        setEspecialidadesFile(file);
        setEspecialidadesData([]);
        processFile(file, setEspecialidadesData);
      }
      toast({
        title: "Archivo seleccionado",
        description: `Se ha seleccionado el archivo: ${file.name}`,
      });
    }
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
      toast({ title: "Archivo y datos limpiados." });
  }

  return (
    <div className="space-y-6">
        {/* Asiste-EspeB Uploader */}
        <Card>
            <CardHeader>
                <CardTitle>Plantilla Asiste-EspeB</CardTitle>
                <CardDescription>Cargue el archivo de Excel para enriquecer el reporte con datos de ubicación (Departamento, Municipio).</CardDescription>
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
            </CardContent>
        </Card>

        {/* Especialidades Uploader */}
        <Card>
            <CardHeader>
                <CardTitle>Plantilla Especialidades</CardTitle>
                <CardDescription>Cargue el archivo de Excel para cruzar por número de contrato.</CardDescription>
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
            </CardContent>
        </Card>
    </div>
  );
}