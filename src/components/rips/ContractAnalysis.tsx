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
       <div className="p-4 border rounded-lg space-y-3">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input type="file" ref={inputRef} onChange={onFileChange} className="hidden" accept=".xlsx"/>
            <div className="flex-1">
                <Button onClick={() => inputRef.current?.click()} disabled={!!file} size="sm">
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plantillas de Enriquecimiento</CardTitle>
        <CardDescription>Cargue los archivos de Excel para enriquecer el reporte con datos adicionales de ubicación y contratos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Uploader
            title="Plantilla Asiste-EspeB"
            description="Para datos de ubicación (Depto/Municipio)."
            file={asisteFile}
            inputRef={asisteInputRef}
            onFileChange={handleFileChange('asiste')}
            onClean={handleClean('asiste')}
        />
        <Uploader
            title="Plantilla Especialidades"
            description="Para cruzar por número de contrato."
            file={especialidadesFile}
            inputRef={especialidadesInputRef}
            onFileChange={handleFileChange('especialidades')}
            onClean={handleClean('especialidades')}
        />
      </CardContent>
    </Card>
  );
}
