'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Search, AlertCircle, TrendingUp, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { parseRIPS } from '@/lib/rips-parser';
import { Input } from '../ui/input';
import type { UserData, CupsDataRow, UserActivity, ActivityRanking, UserRanking } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';

interface UserAnalysisProps {
  ripsFileContents: Record<string, string>;
  cupsData: CupsDataRow[];
}

const getGrupoEtario = (edad: number, unidadMedida: string): string => {
    if (isNaN(edad) || !unidadMedida) return 'NO ESPECIFICADO';
    if (unidadMedida === '1') { // Años
        if (edad < 6) return 'PRE INFANCIA';
        if (edad < 12) return 'INFANCIA';
        if (edad < 18) return 'ADOLECENCIA';
        if (edad < 29) return 'JUVENTUD';
        if (edad < 60) return 'ADULTEZ';
        return 'VEJEZ';
    } else { // Meses (2) o Días (3)
        return 'PRE INFANCIA';
    }
};

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
    nombreCompleto: `${cols[6]} ${cols[7]} ${cols[4]} ${cols[5]}`.trim().replace(/\s+/g, ' '),
    grupoEtario: getGrupoEtario(edad, unidadMedida),
    activities: [], // Initialize activities
  };
};

export default function UserAnalysis({ ripsFileContents, cupsData }: UserAnalysisProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [activityRanking, setActivityRanking] = useState<ActivityRanking[]>([]);
  const [userRanking, setUserRanking] = useState<UserRanking[]>([]);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();

  const handleProcessUsers = () => {
    if (Object.keys(ripsFileContents).length === 0) {
      toast({ title: 'No hay archivos RIPS cargados', variant: 'destructive' });
      return;
    }
    if (cupsData.length === 0) {
        toast({ title: 'No hay mapeo CUPS', description: 'Cargue un archivo de mapeo en "Reportes Detallados".', variant: 'destructive' });
        return;
    }
    setIsProcessing(true);

    const allRipsBlocks: Record<string, string[]> = {};
    for (const content of Object.values(ripsFileContents)) {
        const blocks = parseRIPS(content);
        for (const segment in blocks) {
            if (!allRipsBlocks[segment]) allRipsBlocks[segment] = [];
            allRipsBlocks[segment].push(...blocks[segment]);
        }
    }
    
    const usersMap = new Map<string, UserData>();
    if (allRipsBlocks['US']) {
        allRipsBlocks['US'].forEach(line => {
            const user = parseUser(line);
            if(user && !usersMap.has(user.numDoc)) {
                usersMap.set(user.numDoc, user);
            }
        });
    }

    const activityCounts: Record<string, number> = {};
    const userActivityCounts = new Map<string, number>();
    
    const cupsMap = new Map<string, string>();
    cupsData.forEach(c => {
        if (c.CUPS) cupsMap.set(c.CUPS.toString(), c['NOMBRE CUPS']);
        if (c['CUPS VIGENTE']) cupsMap.set(c['CUPS VIGENTE'].toString(), c['NOMBRE CUPS']);
    });

    const activitySegments = { 'AC': {user: 2, code: 6}, 'AP': {user: 3, code: 7}, 'AU': {user: 2, code: 6}, 'AH': {user: 2, code: 8}, 'AN': {user: 2, code: 6}, 'AT': {user: 2, code: 6} };

    for (const seg in activitySegments) {
        if(allRipsBlocks[seg]) {
            const { user: userPos, code: codePos } = activitySegments[seg as keyof typeof activitySegments];
            allRipsBlocks[seg].forEach(line => {
                const cols = line.split(',');
                if (cols.length <= Math.max(userPos, codePos)) return;
                
                const userId = cols[userPos];
                const cupsCode = cols[codePos];

                if(userId && cupsCode) {
                    const user = usersMap.get(userId);
                    if(user) {
                        const activity: UserActivity = { segment: seg, cups: cupsCode, description: cupsMap.get(cupsCode) || 'Descripción no encontrada' };
                        user.activities.push(activity);
                        
                        userActivityCounts.set(userId, (userActivityCounts.get(userId) || 0) + 1);
                    }
                    activityCounts[cupsCode] = (activityCounts[cupsCode] || 0) + 1;
                }
            });
        }
    }

    const finalUsers = Array.from(usersMap.values());
    setUsers(finalUsers);

    const rankedActivities = Object.entries(activityCounts).map(([cups, count]) => ({
        cups,
        description: cupsMap.get(cups) || 'Descripción no encontrada',
        count
    })).sort((a,b) => b.count - a.count);
    setActivityRanking(rankedActivities);

    const rankedUsers: UserRanking[] = Array.from(userActivityCounts.entries())
      .map(([userId, count]) => {
        const user = usersMap.get(userId);
        return user ? { user, count } : null;
      })
      .filter((item): item is UserRanking => item !== null)
      .sort((a, b) => b.count - a.count);
    setUserRanking(rankedUsers);

    toast({
      title: 'Análisis de usuarios y rankings completado',
      description: `Se encontraron ${finalUsers.length} usuarios únicos y se generaron los rankings.`,
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
          <Users /> Estadísticas de Uso y Rankings
        </CardTitle>
        <CardDescription>
          Procese los archivos para ver un análisis detallado del uso por paciente y los rankings de actividades y usuarios más frecuentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center py-4">
          <Button onClick={handleProcessUsers} disabled={isProcessing} size="lg">
            <Search className="mr-2" />
            Generar Estadísticas
          </Button>
        </div>

        {(userRanking.length > 0 || activityRanking.length > 0) && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
             <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><TrendingUp /> Ranking de Actividades</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>CUPS</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead className='text-right'>Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {activityRanking.map(item => (
                                    <TableRow key={item.cups}>
                                        <TableCell className='font-mono'>{item.cups}</TableCell>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className='text-right font-bold'>{item.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
             </Card>
             <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><Award /> Ranking de Usuarios</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Documento</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className='text-right'>Nº Actividades</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {userRanking.map(item => (
                                    <TableRow key={item.user.numDoc}>
                                        <TableCell>{item.user.numDoc}</TableCell>
                                        <TableCell>{item.user.nombreCompleto}</TableCell>
                                        <TableCell className='text-right font-bold'>{item.count}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
             </Card>
          </div>
        )}

        {users.length > 0 && (
          <div className="space-y-4 pt-8">
            <CardHeader className='p-0 mb-4'>
                <CardTitle>Detalle de Actividades por Usuario</CardTitle>
            </CardHeader>
            <div className='flex items-center gap-4'>
                <p className='text-sm font-medium'>Filtrar por nombre o documento:</p>
                <Input 
                    placeholder="Buscar..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="max-w-sm"
                />
            </div>
            <ScrollArea className="whitespace-nowrap rounded-md border h-[500px]">
                 <Accordion type="single" collapsible className="w-full">
                    {filteredUsers.map(user => (
                        <AccordionItem value={user.numDoc} key={user.numDoc}>
                            <AccordionTrigger className='px-4 hover:no-underline hover:bg-muted/50'>
                                <div className='flex justify-between w-full items-center'>
                                   <div className='text-left'>
                                     <p className='font-semibold'>{user.nombreCompleto}</p>
                                     <p className='text-sm text-muted-foreground'>{user.tipoDoc} {user.numDoc}</p>
                                   </div>
                                   <div className='flex gap-4 items-center mr-8'>
                                     <Badge variant='outline'>{user.grupoEtario}</Badge>
                                     <Badge variant='secondary'>{user.activities.length} actividade(s)</Badge>
                                   </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className='p-4 bg-secondary/30'>
                               {user.activities.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Segmento</TableHead>
                                            <TableHead>CUPS</TableHead>
                                            <TableHead>Descripción</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {user.activities.map((act, index) => (
                                            <TableRow key={index}>
                                                <TableCell><Badge>{act.segment}</Badge></TableCell>
                                                <TableCell className='font-mono'>{act.cups}</TableCell>
                                                <TableCell>{act.description}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                               ) : (
                                <p className='text-sm text-muted-foreground text-center py-4'>Este usuario no tiene actividades registradas en los archivos.</p>
                               )}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                 </Accordion>
            </ScrollArea>
          </div>
        )}
        {users.length === 0 && !isProcessing && (
            <div className="text-center text-muted-foreground p-8 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <p>Presione el botón "Generar Estadísticas" para procesar los datos.</p>
              <p className="text-xs">(Asegúrese de haber cargado archivos RIPS y un archivo de mapeo CUPS).</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
