import React, { useState, useEffect } from 'react';
import { casosAPI, motivosAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Search, FileText, Eye } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

const Casos = () => {
  const [casos, setCasos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Filtros
  const [numeroCaso, setNumeroCaso] = useState('');
  const [estado, setEstado] = useState('');
  const [prioridad, setPrioridad] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [casosRes, motivosRes] = await Promise.all([
        casosAPI.getAll(),
        motivosAPI.getAll({ activo: true })
      ]);
      setCasos(casosRes.data);
      setMotivos(motivosRes.data);
    } catch (error) {
      toast.error('Error al cargar casos');
    } finally {
      setLoading(false);
    }
  };

  const buscarCasos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (numeroCaso) params.numero_caso = numeroCaso;
      if (estado) params.estado = estado;
      if (prioridad) params.prioridad = prioridad;
      
      const response = await casosAPI.getAll(params);
      setCasos(response.data);
    } catch (error) {
      toast.error('Error al buscar casos');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setNumeroCaso('');
    setEstado('');
    setPrioridad('');
    loadData();
  };

  return (
    <div className="space-y-6" data-testid="casos-page">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(141, 81%, 31%)' }}>
          Gestión de Casos
        </h1>
        <p className="text-muted-foreground">Listado y gestión de todos los casos PQR</p>
      </div>

      {/* Filtros */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Número de caso"
              value={numeroCaso}
              onChange={(e) => setNumeroCaso(e.target.value)}
              data-testid="filter-numero-caso"
            />
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger data-testid="filter-estado">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABIERTO">Abierto</SelectItem>
                <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                <SelectItem value="CERRADO">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={prioridad} onValueChange={setPrioridad}>
              <SelectTrigger data-testid="filter-prioridad">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="MEDIA">Media</SelectItem>
                <SelectItem value="BAJA">Baja</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={buscarCasos} className="flex-1" data-testid="btn-buscar">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button onClick={limpiarFiltros} variant="outline" data-testid="btn-limpiar-filtros">
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de casos */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Casos ({casos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número Caso</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No se encontraron casos
                    </TableCell>
                  </TableRow>
                ) : (
                  casos.map((caso) => (
                    <TableRow key={caso.id}>
                      <TableCell className="font-medium">{caso.numero_caso}</TableCell>
                      <TableCell>{formatDate(caso.fecha_creacion)}</TableCell>
                      <TableCell>
                        <span className={`priority-badge-${caso.prioridad}`}>
                          {caso.prioridad}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`estado-badge-${caso.estado}`}>
                          {caso.estado.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/casos/${caso.id}`)}
                          data-testid={`btn-ver-caso-${caso.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Casos;
