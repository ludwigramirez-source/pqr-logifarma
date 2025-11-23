import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { casosAPI, usuariosAPI, interaccionesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Save, Phone, Clock, User, FileText, AlertCircle, History } from 'lucide-react';
import { formatDate } from '../lib/utils';

const DetalleCaso = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [caso, setCaso] = useState(null);
  const [agentes, setAgentes] = useState([]);
  const [editando, setEditando] = useState(false);
  const [cambiosEditados, setCambiosEditados] = useState({});
  const [comentario, setComentario] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    try {
      const [casoRes, agentesRes] = await Promise.all([
        casosAPI.getById(id),
        usuariosAPI.getAll()
      ]);
      setCaso(casoRes.data);
      setAgentes(agentesRes.data);
    } catch (error) {
      toast.error('Error al cargar el caso');
    } finally {
      setLoading(false);
    }
  };

  const handleEditarCaso = () => {
    setCambiosEditados({
      estado: caso.estado,
      prioridad: caso.prioridad,
      agente_asignado_id: caso.agente_asignado_id
    });
    setComentario('');
    setShowEditDialog(true);
  };

  const guardarCambios = async () => {
    try {
      const updateData = { ...cambiosEditados };
      if (comentario) {
        updateData.comentario = comentario;
      }
      await casosAPI.update(id, updateData);
      toast.success('Caso actualizado exitosamente');
      setShowEditDialog(false);
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar caso');
    }
  };

  const calcularTiempoTranscurrido = (fechaCreacion) => {
    const ahora = new Date();
    const inicio = new Date(fechaCreacion);
    const diffMs = ahora - inicio;
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);
    
    if (diffDias > 0) {
      return `${diffDias} día${diffDias > 1 ? 's' : ''} ${diffHoras % 24} hora${diffHoras % 24 !== 1 ? 's' : ''}`;
    }
    return `${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Caso no encontrado</p>
        <Button onClick={() => navigate('/casos')} className="mt-4">
          Volver a Casos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="detalle-caso-page">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/casos')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Casos
          </Button>
          <h1 className="page-title text-3xl font-bold" style={{ color: 'hsl(141, 81%, 31%)' }}>
            Caso {caso.numero_caso}
          </h1>
          <p className="text-muted-foreground">Detalles completos del caso</p>
        </div>
        <div className="flex gap-2">
          <span className={`priority-badge-${caso.prioridad} text-lg px-4 py-2`}>
            Prioridad {caso.prioridad}
          </span>
          <span className={`estado-badge-${caso.estado} text-lg px-4 py-2`}>
            {caso.estado.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Información del Paciente */}
      <Card className="border-2">
        <CardHeader className="bg-muted">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre Completo</p>
              <p className="font-semibold">
                {caso.paciente.nombre} {caso.paciente.apellidos}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Identificación</p>
              <p className="font-semibold">{caso.paciente.identificacion}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Celular</p>
              <p className="font-semibold">{caso.paciente.celular}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ciudad</p>
              <p className="font-semibold">
                {caso.paciente.ciudad}, {caso.paciente.departamento}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Dirección</p>
              <p className="font-semibold">{caso.paciente.direccion}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del Caso */}
      <Card className="border-2">
        <CardHeader className="bg-muted flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalles del Caso
          </CardTitle>
          <Button onClick={handleEditarCaso} size="sm" data-testid="btn-editar-caso">
            <Edit className="h-4 w-4 mr-2" />
            Editar Caso
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Motivo</p>
              <p className="font-semibold text-lg">{caso.motivo_obj.nombre}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Creación</p>
              <p className="font-semibold">{formatDate(caso.fecha_creacion)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creado por</p>
              <p className="font-semibold">{caso.agente_creador.nombre_completo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Asignado a</p>
              <p className="font-semibold">
                {caso.agente_asignado ? caso.agente_asignado.nombre_completo : 'Sin asignar'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tiempo Transcurrido</p>
              <p className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {calcularTiempoTranscurrido(caso.fecha_creacion)}
              </p>
            </div>
            {caso.fecha_cierre && (
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Cierre</p>
                <p className="font-semibold">{formatDate(caso.fecha_cierre)}</p>
              </div>
            )}
            {caso.tiempo_resolucion_horas && (
              <div>
                <p className="text-sm text-muted-foreground">Tiempo de Resolución</p>
                <p className="font-semibold">{caso.tiempo_resolucion_horas.toFixed(2)} horas</p>
              </div>
            )}
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground mb-2">Descripción</p>
              <div className="p-4 bg-muted rounded-lg">
                <p className="whitespace-pre-wrap">{caso.descripcion}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interacciones/Llamadas */}
      <Card className="border-2">
        <CardHeader className="bg-muted">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Interacciones ({caso.interacciones?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {!caso.interacciones || caso.interacciones.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay interacciones registradas</p>
          ) : (
            <div className="space-y-4">
              {caso.interacciones.map((interaccion, index) => (
                <div key={interaccion.id} className="p-4 border-2 rounded-lg bg-white">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">
                        {interaccion.agent_name || 'Agente desconocido'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(interaccion.fecha_registro)}
                      </p>
                    </div>
                    {interaccion.telefono_contacto && (
                      <Badge variant="outline">
                        <Phone className="h-3 w-3 mr-1" />
                        {interaccion.telefono_contacto}
                      </Badge>
                    )}
                  </div>
                  {interaccion.observaciones && (
                    <p className="text-sm mt-2 p-3 bg-muted rounded">
                      {interaccion.observaciones}
                    </p>
                  )}
                  {interaccion.rec_filename && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Grabación: {interaccion.rec_filename}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Estados */}
      <Card className="border-2">
        <CardHeader className="bg-muted">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Estados
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {!caso.historial_estados || caso.historial_estados.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay cambios de estado</p>
          ) : (
            <div className="space-y-3">
              {caso.historial_estados.map((historial) => (
                <div key={historial.id} className="flex items-start gap-4 p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {historial.estado_anterior && (
                        <span className={`estado-badge-${historial.estado_anterior} text-xs`}>
                          {historial.estado_anterior}
                        </span>
                      )}
                      <span className="text-muted-foreground">→</span>
                      <span className={`estado-badge-${historial.estado_nuevo} text-xs`}>
                        {historial.estado_nuevo}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(historial.fecha_cambio)}
                    </p>
                    {historial.comentario && (
                      <p className="text-sm mt-2 p-2 bg-muted rounded italic">
                        "{historial.comentario}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Editar Caso */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Caso {caso.numero_caso}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estado</Label>
                <Select 
                  value={cambiosEditados.estado} 
                  onValueChange={(value) => setCambiosEditados({ ...cambiosEditados, estado: value })}
                >
                  <SelectTrigger data-testid="edit-select-estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABIERTO">Abierto</SelectItem>
                    <SelectItem value="EN_PROCESO">En Proceso</SelectItem>
                    <SelectItem value="CERRADO">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select 
                  value={cambiosEditados.prioridad} 
                  onValueChange={(value) => setCambiosEditados({ ...cambiosEditados, prioridad: value })}
                >
                  <SelectTrigger data-testid="edit-select-prioridad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="MEDIA">Media</SelectItem>
                    <SelectItem value="BAJA">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Asignar a Agente</Label>
              <Select 
                value={cambiosEditados.agente_asignado_id?.toString() || 'sin-asignar'} 
                onValueChange={(value) => setCambiosEditados({ ...cambiosEditados, agente_asignado_id: value === 'sin-asignar' ? null : parseInt(value) })}
              >
                <SelectTrigger data-testid="edit-select-agente">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin-asignar">Sin asignar</SelectItem>
                  {agentes.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.nombre_completo} ({a.rol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Comentario (opcional)</Label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Agregue un comentario sobre los cambios..."
                rows={3}
                data-testid="edit-textarea-comentario"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarCambios} data-testid="btn-guardar-cambios">
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DetalleCaso;
