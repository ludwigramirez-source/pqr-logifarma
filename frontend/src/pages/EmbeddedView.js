import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { casosAPI, motivosAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Search, Save, FileText, History, X, Plus, CheckCircle } from 'lucide-react';
import { formatDateShort } from '../lib/utils';

// Función para formatear fecha y hora completa
const formatearFechaHora = (fechaISO) => {
  if (!fechaISO) return '';
  const fecha = new Date(fechaISO);
  const opciones = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  return fecha.toLocaleString('es-CO', opciones);
};

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
  const [email, setEmail] = useState('');
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

  // Modal de confirmación
  const [showModal, setShowModal] = useState(false);
  const [numeroRadicacion, setNumeroRadicacion] = useState('');

  useEffect(() => {
    loadMotivos();
    loadDepartamentos();
  }, []);

  useEffect(() => {
    if (departamento) {
      loadCiudades(departamento);
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
      // API pública de Colombia - Departamentos
      const response = await axios.get('https://api-colombia.com/api/v1/Department');
      setDepartamentos(response.data);
    } catch (error) {
      toast.error('Error al cargar departamentos');
    }
  };

  const loadCiudades = async (nombreDepartamento) => {
    try {
      // Buscar el departamento por nombre
      const dept = departamentos.find(d => d.name === nombreDepartamento);
      if (dept) {
        // API pública de Colombia - Ciudades por departamento
        const response = await axios.get(`https://api-colombia.com/api/v1/Department/${dept.id}/cities`);
        setCiudades(response.data);
      }
    } catch (error) {
      toast.error('Error al cargar ciudades');
    }
  };

  // Validaciones
  const validarIdentificacion = (value) => {
    // Solo números, máximo 10 dígitos (cédulas en Colombia)
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      setIdentificacion(cleaned);
    }
  };

  const formatearIdentificacion = (value) => {
    // Formato con puntos: 1.234.567.890
    if (!value) return '';
    const num = value.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const validarNombre = (value) => {
    // Solo letras y espacios
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/;
    if (regex.test(value)) {
      setNombre(value);
    }
  };

  const validarApellidos = (value) => {
    // Solo letras y espacios
    const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/;
    if (regex.test(value)) {
      setApellidos(value);
    }
  };

  const validarCelular = (value) => {
    // Solo números, debe empezar con 3 o 6, máximo 10 dígitos
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0 || (cleaned[0] === '3' || cleaned[0] === '6')) {
      if (cleaned.length <= 10) {
        setCelular(cleaned);
      }
    }
  };

  const validarEmail = (value) => {
    setEmail(value);
  };

  const buscarPaciente = async () => {
    if (!identificacion) {
      toast.error('Ingrese una cédula');
      return;
    }

    if (identificacion.length < 6) {
      toast.error('La cédula debe tener al menos 6 dígitos');
      return;
    }

    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
      // Usar endpoint embebido que no requiere autenticación
      const response = await axios.get(`${API_URL}/embedded/paciente/${identificacion}`);

      if (response.data.found) {
        const p = response.data.paciente;
        setPaciente(p);
        setNombre(p.nombre);
        setApellidos(p.apellidos);
        setCelular(p.celular);
        setEmail(p.email || '');
        setDireccion(p.direccion);
        setDepartamento(p.departamento);
        setCiudad(p.ciudad);

        // Casos ya vienen del endpoint
        const casosPendientes = response.data.casos;

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
        setEmail('');
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
      const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
      // Usar endpoint embebido que no requiere autenticación
      const response = await axios.get(`${API_URL}/embedded/paciente/${paciente.identificacion}/historial`);
      setCasosPaciente(response.data);
      setActiveTab('historial');
    } catch (error) {
      toast.error('Error al cargar historial');
    }
  };

  const guardarCaso = async () => {
    // Validaciones
    if (!identificacion || !nombre || !apellidos || !celular || !direccion || !departamento || !ciudad) {
      toast.error('Complete todos los datos obligatorios del paciente');
      return;
    }

    if (identificacion.length < 6 || identificacion.length > 10) {
      toast.error('La cédula debe tener entre 6 y 10 dígitos');
      return;
    }

    if (celular.length !== 10) {
      toast.error('El celular debe tener 10 dígitos');
      return;
    }

    if (celular[0] !== '3' && celular[0] !== '6') {
      toast.error('El celular debe empezar con 3 (móvil) o 6 (fijo)');
      return;
    }

    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('El email no es válido');
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
          email: email || null,
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

      const response = await casosAPI.createEmbedded(casoData);

      // Extraer número de radicación de la respuesta
      const numeroRad = response.data.numero_caso;
      setNumeroRadicacion(numeroRad);
      setShowModal(true);

      // No limpiar formulario inmediatamente, esperar a que cierren el modal
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar caso');
    } finally {
      setLoading(false);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    limpiarFormulario();
  };

  const limpiarFormulario = () => {
    setIdentificacion('');
    setPaciente(null);
    setNombre('');
    setApellidos('');
    setCelular('');
    setEmail('');
    setDireccion('');
    setDepartamento('');
    setCiudad('');
    setNumeroCasoBuscar('');
    setCasoExistente(null);
    setMotivoId('');
    setPrioridad('MEDIA');
    setEstado('ABIERTO');
    setDescripcion('');
    setCasosPaciente([]);
  };

  return (
    <div className="min-h-screen p-2 bg-gradient-to-br from-gray-50 to-gray-100" data-testid="embedded-view">
      <Card className="max-w-6xl mx-auto shadow-lg border-2">
        <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-t-lg py-3 px-4">
          <div className="flex items-center justify-between">
            <img src="/assets/logo.png" alt="LOGIFARMA" className="h-8 w-auto bg-white px-2 py-1 rounded" />
            <CardTitle className="text-xl font-bold">Sistema de Radicación Callcenter</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4 h-9">
              <TabsTrigger value="gestion" data-testid="tab-gestion" className="text-sm">
                <FileText className="h-4 w-4 mr-2" />
                Gestión PQR
              </TabsTrigger>
              <TabsTrigger value="historial" data-testid="tab-historial" className="text-sm">
                <History className="h-4 w-4 mr-2" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gestion" className="space-y-4">
              {/* Búsqueda de Paciente */}
              <div className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Buscar Paciente por Cédula
                </h3>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Ingrese cédula del paciente (solo números)"
                      value={formatearIdentificacion(identificacion)}
                      onChange={(e) => validarIdentificacion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && buscarPaciente()}
                      data-testid="input-cedula"
                      className="h-9"
                    />
                  </div>
                  <Button onClick={buscarPaciente} data-testid="btn-buscar-paciente" size="sm" className="h-9">
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
                {paciente && (
                  <>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-green-900">
                            ✓ Paciente: {paciente.nombre} {paciente.apellidos}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CC: {formatearIdentificacion(paciente.identificacion)} | Tel: {paciente.celular}
                          </p>
                        </div>
                        <Button onClick={verHistorial} variant="outline" size="sm" data-testid="btn-ver-historial" className="h-8 text-xs">
                          <History className="h-3 w-3 mr-1" />
                          Ver Historial
                        </Button>
                      </div>
                    </div>

                    {/* Casos Pendientes del Paciente */}
                    {casosPaciente.length > 0 && (
                      <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-sm text-orange-900">
                              ⚠️ {casosPaciente.length} Caso(s) Pendiente(s)
                            </h4>
                          </div>
                          <Button
                            onClick={crearNuevoCaso}
                            variant="outline"
                            size="sm"
                            className="border-orange-400 text-orange-700 hover:bg-orange-100 h-8 text-xs"
                            data-testid="btn-crear-caso-nuevo-directo"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Crear Nuevo
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {casosPaciente.map((caso) => (
                            <div
                              key={caso.id}
                              className="p-2 bg-white border rounded-lg hover:shadow transition-shadow"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-sm">{caso.numero_caso}</p>
                                    <span className={`estado-badge-${caso.estado} text-xs px-1.5 py-0.5`}>
                                      {caso.estado.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDateShort(caso.fecha_creacion)}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => seleccionarCasoPendiente(caso)}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                                  data-testid={`btn-seleccionar-caso-${caso.id}`}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  Seguimiento
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Layout de 2 columnas: Datos del Paciente + Información del Caso */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* COLUMNA IZQUIERDA: Datos del Paciente */}
                <div className="space-y-3 p-4 border-2 rounded-lg bg-white">
                  <h3 className="text-base font-semibold">Datos del Paciente</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Identificación * (solo números)</Label>
                        <Input value={formatearIdentificacion(identificacion)} disabled className="h-9 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Nombre * (solo letras)</Label>
                        <Input
                          value={nombre}
                          onChange={(e) => validarNombre(e.target.value)}
                          disabled={!!paciente}
                          data-testid="input-nombre"
                          placeholder="Solo letras"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Apellidos * (solo letras)</Label>
                        <Input
                          value={apellidos}
                          onChange={(e) => validarApellidos(e.target.value)}
                          disabled={!!paciente}
                          data-testid="input-apellidos"
                          placeholder="Solo letras"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Celular/Teléfono * (3XX o 6XX)</Label>
                        <Input
                          value={celular}
                          onChange={(e) => validarCelular(e.target.value)}
                          disabled={!!paciente}
                          data-testid="input-celular"
                          placeholder="3XXXXXXXXX o 6XXXXXXXXX"
                          maxLength={10}
                          className="h-9 text-sm"
                        />
                        {celular && celular.length > 0 && celular[0] !== '3' && celular[0] !== '6' && (
                          <p className="text-xs text-red-500 mt-1">Debe empezar con 3 o 6</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Email (opcional)</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => validarEmail(e.target.value)}
                        disabled={!!paciente}
                        data-testid="input-email"
                        placeholder="correo@ejemplo.com"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Dirección *</Label>
                      <Input
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                        disabled={!!paciente}
                        data-testid="input-direccion"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Departamento *</Label>
                        <Select value={departamento} onValueChange={setDepartamento} disabled={!!paciente}>
                          <SelectTrigger data-testid="select-departamento" className="h-9 text-sm">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {departamentos.map((dept) => (
                              <SelectItem key={dept.id} value={dept.name}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Ciudad/Municipio *</Label>
                        <Select value={ciudad} onValueChange={setCiudad} disabled={!!paciente || !departamento}>
                          <SelectTrigger data-testid="select-ciudad" className="h-9 text-sm">
                            <SelectValue placeholder="Primero seleccione departamento" />
                          </SelectTrigger>
                          <SelectContent>
                            {ciudades.map((c) => (
                              <SelectItem key={c.id} value={c.name}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA: Información del Caso */}
                <div id="caso-section" className="space-y-3 p-4 border-2 rounded-lg bg-white">
                  <h3 className="text-base font-semibold">Información del Caso</h3>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Buscar Caso Existente</Label>
                      <Input
                        placeholder="Ej: RAD-123"
                        value={numeroCasoBuscar}
                        onChange={(e) => setNumeroCasoBuscar(e.target.value)}
                        data-testid="input-numero-caso"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={buscarCaso} variant="outline" data-testid="btn-buscar-caso" size="sm" className="h-9">
                        <Search className="h-4 w-4 mr-1" />
                        Buscar
                      </Button>
                    </div>
                  </div>

                  {casoExistente && (
                    <div className="p-2 bg-blue-50 border border-blue-300 rounded text-xs">
                      <p className="font-semibold text-blue-900">
                        📋 Seguimiento: {casoExistente.numero_caso}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Motivo de la llamada *</Label>
                        <Select value={motivoId} onValueChange={setMotivoId}>
                          <SelectTrigger data-testid="select-motivo" className="h-9 text-sm">
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
                        <Label className="text-xs">Prioridad</Label>
                        <Select value={prioridad} onValueChange={setPrioridad}>
                          <SelectTrigger data-testid="select-prioridad" className="h-9 text-sm">
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
                      <Label className="text-xs">Descripción / Observaciones *</Label>
                      <Textarea
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        rows={3}
                        placeholder="Describa el motivo de la llamada..."
                        data-testid="textarea-descripcion"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Estado del caso</Label>
                      <div className="flex flex-col gap-2 mt-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            value="ABIERTO"
                            checked={estado === 'ABIERTO'}
                            onChange={(e) => setEstado(e.target.value)}
                            className="w-3 h-3"
                          />
                          <span>Abierto (nuevo caso)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            value="EN_PROCESO"
                            checked={estado === 'EN_PROCESO'}
                            onChange={(e) => setEstado(e.target.value)}
                            className="w-3 h-3"
                          />
                          <span>En Proceso (seguimiento)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="radio"
                            value="CERRADO"
                            checked={estado === 'CERRADO'}
                            onChange={(e) => setEstado(e.target.value)}
                            className="w-3 h-3"
                          />
                          <span>Cerrado (resuelto)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={limpiarFormulario}
                  data-testid="btn-limpiar"
                  size="sm"
                  className="h-9"
                >
                  Limpiar Formulario
                </Button>
                <Button
                  onClick={guardarCaso}
                  disabled={loading}
                  data-testid="btn-guardar-caso"
                  className="bg-green-600 hover:bg-green-700 h-9"
                  size="sm"
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
                          <p className="font-semibold">{formatearIdentificacion(paciente.identificacion)}</p>
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
                                      📅 {formatearFechaHora(caso.fecha_creacion)}
                                    </p>
                                    <p className="text-sm font-semibold text-blue-700 mt-1">
                                      📋 {caso.motivo_nombre || 'Sin motivo'}
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
                                {caso.descripcion && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs text-muted-foreground mb-1">Descripción:</p>
                                    <p className="text-sm">{caso.descripcion}</p>
                                  </div>
                                )}
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

      {/* Modal de Confirmación */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              {casoExistente ? 'Caso Actualizado' : 'Caso Creado Exitosamente'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {casoExistente ? 'Número de Radicación Actualizado' : 'Número de Radicación Asignado'}
              </p>
              <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-4xl font-bold text-green-700 tracking-wider">
                  {numeroRadicacion}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Por favor, comunique este número al cliente para su seguimiento
              </p>
            </div>
          </div>
          <div className="flex justify-center">
            <Button onClick={cerrarModal} className="bg-green-600 hover:bg-green-700">
              Cerrar y Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmbeddedView;
