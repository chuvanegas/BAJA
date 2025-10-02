'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { parseRIPS } from '@/lib/rips-parser';
import { Input } from '../ui/input';
import type { UserData } from '@/lib/types';

interface UserAnalysisProps {
  ripsFileContents: Record<string, string>;
}

const parseUser = (line: string): UserData | null => {
  const cols = line.split(',');
  if (cols.length < 15) return null;

  const edad = parseInt(cols[8], 10);
  const unidadMedida = cols[9];
  let edadFormateada = '';
  if (!isNaN(edad)) {
    switch (unidadMedida) {
      case '1': edadFormateada = `${edad}A`; break;
      case '2': edadFormateada = `${edad}M`; break;
      case '3': edadFormateada = `${edad}D`; break;
      default: edadFormateada = `${edad}`;
    }
  }

  return {
    tipoDoc: cols[0],
    numDoc: cols[1],
    codigoHabilitacion: cols[2],
    tipoUsuario: cols[3],
    primerApellido: cols[4],
    segundoApellido: cols[5],
    primerNombre: cols[6],
    segundoNombre: cols[7],
    edad,
    unidadMedidaEdad: unidadMedida,
    sexo: cols[10],
    departamento: cols[11],
    municipio: cols[12],
    zona: cols[13],
    edadFormateada,
    nombreCompleto: `${cols[6]} ${cols[7]} ${cols[4]} ${cols[5]}`.trim(),
  };
};

export default function UserAnalysis({ ripsFileContents }: UserAnalysisProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();

  const handleProcessUsers = () => {
    if (Object.keys(ripsFileContents).length === 0) {
      toast({
        title: 'No hay archivos RIPS cargados',
        description: 'Por favor, cargue y valide los archivos en la pestaña "Validador RIPS" primero.',
        variant: 'destructive',
      });
      return;
    }
    setIsProcessing(true);

    let allUsers: UserData[] = [];
    for (const content of Object.values(ripsFileContents)) {
      const blocks = parseRIPS(content);
      if (blocks['US']) {
        const parsedUsers = blocks['US'].map(parseUser).filter((u): u is UserData => u !== null);
        allUsers.push(...parsedUsers);
      }
    }
    
    // Remove duplicates by numDoc
    const uniqueUsers = Array.from(new Map(allUsers.map(user => [user.numDoc, user])).values());

    setUsers(uniqueUsers);
    toast({
      title: 'Análisis de usuarios completado',
      description: `Se encontraron ${uniqueUsers.length} usuarios únicos en los archivos US.`,
    });
    setIsProcessing(false);
  };
  
  const filteredUsers = useMemo(() => {
    if (!filter) return users;
    const lowercasedFilter = filter.toLowerCase();
    return users.filter(user => 
        user.nombreCompleto.toLowerCase().includes(lowercasedFilter) ||
        user.numDoc.includes(lowercasedFilter)
    );
  }, [users, filter]);

  return (
    <Card className="shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users /> Análisis de Usuarios (US)
        </CardTitle>
        <CardDescription>
          Procese los archivos de usuarios y visualice la información detallada, incluyendo la edad calculada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center py-4">
          <Button onClick={handleProcessUsers} disabled={isProcessing} size="lg">
            <Search className="mr-2" />
            Procesar Archivos de Usuarios
          </Button>
        </div>

        {users.length > 0 && (
          <div className="space-y-4">
            <div className='flex items-center gap-4'>
                <p className='text-sm font-medium'>Filtrar por nombre o documento:</p>
                <Input 
                    placeholder="Buscar..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
            </div>
            <ScrollArea className="whitespace-nowrap rounded-md border">
              <div className="max-h-96">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead>Tipo Doc</TableHead>
                      <TableHead>Número Documento</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>Edad</TableHead>
                      <TableHead>Sexo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Municipio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, index) => (
                      <TableRow key={`${user.numDoc}-${index}`}>
                        <TableCell>{user.tipoDoc}</TableCell>
                        <TableCell className="font-medium">{user.numDoc}</TableCell>
                        <TableCell>{user.nombreCompleto}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{user.edadFormateada}</TableCell>
                        <TableCell className="text-center">{user.sexo}</TableCell>
                        <TableCell>{user.departamento}</TableCell>
                        <TableCell>{user.municipio}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}
        {users.length === 0 && !isProcessing && (
            <div className="text-center text-muted-foreground p-8 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <p>Presione el botón "Procesar" para cargar los datos de los usuarios.</p>
              <p className="text-xs">(Asegúrese de haber cargado archivos RIPS que contengan el segmento 'US').</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}