'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileSearch } from "lucide-react";

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
      <CardContent>
        <div className="text-center text-muted-foreground p-8">
          <p>Próximamente: Reportes detallados aquí.</p>
        </div>
      </CardContent>
    </Card>
  );
}
