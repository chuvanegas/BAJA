'use client';

import { useState, useTransition } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { analyzeValidationError, AnalyzeValidationErrorOutput } from '@/ai/flows/error-analysis-tool';
import {
  Upload,
  BadgeCheck,
  Trash2,
  Download,
  BrainCircuit,
  FileText,
  LoaderCircle,
  AlertTriangle,
  FilePlus,
  Star
} from 'lucide-react';
import { type GlobalAfSummary, type ValidationResult, type AnalysisTarget } from '@/lib/types';
import { parseRIPS, expectedFromCT, foundBySegment, extractAF } from '@/lib/rips-parser';
import { exportToExcel } from '@/lib/excel-export';
import { ErrorAnalysisDialog } from './ErrorAnalysisDialog';
import { Separator } from '@/components/ui/separator';

export default function RipsProcessor() {
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [globalAf, setGlobalAf] = useState<GlobalAfSummary>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisTarget, setAnalysisTarget] = useState<AnalysisTarget | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeValidationErrorOutput | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      toast({ title: "No se seleccionaron archivos", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const contents: Record<string, string> = {};
      await Promise.all(Array.from(files).map(file => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            contents[file.name] = e.target?.result as string;
            resolve();
          };
          reader.onerror = (e) => reject(e);
          reader.readAsText(file, 'UTF-8');
        });
      }));
      setFileContents(contents);
      toast({ title: `${Object.keys(contents).length} archivos cargados correctamente.` });
    } catch (error) {
      console.error(error);
      toast({ title: "Error al cargar archivos", description: "Por favor, intente de nuevo.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = () => {
    if (Object.keys(fileContents).length === 0) {
      toast({ title: "Primero debe cargar archivos", variant: "destructive" });
      return;
    }
    
    startTransition(() => {
        const newValidationResults: ValidationResult[] = [];
        let newGlobalAf: GlobalAfSummary = {};

        for (const [fileName, text] of Object.entries(fileContents)) {
            const blocks = parseRIPS(text);
            const expected = expectedFromCT(blocks);
            const found = foundBySegment(blocks);
            const allSegments = new Set([...Object.keys(expected), ...Object.keys(found)]);
            allSegments.delete("CT");

            const result: ValidationResult = {
                fileName,
                segments: [...allSegments].sort().map(seg => {
                    const exp = expected[seg] || 0;
                    const enc = found[seg] || 0;
                    return {
                        name: seg,
                        expected: exp,
                        found: enc,
                        status: exp === enc ? 'ok' : 'fail'
                    };
                })
            };
            newValidationResults.push(result);

            const afData = extractAF(blocks, fileName);
            Object.entries(afData).forEach(([key, value]) => {
                if (!newGlobalAf[key]) {
                    newGlobalAf[key] = value;
                } else {
                    newGlobalAf[key].detalles.push(...value.detalles);
                    newGlobalAf[key].valorTotal += value.valorTotal;
                }
            });
        }
        setValidationResults(newValidationResults);
        setGlobalAf(newGlobalAf);
        toast({ title: "Validación completada." });
    });
  };

  const handleClean = () => {
    setFileContents({});
    setValidationResults([]);
    setGlobalAf({});
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if(fileInput) fileInput.value = "";
    toast({ title: "Pantalla reiniciada." });
  };
  
  const handleAnalyzeClick = async (target: AnalysisTarget) => {
    setAnalysisTarget(target);
    setIsDialogOpen(true);
    setIsAnalyzing(true);
    try {
        const result = await analyzeValidationError(target);
        setAnalysisResult(result);
    } catch(e) {
        console.error(e);
        toast({ title: "Error en el análisis", description: "No se pudo conectar con el servicio de IA.", variant: "destructive" });
        setIsDialogOpen(false);
    } finally {
        setIsAnalyzing(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <FilePlus /> Cargar Archivos
            </CardTitle>
            <CardDescription>Seleccione uno o más archivos RIPS (.txt) para iniciar el proceso.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Input id="fileInput" type="file" multiple onChange={handleFileChange} className="max-w-xs cursor-pointer file:text-primary file:font-semibold" />
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Button onClick={handleValidate} disabled={isLoading || isPending || Object.keys(fileContents).length === 0}>
                {isPending ? <LoaderCircle className="animate-spin" /> : <BadgeCheck />}
                Validar
              </Button>
              <Button variant="destructive" onClick={handleClean} disabled={isLoading || isPending}>
                <Trash2 />
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      { (isPending) && 
        <div className="flex justify-center items-center p-8 text-muted-foreground">
          <LoaderCircle className="animate-spin h-8 w-8 mr-2"/>
          Validando archivos...
        </div>
      }
      
      {Object.keys(globalAf).length > 0 && !isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star className="text-amber-400"/> Resumen de Prestadores (AF)</CardTitle>
            <CardDescription>Resumen consolidado de todos los archivos AF cargados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.values(globalAf).map((af, index) => (
              <div key={af.NI + index} className="p-4 border rounded-lg bg-card/50 space-y-2">
                <p><strong>Nombre del prestador:</strong> <span className="text-muted-foreground">{af.nombrePrestador}</span></p>
                <p><strong>NI:</strong> <span className="text-muted-foreground">{af.NI}</span></p>
                <p><strong>Número de contrato:</strong> <span className="text-muted-foreground">{af.contrato}</span></p>
                <p><strong>Tipo de servicio:</strong> <span className="text-muted-foreground">{af.tipoServicio}</span></p>
                <p><strong>Régimen:</strong> <span className="text-muted-foreground">{af.regimen}</span></p>
                
                <p className="font-semibold pt-2">Periodos de radicación y valores:</p>
                <ul className="list-none pl-2 space-y-1 text-sm text-muted-foreground">
                  {af.detalles.map((d, i) => (
                    <li key={i}>{d.periodo} → <span className="font-medium text-foreground">{formatCurrency(d.valor)}</span> <span className="text-xs italic opacity-80"> (Archivo: {d.archivo})</span></li>
                  ))}
                </ul>
                <p className="font-bold text-lg text-right pt-2">
                  Valor LMA Total: <span className="text-primary">{formatCurrency(af.valorTotal)}</span>
                </p>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button onClick={() => exportToExcel(globalAf)}>
              <Download /> Exportar Resumen AF
            </Button>
          </CardFooter>
        </Card>
      )}

      {validationResults.length > 0 && !isPending && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Validación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {validationResults.map((result) => (
              <Card key={result.fileName} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><FileText className="text-accent" /> {result.fileName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Segmento</TableHead>
                        <TableHead className="text-center">Esperados (CT)</TableHead>
                        <TableHead className="text-center">Encontrados</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.segments.length > 0 ? result.segments.map((seg) => (
                        <TableRow key={seg.name}>
                          <TableCell className="font-medium">{seg.name}</TableCell>
                          <TableCell className="text-center">{seg.expected}</TableCell>
                          <TableCell className="text-center">{seg.found}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={seg.status === 'ok' ? 'secondary' : 'destructive'}>
                              {seg.status === 'ok' ? '✅ Correcto' : '❌ Diferencia'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {seg.status === 'fail' && (
                              <Button variant="ghost" size="sm" onClick={() => handleAnalyzeClick({fileName: result.fileName, segment: seg.name, expected: seg.expected, found: seg.found, fileContent: fileContents[result.fileName]})}>
                                <BrainCircuit className="mr-2 h-4 w-4 text-accent"/> Analizar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No se detectaron segmentos o no hay CT.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isPending && validationResults.length === 0 && Object.keys(globalAf).length === 0 && Object.keys(fileContents).length > 0 && (
        <Card className="text-center p-8">
            <CardHeader><CardTitle>Listo para validar</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Haga clic en el botón 'Validar' para procesar los archivos cargados.</p></CardContent>
        </Card>
      )}
      
      <ErrorAnalysisDialog 
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        isLoading={isAnalyzing}
        data={analysisResult}
        target={analysisTarget}
        />
    </div>
  );
}
