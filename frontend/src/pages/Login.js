import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login({ username, password });
    
    if (result.success) {
      toast.success('¡Bienvenido!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: 'linear-gradient(135deg, hsl(141, 50%, 95%) 0%, hsl(213, 50%, 95%) 100%)'
    }}>
      <Card className="w-full max-w-md shadow-2xl border-2" data-testid="login-card">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <img src="/assets/logo.png" alt="LOGIFARMA" className="h-16 w-auto" />
          </div>
          <CardTitle className="text-center text-3xl font-bold" style={{ color: 'hsl(141, 81%, 31%)' }}>
            Sistema PQR
          </CardTitle>
          <CardDescription className="text-center text-base">
            Ingresa tus credenciales para acceder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid="username-input"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="password-input"
                className="h-11"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold"
              disabled={loading}
              data-testid="login-submit-button"
              style={{
                backgroundColor: 'hsl(141, 81%, 31%)',
                color: 'white'
              }}
            >
              {loading ? 'Ingresando...' : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  Ingresar
                </>
              )}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Usuarios de prueba:</p>
            <p className="font-mono mt-1">admin / admin123 (Administrador)</p>
            <p className="font-mono">jagente / agente123 (Agente)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
