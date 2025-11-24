import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { casosAPI, usuariosAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  ArrowLeft, Edit, Save, Phone, Clock, User, FileText,
  AlertCircle, History, MapPin, Mail, IdCard, Building2,
  PhoneCall, Mic, Calendar, UserCheck, ArrowRightLeft,
  FileEdit, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { formatDate } from '../lib/utils';

const DetalleCaso = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [caso, setCaso] = useState(null);
  const [agentes, setAgentes] = useState([]);
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

  const formatearFechaHora = (fechaISO) => {
    if (!fechaISO) return '';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Función para obtener icono según tipo de evento
  const getEventIcon = (tipoEvento) => {
    switch(tipoEvento) {
      case 'creacion':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cambio_estado':
        return <ArrowRightLeft className="h-5 w-5 text-blue-600" />;
      case 'cambio_prioridad':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'asignacion':
        return <UserCheck className="h-5 w-5 text-purple-600" />;
      case 'interaccion':
        return <PhoneCall className="h-5 w-5 text-cyan-600" />;
      case 'edicion_descripcion':
        return <FileEdit className="h-5 w-5 text-gray-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  // Función para obtener mensaje legible del evento
  const getEventoMensaje = (evento) => {
    const usuario = evento.usuario?.nombre_completo || 'Sistema';

    switch(evento.tipo_evento) {
      case 'creacion':
        return `${usuario} creó el caso`;
      case 'cambio_estado':
        return `${usuario} cambió el estado de ${evento.valor_anterior} a ${evento.valor_nuevo}`;
      case 'cambio_prioridad':
        return `${usuario} cambió la prioridad de ${evento.valor_anterior} a ${evento.valor_nuevo}`;
      case 'asignacion':
        return `${usuario} ${evento.valor_anterior === 'Sin asignar' ? 'asignó' : 'reasignó'} el caso de ${evento.valor_anterior} a ${evento.valor_nuevo}`;
      case 'interaccion':
        return `Llamada registrada - ${evento.valor_nuevo}`;
      case 'edicion_descripcion':
        return `${usuario} editó la descripción del caso`;
      default:
        return `${usuario} realizó una acción`;
    }
  };

  // Crear timeline unificado mezclando eventos e interacciones
  const crearTimelineUnificado = () => {
    if (!caso) return [];

    const timeline = [];

    // Agregar eventos del historial nuevo
    if (caso.historial_eventos_new) {
      caso.historial_eventos_new.forEach(evento => {
        timeline.push({
          tipo: 'evento',
          fecha: new Date(evento.fecha_evento),
          data: evento
        });
      });
    }

    // Agregar interacciones
    if (caso.interacciones) {
      caso.interacciones.forEach(interaccion => {
        timeline.push({
          tipo: 'interaccion',
          fecha: new Date(interaccion.fecha_registro),
          data: interaccion
        });
      });
    }

    // Ordenar por fecha descendente (más reciente primero)
    return timeline.sort((a, b) => b.fecha - a.fecha);
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

  const timeline = crearTimelineUnificado();

  return (
    <div className="space-y-6" data-testid="detalle-caso-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => navigate('/casos')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Casos
          </Button>
          <h1 className="page-title text-3xl font-bold" style={{ color: 'hsl(141, 81%, 31%)' }}>
            Caso {caso.numero_caso}
          </h1>
          <p className="text-muted-foreground">Detalles completos y timeline del caso</p>
        </div>
        <div className="flex gap-2 items-center">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            caso.origen === 'call'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-purple-100 text-purple-800'
          }`}>
            {caso.origen === 'call' ? 'Call Center' : 'Web'}
          </span>
          <span className={`priority-badge-${caso.prioridad} text-lg px-4 py-2`}>
            Prioridad {caso.prioridad}
          </span>
          <span className={`estado-badge-${caso.estado} text-lg px-4 py-2`}>
            {caso.estado.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Info del caso y paciente */}
        <div className="lg:col-span-1 space-y-6">
          {/* Información del Paciente */}
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <IdCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Identificación</p>
                  <p className="font-semibold">{caso.paciente.identificacion}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Nombre Completo</p>
                  <p className="font-semibold">
                    {caso.paciente.nombre} {caso.paciente.apellidos}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Celular</p>
                  <p className="font-semibold">{caso.paciente.celular}</p>
                </div>
              </div>
              {caso.paciente.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{caso.paciente.email}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Ubicación</p>
                  <p className="font-semibold">
                    {caso.paciente.ciudad}, {caso.paciente.departamento}
                  </p>
                  <p className="text-sm mt-1">{caso.paciente.direccion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalles del Caso */}
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalles del Caso
              </CardTitle>
              <Button onClick={handleEditarCaso} size="sm" data-testid="btn-editar-caso">
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Motivo</p>
                <p className="font-semibold text-lg">{caso.motivo_obj.nombre}</p>
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
                <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                <p className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatearFechaHora(caso.fecha_creacion)}
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
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Cierre</p>
                    <p className="font-semibold">{formatearFechaHora(caso.fecha_cierre)}</p>
                  </div>
                  {caso.tiempo_resolucion_horas && (
                    <div>
                      <p className="text-sm text-muted-foreground">Tiempo de Resolución</p>
                      <p className="font-semibold">{caso.tiempo_resolucion_horas.toFixed(2)} horas</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Descripción</p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{caso.descripcion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de OmniLeads (si existe) */}
          {caso.origen === 'call' && caso.interacciones && caso.interacciones.length > 0 && (
            <Card className="border-2 border-cyan-200">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50">
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-cyan-600" />
                  Detalles de Llamada OmniLeads
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                {(() => {
                  const primeraInteraccion = caso.interacciones[0];
                  return (
                    <>
                      {primeraInteraccion.omnileads_campaign_name && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Campaña</p>
                            <p className="font-semibold text-sm">{primeraInteraccion.omnileads_campaign_name}</p>
                          </div>
                        </div>
                      )}
                      {primeraInteraccion.agent_name && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Agente OmniLeads</p>
                            <p className="font-semibold text-sm">{primeraInteraccion.agent_name}</p>
                            {primeraInteraccion.agent_username && (
                              <p className="text-xs text-muted-foreground">@{primeraInteraccion.agent_username}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {primeraInteraccion.telefono_contacto && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Teléfono Contacto</p>
                            <p className="font-semibold text-sm">{primeraInteraccion.telefono_contacto}</p>
                          </div>
                        </div>
                      )}
                      {primeraInteraccion.datetime_llamada && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Fecha Llamada</p>
                            <p className="font-semibold text-sm">{formatearFechaHora(primeraInteraccion.datetime_llamada)}</p>
                          </div>
                        </div>
                      )}
                      {primeraInteraccion.rec_filename && (
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Grabación</p>
                            <p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {primeraInteraccion.rec_filename}
                            </p>
                          </div>
                        </div>
                      )}
                      {primeraInteraccion.omnileads_call_id && (
                        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                          <p>Call ID: {primeraInteraccion.omnileads_call_id}</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Columna derecha: Timeline unificado */}
        <div className="lg:col-span-2">
          <Card className="border-2">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Timeline de Actividad ({timeline.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {timeline.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay actividad registrada</p>
              ) : (
                <div className="space-y-4">
                  {timeline.map((item, index) => (
                    <div key={index} className="flex gap-4 relative">
                      {/* Línea vertical conectora */}
                      {index < timeline.length - 1 && (
                        <div className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-gray-200" />
                      )}

                      {/* Icono del evento */}
                      <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                        {item.tipo === 'evento' ? (
                          getEventIcon(item.data.tipo_evento)
                        ) : (
                          <PhoneCall className="h-5 w-5 text-cyan-600" />
                        )}
                      </div>

                      {/* Contenido del evento */}
                      <div className="flex-1 pb-6">
                        <div className="bg-white border-2 rounded-lg p-4 hover:shadow-md transition-shadow">
                          {item.tipo === 'evento' ? (
                            <>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm">
                                    {getEventoMensaje(item.data)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatearFechaHora(item.data.fecha_evento)}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {item.data.tipo_evento.replace('_', ' ')}
                                </Badge>
                              </div>
                              {item.data.comentario && (
                                <div className="mt-3 p-3 bg-gray-50 rounded border-l-4 border-gray-300">
                                  <p className="text-sm italic">"{item.data.comentario}"</p>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-sm flex items-center gap-2">
                                    <PhoneCall className="h-4 w-4" />
                                    Interacción - {item.data.agent_name || 'Agente'}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatearFechaHora(item.data.fecha_registro)}
                                  </p>
                                </div>
                                {item.data.telefono_contacto && (
                                  <Badge variant="outline" className="text-xs">
                                    <Phone className="h-3 w-3 mr-1" />
                                    {item.data.telefono_contacto}
                                  </Badge>
                                )}
                              </div>
                              {item.data.observaciones && (
                                <div className="mt-3 p-3 bg-cyan-50 rounded border-l-4 border-cyan-300">
                                  <p className="text-sm">{item.data.observaciones}</p>
                                </div>
                              )}
                              {item.data.omnileads_campaign_name && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Campaña: {item.data.omnileads_campaign_name}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
