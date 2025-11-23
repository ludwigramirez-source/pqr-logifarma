import React, { useState, useEffect } from 'react';
import { usuariosAPI, motivosAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Settings, UserPlus, Edit, Trash2, FileText, Plus, Save } from 'lucide-react';
import { formatDate } from '../lib/utils';

const Configuracion = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Gestión de usuarios
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    username: '',
    nombre_completo: '',
    email: '',
    password: '',
    rol: 'agente'
  });

  // Gestión de motivos
  const [showMotivoDialog, setShowMotivoDialog] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState(null);
  const [motivoForm, setMotivoForm] = useState({
    nombre: '',
    descripcion: '',
    orden: 0,
    activo: true
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [usuariosRes, motivosRes] = await Promise.all([
        usuariosAPI.getAll(),
        motivosAPI.getAll()
      ]);
      setUsuarios(usuariosRes.data);
      setMotivos(motivosRes.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogUsuario = (usuario = null) => {
    if (usuario) {
      setEditingUser(usuario);
      setUserForm({
        username: usuario.username,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        password: '',
        rol: usuario.rol
      });
    } else {
      setEditingUser(null);
      setUserForm({
        username: '',
        nombre_completo: '',
        email: '',
        password: '',
        rol: 'agente'
      });
    }
    setShowUserDialog(true);
  };

  const guardarUsuario = async () => {
    if (!userForm.username || !userForm.nombre_completo || !userForm.email) {
      toast.error('Complete todos los campos obligatorios');
      return;
    }

    if (!editingUser && !userForm.password) {
      toast.error('La contraseña es obligatoria para nuevos usuarios');
      return;
    }

    try {
      if (editingUser) {
        const updateData = { ...userForm };
        if (!updateData.password) {
          delete updateData.password;
        }
        await usuariosAPI.update(editingUser.id, updateData);
        toast.success('Usuario actualizado exitosamente');
      } else {
        await usuariosAPI.create(userForm);
        toast.success('Usuario creado exitosamente');
      }
      setShowUserDialog(false);
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar usuario');
    }
  };

  const abrirDialogMotivo = (motivo = null) => {
    if (motivo) {
      setEditingMotivo(motivo);
      setMotivoForm({
        nombre: motivo.nombre,
        descripcion: motivo.descripcion || '',
        orden: motivo.orden,
        activo: motivo.activo
      });
    } else {
      setEditingMotivo(null);
      const maxOrden = motivos.length > 0 ? Math.max(...motivos.map(m => m.orden)) : 0;
      setMotivoForm({
        nombre: '',
        descripcion: '',
        orden: maxOrden + 1,
        activo: true
      });
    }
    setShowMotivoDialog(true);
  };

  const guardarMotivo = async () => {
    if (!motivoForm.nombre) {
      toast.error('El nombre del motivo es obligatorio');
      return;
    }

    try {
      if (editingMotivo) {
        await motivosAPI.update(editingMotivo.id, motivoForm);
        toast.success('Motivo actualizado exitosamente');
      } else {
        await motivosAPI.create(motivoForm);
        toast.success('Motivo creado exitosamente');
      }
      setShowMotivoDialog(false);
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar motivo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="configuracion-page">
      <div>
        <h1 className="page-title text-3xl font-bold mb-2" style={{ color: 'hsl(141, 81%, 31%)' }}>
          Configuración del Sistema
        </h1>
        <p className="text-muted-foreground">Gestión de usuarios y configuraciones</p>
      </div>

      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="usuarios" data-testid="tab-usuarios">
            <UserPlus className="h-4 w-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="motivos" data-testid="tab-motivos">
            <FileText className="h-4 w-4 mr-2" />
            Motivos PQR
          </TabsTrigger>
        </TabsList>

        {/* TAB: Usuarios */}
        <TabsContent value="usuarios" className="space-y-4">
          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Gestión de Usuarios</CardTitle>
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.href = '/usuarios/crear'} 
                  data-testid="btn-crear-usuario-pagina"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </Button>
                <Button 
                  onClick={() => abrirDialogUsuario()} 
                  variant="outline"
                  data-testid="btn-nuevo-usuario-modal"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edición Rápida
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.username}</TableCell>
                      <TableCell>{usuario.nombre_completo}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        <Badge variant={usuario.rol === 'administrador' ? 'default' : 'secondary'}>
                          {usuario.rol}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={usuario.activo ? 'default' : 'destructive'}>
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDialogUsuario(usuario)}
                          data-testid={`btn-editar-usuario-${usuario.id}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Motivos */}
        <TabsContent value="motivos" className="space-y-4">
          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Motivos de PQR Configurados</CardTitle>
              <Button 
                onClick={() => abrirDialogMotivo()} 
                data-testid="btn-nuevo-motivo"
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Motivo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {motivos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay motivos configurados
                  </p>
                ) : (
                  motivos.map((motivo, index) => (
                    <div
                      key={motivo.id}
                      className="flex items-center justify-between p-4 border-2 rounded-lg bg-white hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="font-bold text-lg text-muted-foreground w-8">#{motivo.orden}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{motivo.nombre}</p>
                          {motivo.descripcion && (
                            <p className="text-sm text-muted-foreground mt-1">{motivo.descripcion}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={motivo.activo ? 'default' : 'secondary'} className="text-sm">
                          {motivo.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDialogMotivo(motivo)}
                          data-testid={`btn-editar-motivo-${motivo.id}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para Crear/Editar Usuario */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Usuario *</Label>
                <Input
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  disabled={!!editingUser}
                  data-testid="input-username"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>
              <div className="col-span-2">
                <Label>Nombre Completo *</Label>
                <Input
                  value={userForm.nombre_completo}
                  onChange={(e) => setUserForm({ ...userForm, nombre_completo: e.target.value })}
                  data-testid="input-nombre-completo"
                />
              </div>
              <div>
                <Label>Contraseña {!editingUser && '*'}</Label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editingUser ? 'Dejar vacío para no cambiar' : ''}
                  data-testid="input-password"
                />
              </div>
              <div>
                <Label>Rol *</Label>
                <Select 
                  value={userForm.rol} 
                  onValueChange={(value) => setUserForm({ ...userForm, rol: value })}
                >
                  <SelectTrigger data-testid="select-rol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agente">Agente</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editingUser && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <span className="font-semibold">Creado:</span> {formatDate(editingUser.fecha_creacion)}
                </p>
                {editingUser.ultimo_acceso && (
                  <p className="text-sm">
                    <span className="font-semibold">Último acceso:</span> {formatDate(editingUser.ultimo_acceso)}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarUsuario} data-testid="btn-guardar-usuario">
              <Save className="h-4 w-4 mr-2" />
              {editingUser ? 'Actualizar' : 'Crear'} Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Crear/Editar Motivo */}
      <Dialog open={showMotivoDialog} onOpenChange={setShowMotivoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {editingMotivo ? 'Editar Motivo PQR' : 'Crear Nuevo Motivo PQR'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-4">
              <div>
                <Label>Nombre del Motivo *</Label>
                <Input
                  value={motivoForm.nombre}
                  onChange={(e) => setMotivoForm({ ...motivoForm, nombre: e.target.value })}
                  placeholder="Ej: Retraso en entrega"
                  data-testid="input-motivo-nombre"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este nombre aparecerá en el formulario de creación de casos
                </p>
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Input
                  value={motivoForm.descripcion}
                  onChange={(e) => setMotivoForm({ ...motivoForm, descripcion: e.target.value })}
                  placeholder="Descripción breve del motivo"
                  data-testid="input-motivo-descripcion"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Orden de Visualización *</Label>
                  <Input
                    type="number"
                    value={motivoForm.orden}
                    onChange={(e) => setMotivoForm({ ...motivoForm, orden: parseInt(e.target.value) || 0 })}
                    min="0"
                    data-testid="input-motivo-orden"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Orden en el que aparece en los dropdowns
                  </p>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select 
                    value={motivoForm.activo.toString()} 
                    onValueChange={(value) => setMotivoForm({ ...motivoForm, activo: value === 'true' })}
                  >
                    <SelectTrigger data-testid="select-motivo-activo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Activo</SelectItem>
                      <SelectItem value="false">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {motivoForm.activo ? 'Visible en formularios' : 'Oculto en formularios'}
                  </p>
                </div>
              </div>
            </div>
            {editingMotivo && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900">Nota:</p>
                <p className="text-sm text-blue-800">
                  Si desactivas este motivo, dejará de aparecer en el formulario de creación de casos, pero los casos existentes con este motivo seguirán siendo válidos.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMotivoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarMotivo} data-testid="btn-guardar-motivo" className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              {editingMotivo ? 'Actualizar' : 'Crear'} Motivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Configuracion;
