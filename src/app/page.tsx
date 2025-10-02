import RipsProcessor from '@/components/rips/RipsProcessor';
import DetailedReports from '@/components/rips/DetailedReports';
import { BarChartBig, LayoutGrid, FileSearch } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function Home() {
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="validator">
            <LayoutGrid className="mr-2" /> Validador RIPS
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileSearch className="mr-2" /> Reportes Detallados
            </TabsTrigger>
        </TabsList>
        <TabsContent value="validator" className="mt-6">
          <RipsProcessor />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <DetailedReports />
        </TabsContent>
      </Tabs>

    </main>
  );
}
