'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSearch, Upload } from "lucide-react";

export default function DetailedReports() {
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
        <div className="flex items-center gap-4 p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">
            Para enriquecer los reportes, puede cargar un archivo de mapeo de códigos CUPS.
          </p>
          <Button>
            <Upload className="mr-2" />
            Cargar mapeo de CUPS
          </Button>
        </div>
        <div className="text-center text-muted-foreground p-8">
          <p>Próximamente: Reportes detallados aquí.</p>
        </div>
      </CardContent>
    </Card>
  );
}
