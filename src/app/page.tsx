import RipsProcessor from '@/components/rips/RipsProcessor';
import { BarChartBig } from 'lucide-react';

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
      <RipsProcessor />
    </main>
  );
}
