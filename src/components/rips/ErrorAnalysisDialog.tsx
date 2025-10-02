"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrainCircuit, LoaderCircle, Lightbulb, FileText } from "lucide-react";
import type { AnalyzeValidationErrorOutput } from "@/ai/flows/error-analysis-tool";
import type { AnalysisTarget } from "@/lib/types";
import { Badge } from "../ui/badge";

interface ErrorAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  data: AnalyzeValidationErrorOutput | null;
  target: AnalysisTarget | null;
}

export function ErrorAnalysisDialog({
  isOpen,
  onClose,
  isLoading,
  data,
  target
}: ErrorAnalysisDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            Análisis de Error de Validación con IA
          </DialogTitle>
          {target && (
            <DialogDescription>
              Analizando el error en <Badge variant="secondary">{target.fileName}</Badge> para el segmento <Badge variant="secondary">{target.segment}</Badge>.
              Esperados: <Badge>{target.expected}</Badge>, Encontrados: <Badge variant="destructive">{target.found}</Badge>.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-4 h-48">
              <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">
                La IA está analizando el archivo...
              </p>
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-accent" />
                  Análisis del Contexto
                </h3>
                <p className="text-sm text-muted-foreground bg-secondary p-4 rounded-md border">
                  {data.analysis}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-accent" />
                  Sugerencias de Corrección
                </h3>
                <ol className="list-decimal list-inside space-y-3">
                  {data.suggestions.map((suggestion, index) => (
                    <li key={index} className="border-l-4 border-primary pl-4 py-2 bg-card rounded-r-md">
                      <span className="font-medium">Paso {index + 1}:</span>
                      <p className="text-muted-foreground text-sm">{suggestion}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center space-y-4 h-48">
              <p className="text-muted-foreground">No se pudo obtener el análisis.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
