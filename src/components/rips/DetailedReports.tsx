'use client';

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSearch, Upload, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "../ui/badge";

export default function DetailedReports() {
  const [cupsFile, setCupsFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCupsFile(file);
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
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    toast({
        title: "Archivo removido",
    });
  }

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch /> Reportes Detallados
        </CardTitle>
        <CardDescription>
          Esta sección contendrá reportes avanzados y análisis de los datos validados.
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
            Cargar mapeo de CUPS
          </Button>
        </div>
        
        {cupsFile && (
            <div className="p-4 rounded-md bg-secondary/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <File className="text-primary"/>
                    <span className="text-sm font-medium">{cupsFile.name}</span>
                    <Badge variant="secondary">{Math.round(cupsFile.size / 1024)} KB</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                    <X className="w-4 h-4" />
                </Button>
            </div>
        )}

        <div className="text-center text-muted-foreground p-8">
          <p>Próximamente: Reportes detallados aquí.</p>
        </div>
      </CardContent>
    </Card>
  );
}
