'use client';

import { useState } from 'react';
import RipsProcessor from '@/components/rips/RipsProcessor';
import DetailedReports from '@/components/rips/DetailedReports';
import UserAnalysis from '@/components/rips/UserAnalysis';
import { BarChartBig, LayoutGrid, FileSearch, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GlobalAfSummary, ValidationResult, CupsDataRow, CoincidenceReport } from '@/lib/types';


export default function Home() {
  // State lifted up to the parent component to persist across tabs
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [globalAf, setGlobalAf] = useState<GlobalAfSummary>({});
  const [cupsData, setCupsData] = useState<CupsDataRow[]>([]);
  const [coincidenceReport, setCoincidenceReport] = useState<CoincidenceReport | null>(null);

  return (
    <main className="container mx-auto px-4 py-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-primary tracking-tight font-headline flex items-center justify-center gap-3">
          <BarChartBig className="w-10 h-10 text-accent" />
          Procesador de Archivos RIPS
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Cargue, valide y analice sus archivos RIPS con la potencia de la IA.
        </p>
      </header>
      
      <Tabs defaultValue="validator" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="validator">
            <LayoutGrid className="mr-2" /> Validador RIPS
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileSearch className="mr-2" /> Reportes Detallados
          </TabsTrigger>
          <TabsTrigger value="users">
            <Star className="mr-2" /> Estadísticas y Rankings
            </TabsTrigger>
        </TabsList>
        <TabsContent value="validator" className="mt-6">
          <RipsProcessor
            fileContents={fileContents}
            setFileContents={setFileContents}
            validationResults={validationResults}
            setValidationResults={setValidationResults}
            globalAf={globalAf}
            setGlobalAf={setGlobalAf}
          />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <DetailedReports
            cupsData={cupsData}
            setCupsData={setCupsData}
            ripsFileContents={fileContents}
            globalAf={globalAf}
            coincidenceReport={coincidenceReport}
            setCoincidenceReport={setCoincidenceReport}
          />
        </TabsContent>
        <TabsContent value="users" className="mt-6">
          <UserAnalysis ripsFileContents={fileContents} cupsData={cupsData} />
        </TabsContent>
      </Tabs>

    </main>
  );
}
