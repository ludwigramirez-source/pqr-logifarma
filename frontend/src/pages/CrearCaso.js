import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { casosAPI, pacientesAPI, motivosAPI, usuariosAPI, ubicacionesAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Save, Search, Plus, UserPlus } from 'lucide-react';

const CrearCaso = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [motivos, setMotivos] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  
  // Búsqueda de paciente
  const [buscarCedula, setBuscarCedula] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [mostrarCrearPaciente, setMostrarCrearPaciente] = useState(false);
  
  // Datos del paciente (para crear nuevo)
  const [nuevoPaciente, setNuevoPaciente] = useState({
    identificacion: '',
    nombre: '',
    apellidos: '',
    celular: '',
    direccion: '',
    departamento: '',
    ciudad: ''
  });
  
  // Datos del caso
  const [caso, setCaso] = useState({
    motivoId: '',
    prioridad: 'MEDIA',
    estado: 'ABIERTO',
    descripcion: '',
    agenteAsignadoId: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (nuevoPaciente.departamento) {
      const dept = departamentos.find(d => d.nombre === nuevoPaciente.departamento);
      if (dept) {
        cargarCiudades(dept.id);
      }
    }
  }, [nuevoPaciente.departamento]);

  const cargarDatos = async () => {
    try {
      const [motivosRes, usuariosRes, deptosRes] = await Promise.all([
        motivosAPI.getAll({ activo: true }),
        usuariosAPI.getAll(),
        ubicacionesAPI.getDepartamentos()
      ]);
      setMotivos(motivosRes.data);
      setAgentes(usuariosRes.data);
      setDepartamentos(deptosRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    }
  };

  const cargarCiudades = async (departamentoId) => {
    try {
      const response = await ubicacionesAPI.getCiudades(departamentoId);
      setCiudades(response.data);
    } catch (error) {
      toast.error('Error al cargar ciudades');
    }
  };

  const buscarPaciente = async () => {
    if (!buscarCedula) {
      toast.error('Ingrese una cédula');
      return;
    }

    try {
      const response = await pacientesAPI.getAll({ identificacion: buscarCedula });
      if (response.data.length > 0) {
        setPacienteSeleccionado(response.data[0]);
        setMostrarCrearPaciente(false);
        toast.success('Paciente encontrado');
      } else {
        setPacienteSeleccionado(null);
        setNuevoPaciente({ ...nuevoPaciente, identificacion: buscarCedula });
        setMostrarCrearPaciente(true);
        toast.info('Paciente no encontrado. Complete los datos para crear uno nuevo');
      }
    } catch (error) {
      toast.error('Error al buscar paciente');
    }
  };

  const crearPaciente = async () => {
    if (!nuevoPaciente.nombre || !nuevoPaciente.apellidos || !nuevoPaciente.celular || 
        !nuevoPaciente.direccion || !nuevoPaciente.departamento || !nuevoPaciente.ciudad) {
      toast.error('Complete todos los campos del paciente');
      return;
    }

    try {
      const response = await pacientesAPI.create(nuevoPaciente);
      setPacienteSeleccionado(response.data);
      setMostrarCrearPaciente(false);
      toast.success('Paciente creado exitosamente');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear paciente');
    }
  };

  const crearCaso = async () => {
    if (!pacienteSeleccionado) {
      toast.error('Debe seleccionar o crear un paciente primero');
      return;
    }

    if (!caso.motivoId || !caso.descripcion) {
      toast.error('Complete los datos del caso');
      return;
    }

    setLoading(true);
    try {
      const casoData = {
        paciente_id: pacienteSeleccionado.id,
        motivo_id: parseInt(caso.motivoId),
        prioridad: caso.prioridad,
        estado: caso.estado,
        descripcion: caso.descripcion,
        agente_asignado_id: caso.agenteAsignadoId ? parseInt(caso.agenteAsignadoId) : null
      };

      const response = await casosAPI.create(casoData);
      toast.success(`Caso ${response.data.numero_caso} creado exitosamente`);
      navigate(`/casos/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear caso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="crear-caso-page">
      <div>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(141, 81%, 31%)' }}>
          Crear Nuevo Caso
        </h1>
        <p className="text-muted-foreground">Registrar un nuevo caso PQR</p>
      </div>

      {/* Búsqueda de Paciente */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Ingrese cédula del paciente"
                value={buscarCedula}
                onChange={(e) => setBuscarCedula(e.target.value)}
                data-testid="input-buscar-cedula"
              />
            </div>
            <Button onClick={buscarPaciente} data-testid="btn-buscar-paciente">
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>

          {pacienteSeleccionado && (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <p className="font-semibold text-green-900">Paciente Seleccionado:</p>
              <p className="text-sm">
                {pacienteSeleccionado.nombre} {pacienteSeleccionado.apellidos} - CC: {pacienteSeleccionado.identificacion}
              </p>
              <p className="text-sm text-muted-foreground">
                Celular: {pacienteSeleccionado.celular} | Ciudad: {pacienteSeleccionado.ciudad}, {pacienteSeleccionado.departamento}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crear Nuevo Paciente */}
      {mostrarCrearPaciente && (
        <Card className="border-2 border-orange-200">
          <CardHeader className="bg-orange-50">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Crear Nuevo Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Identificación *</Label>
                <Input value={nuevoPaciente.identificacion} disabled />
              </div>
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={nuevoPaciente.nombre}
                  onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, nombre: e.target.value })}
                  data-testid="input-nuevo-paciente-nombre"
                />
              </div>
              <div>
                <Label>Apellidos *</Label>
                <Input
                  value={nuevoPaciente.apellidos}
                  onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, apellidos: e.target.value })}
                  data-testid="input-nuevo-paciente-apellidos"
                />
              </div>
              <div>
                <Label>Celular *</Label>
                <Input
                  value={nuevoPaciente.celular}
                  onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, celular: e.target.value })}
                  data-testid="input-nuevo-paciente-celular"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Dirección *</Label>
                <Input
                  value={nuevoPaciente.direccion}
                  onChange={(e) => setNuevoPaciente({ ...nuevoPaciente, direccion: e.target.value })}
                  data-testid="input-nuevo-paciente-direccion"
                />
              </div>
              <div>
                <Label>Departamento *</Label>
                <Select 
                  value={nuevoPaciente.departamento} 
                  onValueChange={(value) => setNuevoPaciente({ ...nuevoPaciente, departamento: value, ciudad: '' })}
                >
                  <SelectTrigger data-testid="select-nuevo-paciente-departamento">
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
                <Select 
                  value={nuevoPaciente.ciudad} 
                  onValueChange={(value) => setNuevoPaciente({ ...nuevoPaciente, ciudad: value })}
                  disabled={!nuevoPaciente.departamento}
                >
                  <SelectTrigger data-testid="select-nuevo-paciente-ciudad">
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
            <div className="mt-4 flex justify-end">
              <Button onClick={crearPaciente} data-testid="btn-crear-paciente">
                <Plus className="h-4 w-4 mr-2" />
                Crear Paciente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Datos del Caso */}
      {pacienteSeleccionado && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Información del Caso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Motivo *</Label>
                <Select value={caso.motivoId} onValueChange={(value) => setCaso({ ...caso, motivoId: value })}>
                  <SelectTrigger data-testid="select-caso-motivo">
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
                <Label>Prioridad *</Label>
                <Select value={caso.prioridad} onValueChange={(value) => setCaso({ ...caso, prioridad: value })}>
                  <SelectTrigger data-testid="select-caso-prioridad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALTA">Alta</SelectItem>
                    <SelectItem value="MEDIA">Media</SelectItem>
                    <SelectItem value="BAJA">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado Inicial *</Label>
                <Select value={caso.estado} onValueChange={(value) => setCaso({ ...caso, estado: value })}>
                  <SelectTrigger data-testid="select-caso-estado">
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
                <Label>Asignar a Agente</Label>
                <Select value={caso.agenteAsignadoId} onValueChange={(value) => setCaso({ ...caso, agenteAsignadoId: value })}>
                  <SelectTrigger data-testid="select-caso-agente">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    {agentes.map((a) => (
                      <SelectItem key={a.id} value={a.id.toString()}>
                        {a.nombre_completo} ({a.rol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Descripción del Caso *</Label>
                <Textarea
                  value={caso.descripcion}
                  onChange={(e) => setCaso({ ...caso, descripcion: e.target.value })}
                  rows={5}
                  placeholder="Describa detalladamente el motivo del caso..."
                  data-testid="textarea-caso-descripcion"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-4 justify-end">
              <Button variant="outline" onClick={() => navigate('/casos')}>
                Cancelar
              </Button>
              <Button onClick={crearCaso} disabled={loading} data-testid="btn-crear-caso">
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Creando...' : 'Crear Caso'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CrearCaso;
