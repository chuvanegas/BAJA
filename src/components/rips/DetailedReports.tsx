'use client';

import { useState, useRef } from "react";
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSearch, Upload, File, X, Cog, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";

export default function DetailedReports() {
  const [cupsFile, setCupsFile] = useState<File | null>(null);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Reset state when a new file is loaded
      setCupsFile(file);
      setRecordCount(null);
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
    setRecordCount(null);
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
    setRecordCount(null);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let count = 0;
        
        if (cupsFile.name.endsWith('.xlsx')) {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          // Assuming first row is header
          count = json.length > 0 ? json.length -1 : 0;
        } else if (cupsFile.name.endsWith('.csv') || cupsFile.name.endsWith('.txt')) {
          const text = data as string;
          // Assuming lines are records and first line is header.
          const lines = text.split('\n').filter(line => line.trim() !== '');
          count = lines.length > 0 ? lines.length - 1 : 0;
        } else if (cupsFile.name.endsWith('.xml')) {
            const text = data as string;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "application/xml");
            // A simple heuristic: count a common item tag. This might need adjustment.
            const items = xmlDoc.getElementsByTagName('row'); // A common tag in XML exports
            count = items.length;
        } else {
            toast({
                title: "Formato no soportado",
                description: "Por favor, cargue un archivo .xlsx, .csv, .txt o .xml.",
                variant: "destructive"
            });
            setIsProcessing(false);
            return;
        }

        setRecordCount(count);
        toast({
          title: "Procesamiento completo",
          description: `Se encontraron ${count} registros.`,
        });

      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          title: "Error al procesar",
          description: "No se pudo leer el contenido del archivo.",
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

        {recordCount !== null && (
            <div className="p-4 rounded-md border-l-4 border-green-500 bg-green-500/10 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">¡Archivo procesado con éxito!</p>
                    <p className="text-sm text-muted-foreground">Se cargaron <span className="font-bold text-foreground">{recordCount}</span> registros del mapeo de CUPS.</p>
                </div>
            </div>
        )}

        {recordCount === null && !cupsFile && (
            <div className="text-center text-muted-foreground p-8">
            <p>Próximamente: Reportes detallados aquí.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
