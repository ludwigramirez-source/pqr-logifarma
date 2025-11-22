import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usuariosAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';

const CrearUsuario = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    nombre_completo: '',
    email: '',
    password: '',
    confirmar_password: '',
    rol: 'agente'
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.username || !formData.nombre_completo || !formData.email || !formData.password) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    if (formData.password !== formData.confirmar_password) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Email inválido');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        username: formData.username,
        nombre_completo: formData.nombre_completo,
        email: formData.email,
        password: formData.password,
        rol: formData.rol
      };

      await usuariosAPI.create(userData);
      toast.success(`Usuario ${formData.username} creado exitosamente`);
      navigate('/configuracion');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="crear-usuario-page">
      <div>
        <Button variant="ghost" onClick={() => navigate('/configuracion')} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Configuración
        </Button>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'hsl(141, 81%, 31%)' }}>
          Crear Nuevo Usuario
        </h1>
        <p className="text-muted-foreground">Complete el formulario para crear un nuevo usuario del sistema</p>
      </div>

      <Card className="border-2 max-w-3xl">
        <CardHeader className="bg-muted">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Información del Usuario
          </CardTitle>
          <CardDescription>
            Los campos marcados con * son obligatorios
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información de Acceso */}
            <div className="space-y-4 p-4 border-2 rounded-lg bg-blue-50">
              <h3 className="font-semibold text-lg">Credenciales de Acceso</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuario *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder="ejemplo: jperez"
                    data-testid="input-username"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Sin espacios, solo letras, números y guiones bajos
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="usuario@logifarma.com"
                    data-testid="input-email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    data-testid="input-password"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmar_password">Confirmar Contraseña *</Label>
                  <Input
                    id="confirmar_password"
                    type="password"
                    value={formData.confirmar_password}
                    onChange={(e) => handleChange('confirmar_password', e.target.value)}
                    placeholder="Repita la contraseña"
                    data-testid="input-confirmar-password"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Información Personal */}
            <div className="space-y-4 p-4 border-2 rounded-lg">
              <h3 className="font-semibold text-lg">Información Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="nombre_completo">Nombre Completo *</Label>
                  <Input
                    id="nombre_completo"
                    value={formData.nombre_completo}
                    onChange={(e) => handleChange('nombre_completo', e.target.value)}
                    placeholder="Nombre y apellidos completos"
                    data-testid="input-nombre-completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rol">Rol en el Sistema *</Label>
                  <Select value={formData.rol} onValueChange={(value) => handleChange('rol', value)}>
                    <SelectTrigger data-testid="select-rol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agente">
                        <div>
                          <p className="font-semibold">Agente</p>
                          <p className="text-xs text-muted-foreground">Puede gestionar casos PQR</p>
                        </div>
                      </SelectItem>
                      <SelectItem value="administrador">
                        <div>
                          <p className="font-semibold">Administrador</p>
                          <p className="text-xs text-muted-foreground">Acceso completo al sistema</p>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.rol === 'administrador' 
                      ? 'Los administradores pueden crear usuarios y acceder a configuración'
                      : 'Los agentes pueden crear y gestionar casos PQR'}
                  </p>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">📌 Importante</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• El usuario recibirá estas credenciales para acceder al sistema</li>
                <li>• Se recomienda que cambie su contraseña en el primer acceso</li>
                <li>• El username debe ser único en el sistema</li>
                <li>• El usuario será activado automáticamente</li>
              </ul>
            </div>

            {/* Botones */}
            <div className="flex gap-4 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/configuracion')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                data-testid="btn-guardar-usuario"
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Creando Usuario...' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview de Credenciales */}
      {formData.username && formData.password && (
        <Card className="border-2 border-green-200 bg-green-50 max-w-3xl">
          <CardHeader>
            <CardTitle className="text-base">Vista Previa de Credenciales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 font-mono text-sm">
              <div>
                <p className="text-muted-foreground">Usuario:</p>
                <p className="font-bold">{formData.username}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Contraseña:</p>
                <p className="font-bold">{'•'.repeat(formData.password.length)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Rol:</p>
                <p className="font-bold capitalize">{formData.rol}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email:</p>
                <p className="font-bold">{formData.email || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CrearUsuario;
