import React, { useState, useEffect } from 'react';
import { pacientesAPI, casosAPI, motivosAPI, ubicacionesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Search, Save, FileText, History, X, Plus } from 'lucide-react';
import { formatDateShort } from '../lib/utils';

const EmbeddedView = () => {
  const [activeTab, setActiveTab] = useState('gestion');
  const [motivos, setMotivos] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  
  // Datos del paciente
  const [identificacion, setIdentificacion] = useState('');
  const [paciente, setPaciente] = useState(null);
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [celular, setCelular] = useState('');
  const [direccion, setDireccion] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [ciudad, setCiudad] = useState('');
  
  // Datos del caso
  const [numeroCasoBuscar, setNumeroCasoBuscar] = useState('');
  const [casoExistente, setCasoExistente] = useState(null);
  const [motivoId, setMotivoId] = useState('');
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [estado, setEstado] = useState('ABIERTO');
  const [descripcion, setDescripcion] = useState('');
  
  // Historial
  const [casosPaciente, setCasosPaciente] = useState([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMotivos();
    loadDepartamentos();
  }, []);

  useEffect(() => {
    if (departamento) {
      const dept = departamentos.find(d => d.nombre === departamento);
      if (dept) {
        loadCiudades(dept.id);
      }
    }
  }, [departamento]);

  const loadMotivos = async () => {
    try {
      const response = await motivosAPI.getAll({ activo: true });
      setMotivos(response.data);
    } catch (error) {
      toast.error('Error al cargar motivos');
    }
  };

  const loadDepartamentos = async () => {
    try {
      const response = await ubicacionesAPI.getDepartamentos();
      setDepartamentos(response.data);
    } catch (error) {
      toast.error('Error al cargar departamentos');
    }
  };

  const loadCiudades = async (departamentoId) => {
    try {
      const response = await ubicacionesAPI.getCiudades(departamentoId);
      setCiudades(response.data);
    } catch (error) {
      toast.error('Error al cargar ciudades');
    }
  };

  const buscarPaciente = async () => {
    if (!identificacion) {
      toast.error('Ingrese una cédula');
      return;
    }

    try {
      const response = await pacientesAPI.getAll({ identificacion });
      if (response.data.length > 0) {
        const p = response.data[0];
        setPaciente(p);
        setNombre(p.nombre);
        setApellidos(p.apellidos);
        setCelular(p.celular);
        setDireccion(p.direccion);
        setDepartamento(p.departamento);
        setCiudad(p.ciudad);
        
        // Buscar casos abiertos o en proceso del paciente
        const casosResponse = await casosAPI.getAll({ 
          paciente_identificacion: identificacion,
          limit: 100 
        });
        
        // Filtrar solo casos ABIERTOS o EN_PROCESO
        const casosPendientes = casosResponse.data.filter(
          c => c.estado === 'ABIERTO' || c.estado === 'EN_PROCESO'
        );
        
        if (casosPendientes.length > 0) {
          setCasosPaciente(casosPendientes);
          toast.success(`Paciente encontrado con ${casosPendientes.length} caso(s) pendiente(s)`);
        } else {
          setCasosPaciente([]);
          toast.success('Paciente encontrado sin casos pendientes');
        }
      } else {
        setPaciente(null);
        setCasosPaciente([]);
        setNombre('');
        setApellidos('');
        setCelular('');
        setDireccion('');
        setDepartamento('');
        setCiudad('');
        toast.info('Paciente no encontrado. Complete los datos para crear uno nuevo');
      }
    } catch (error) {
      toast.error('Error al buscar paciente');
    }
  };

  const buscarCaso = async () => {
    if (!numeroCasoBuscar) {
      toast.error('Ingrese un número de caso');
      return;
    }

    try {
      const response = await casosAPI.getAll({ numero_caso: numeroCasoBuscar });
      if (response.data.length > 0) {
        const caso = response.data[0];
        setCasoExistente(caso);
        setEstado(caso.estado);
        setPrioridad(caso.prioridad);
        setMotivoId(caso.motivo_id.toString());
        setDescripcion(caso.descripcion);
        toast.success('Caso encontrado');
      } else {
        toast.error('Caso no encontrado');
        setCasoExistente(null);
      }
    } catch (error) {
      toast.error('Error al buscar caso');
    }
  };

  const seleccionarCasoPendiente = (caso) => {
    setCasoExistente(caso);
    setNumeroCasoBuscar(caso.numero_caso);
    setEstado(caso.estado);
    setPrioridad(caso.prioridad);
    setMotivoId(caso.motivo_id.toString());
    setDescripcion(caso.descripcion);
    toast.success(`Caso ${caso.numero_caso} seleccionado para seguimiento`);
    
    // Scroll al formulario del caso
    setTimeout(() => {
      const casoSection = document.getElementById('caso-section');
      if (casoSection) {
        casoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const crearNuevoCaso = () => {
    setCasoExistente(null);
    setNumeroCasoBuscar('');
    setEstado('ABIERTO');
    setPrioridad('MEDIA');
    setMotivoId('');
    setDescripcion('');
    toast.info('Formulario preparado para crear un nuevo caso');
    
    // Scroll al formulario del caso
    setTimeout(() => {
      const casoSection = document.getElementById('caso-section');
      if (casoSection) {
        casoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const verHistorial = async () => {
    if (!paciente) {
      toast.error('Primero busque un paciente');
      return;
    }

    try {
      const response = await pacientesAPI.getCasos(paciente.id);
      setCasosPaciente(response.data);
      setActiveTab('historial');
    } catch (error) {
      toast.error('Error al cargar historial');
    }
  };

  const guardarCaso = async () => {
    if (!identificacion || !nombre || !apellidos || !celular || !direccion || !departamento || !ciudad) {
      toast.error('Complete todos los datos del paciente');
      return;
    }

    if (!motivoId || !descripcion) {
      toast.error('Complete los datos del caso');
      return;
    }

    setLoading(true);

    try {
      const casoData = {
        paciente: {
          identificacion,
          nombre,
          apellidos,
          celular,
          direccion,
          departamento,
          ciudad,
        },
        motivo_id: parseInt(motivoId),
        prioridad,
        estado,
        descripcion,
        numero_caso_existente: casoExistente?.numero_caso,
        omnileads: {
          call_id: 'SIM-' + Date.now(),
          campaign_id: 'embedded',
          campaign_name: 'Vista Embebida',
          campaign_type: 'manual',
          agent_id: '1',
          agent_username: 'embedded',
          agent_name: 'Usuario Embebido',
          telefono: celular,
          datetime: new Date().toISOString(),
          rec_filename: null,
        },
      };

      await casosAPI.createEmbedded(casoData);
      toast.success(casoExistente ? 'Caso actualizado exitosamente' : 'Caso creado exitosamente');
      limpiarFormulario();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar caso');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setIdentificacion('');
    setPaciente(null);
    setNombre('');
    setApellidos('');
    setCelular('');
    setDireccion('');
    setDepartamento('');
    setCiudad('');
    setNumeroCasoBuscar('');
    setCasoExistente(null);
    setMotivoId('');
    setPrioridad('MEDIA');
    setEstado('ABIERTO');
    setDescripcion('');
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-gray-50 to-gray-100" data-testid="embedded-view">
      <Card className="max-w-4xl mx-auto shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <img src="/assets/logo.png" alt="LOGIFARMA" className="h-10 w-auto bg-white px-2 py-1 rounded" />
            <CardTitle className="text-2xl font-bold">Sistema PQR - Vista Embebida</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="gestion" data-testid="tab-gestion">
                <FileText className="h-4 w-4 mr-2" />
                Gestión PQR
              </TabsTrigger>
              <TabsTrigger value="historial" data-testid="tab-historial">
                <History className="h-4 w-4 mr-2" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gestion" className="space-y-6">
              {/* Búsqueda de Paciente */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar Paciente por Cédula
                </h3>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Ingrese cédula del paciente"
                      value={identificacion}
                      onChange={(e) => setIdentificacion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && buscarPaciente()}
                      data-testid="input-cedula"
                    />
                  </div>
                  <Button onClick={buscarPaciente} data-testid="btn-buscar-paciente">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
                {paciente && (
                  <>
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-green-900">
                            Paciente Encontrado: {paciente.nombre} {paciente.apellidos}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            CC: {paciente.identificacion} | Celular: {paciente.celular}
                          </p>
                        </div>
                        <Button onClick={verHistorial} variant="outline" size="sm" data-testid="btn-ver-historial">
                          <History className="h-4 w-4 mr-2" />
                          Ver Historial Completo
                        </Button>
                      </div>
                    </div>

                    {/* Casos Pendientes del Paciente */}
                    {casosPaciente.length > 0 && (
                      <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-lg text-orange-900">
                              ⚠️ Casos Pendientes de Resolución
                            </h4>
                            <p className="text-sm text-orange-700">
                              Este paciente tiene {casosPaciente.length} caso(s) abierto(s) o en proceso
                            </p>
                          </div>
                          <Button 
                            onClick={crearNuevoCaso}
                            variant="outline"
                            size="sm"
                            className="border-orange-400 text-orange-700 hover:bg-orange-100"
                            data-testid="btn-crear-caso-nuevo-directo"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Crear Caso Nuevo
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          {casosPaciente.map((caso) => (
                            <div
                              key={caso.id}
                              className="p-3 bg-white border-2 rounded-lg hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-bold text-base">{caso.numero_caso}</p>
                                    <span className={`estado-badge-${caso.estado} text-xs`}>
                                      {caso.estado.replace('_', ' ')}
                                    </span>
                                    <span className={`priority-badge-${caso.prioridad} text-xs`}>
                                      {caso.prioridad}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    📅 Creado: {formatDateShort(caso.fecha_creacion)}
                                  </p>
                                </div>
                                <Button
                                  onClick={() => seleccionarCasoPendiente(caso)}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  data-testid={`btn-seleccionar-caso-${caso.id}`}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Dar Seguimiento
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-900">
                            <strong>💡 Tip:</strong> Si la llamada es sobre uno de estos casos, haz clic en "Dar Seguimiento". 
                            Si es un nuevo problema, haz clic en "Crear Caso Nuevo".
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Datos del Paciente */}
              <div className="space-y-4 p-4 border-2 rounded-lg bg-white">
                <h3 className="text-lg font-semibold">Datos del Paciente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Identificación *</Label>
                    <Input value={identificacion} disabled />
                  </div>
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      disabled={!!paciente}
                      data-testid="input-nombre"
                    />
                  </div>
                  <div>
                    <Label>Apellidos *</Label>
                    <Input
                      value={apellidos}
                      onChange={(e) => setApellidos(e.target.value)}
                      disabled={!!paciente}
                      data-testid="input-apellidos"
                    />
                  </div>
                  <div>
                    <Label>Celular *</Label>
                    <Input
                      value={celular}
                      onChange={(e) => setCelular(e.target.value)}
                      disabled={!!paciente}
                      data-testid="input-celular"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Dirección *</Label>
                    <Input
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      disabled={!!paciente}
                      data-testid="input-direccion"
                    />
                  </div>
                  <div>
                    <Label>Departamento *</Label>
                    <Select value={departamento} onValueChange={setDepartamento} disabled={!!paciente}>
                      <SelectTrigger data-testid="select-departamento">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map((dept) => (
                          <SelectItem key={dept.id} value={dept.nombre}>
                            {dept.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ciudad *</Label>
                    <Select value={ciudad} onValueChange={setCiudad} disabled={!!paciente || !departamento}>
                      <SelectTrigger data-testid="select-ciudad">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {ciudades.map((c) => (
                          <SelectItem key={c.id} value={c.nombre}>
                            {c.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Información del Caso */}
              <div id="caso-section" className="space-y-4 p-4 border-2 rounded-lg bg-white">
                <h3 className="text-lg font-semibold">Información del Caso</h3>
                
                <div className="flex gap-2 mb-4">
                  <div className="flex-1">
                    <Label>Buscar Caso Existente</Label>
                    <Input
                      placeholder="Ej: PQR-20241122-0001"
                      value={numeroCasoBuscar}
                      onChange={(e) => setNumeroCasoBuscar(e.target.value)}
                      data-testid="input-numero-caso"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={buscarCaso} variant="outline" data-testid="btn-buscar-caso">
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </Button>
                    {casoExistente && (
                      <Button
                        onClick={() => {
                          setCasoExistente(null);
                          setNumeroCasoBuscar('');
                          setEstado('ABIERTO');
                          setPrioridad('MEDIA');
                          setMotivoId('');
                          setDescripcion('');
                        }}
                        variant="ghost"
                        size="icon"
                        className="ml-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {casoExistente && (
                  <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          📋 Dando seguimiento al caso: {casoExistente.numero_caso}
                        </p>
                        <p className="text-xs text-blue-700">
                          Puede actualizar el estado, prioridad o agregar más observaciones a este caso existente
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setCasoExistente(null);
                          setNumeroCasoBuscar('');
                          setEstado('ABIERTO');
                          setPrioridad('MEDIA');
                          setMotivoId('');
                          setDescripcion('');
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-blue-700 hover:text-blue-900"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Motivo de la llamada *</Label>
                    <Select value={motivoId} onValueChange={setMotivoId}>
                      <SelectTrigger data-testid="select-motivo">
                        <SelectValue placeholder="Seleccionar motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {motivos.map((m) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridad</Label>
                    <Select value={prioridad} onValueChange={setPrioridad}>
                      <SelectTrigger data-testid="select-prioridad">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="MEDIA">Media</SelectItem>
                        <SelectItem value="BAJA">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Descripción / Observaciones *</Label>
                    <Textarea
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      rows={4}
                      placeholder="Describa el motivo de la llamada..."
                      data-testid="textarea-descripcion"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Estado del caso</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="ABIERTO"
                          checked={estado === 'ABIERTO'}
                          onChange={(e) => setEstado(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span>Abierto (nuevo caso)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="EN_PROCESO"
                          checked={estado === 'EN_PROCESO'}
                          onChange={(e) => setEstado(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span>En Proceso (seguimiento)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="CERRADO"
                          checked={estado === 'CERRADO'}
                          onChange={(e) => setEstado(e.target.value)}
                          className="w-4 h-4"
                        />
                        <span>Cerrado (resuelto)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4 justify-end">
                <Button
                  variant="outline"
                  onClick={limpiarFormulario}
                  data-testid="btn-limpiar"
                >
                  Limpiar Formulario
                </Button>
                <Button
                  onClick={guardarCaso}
                  disabled={loading}
                  data-testid="btn-guardar-caso"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Guardando...' : 'Guardar Caso'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="historial" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Historial del Paciente</h3>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab('gestion')}
                    data-testid="btn-volver-gestion"
                  >
                    Volver a Gestión PQR
                  </Button>
                </div>

                {!paciente ? (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">
                      Primero busque un paciente en la pestaña "Gestión PQR"
                    </p>
                    <Button onClick={() => setActiveTab('gestion')} variant="outline">
                      Ir a Gestión PQR
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-2 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Paciente</p>
                          <p className="font-bold text-lg">
                            {paciente.nombre} {paciente.apellidos}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Identificación</p>
                          <p className="font-semibold">{paciente.identificacion}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Celular</p>
                          <p className="font-semibold">{paciente.celular}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total de Casos</p>
                          <p className="font-bold text-2xl text-green-600">{casosPaciente.length}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {casosPaciente.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed rounded-lg">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">
                            No hay casos registrados para este paciente
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">Casos Registrados</h4>
                            <div className="flex gap-2 text-sm">
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                                Abiertos: {casosPaciente.filter(c => c.estado === 'ABIERTO').length}
                              </span>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                Cerrados: {casosPaciente.filter(c => c.estado === 'CERRADO').length}
                              </span>
                            </div>
                          </div>
                          {casosPaciente.map((caso) => (
                            <Card key={caso.id} className="border-2 hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="space-y-1 flex-1">
                                    <p className="font-bold text-lg text-green-700">{caso.numero_caso}</p>
                                    <p className="text-sm text-muted-foreground">
                                      📅 {formatDateShort(caso.fecha_creacion)}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className={`estado-badge-${caso.estado}`}>
                                      {caso.estado.replace('_', ' ')}
                                    </span>
                                    <span className={`priority-badge-${caso.prioridad}`}>
                                      {caso.prioridad}
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbeddedView;
