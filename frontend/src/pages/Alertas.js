import React, { useEffect, useState } from 'react';
import { alertasAPI, casosAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '../lib/utils';

const Alertas = () => {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlertas();
  }, []);

  const loadAlertas = async () => {
    try {
      const response = await alertasAPI.getAll();
      setAlertas(response.data);
    } catch (error) {
      toast.error('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  };

  const marcarLeida = async (alertaId) => {
    try {
      await alertasAPI.markAsRead(alertaId);
      toast.success('Alerta marcada como leída');
      loadAlertas();
    } catch (error) {
      toast.error('Error al marcar alerta');
    }
  };

  const alertasNoLeidas = alertas.filter(a => !a.leida);
  const alertasLeidas = alertas.filter(a => a.leida);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="alertas-page">
      <div>
        <h1 className="page-title text-3xl font-bold mb-2" style={{ color: 'hsl(141, 81%, 31%)' }}>
          Alertas
        </h1>
        <p className="text-muted-foreground">
          Gestión de alertas del sistema ({alertasNoLeidas.length} no leídas)
        </p>
      </div>

      {/* Alertas No Leídas */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Alertas No Leídas ({alertasNoLeidas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertasNoLeidas.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No hay alertas pendientes
            </p>
          ) : (
            alertasNoLeidas.map((alerta) => (
              <div
                key={alerta.id}
                className="p-4 border-2 rounded-lg bg-orange-50 border-orange-200"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">
                        {alerta.tipo_alerta === 'SLA_5_DIAS' ? 'SLA Excedido' : 'Prioridad Alta'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(alerta.fecha_creacion)}
                      </span>
                    </div>
                    <p className="font-medium">
                      {alerta.tipo_alerta === 'SLA_5_DIAS'
                        ? 'Caso abierto hace más de 5 días sin resolver'
                        : 'Nuevo caso con prioridad alta'}
                    </p>
                    <p className="text-sm text-muted-foreground">Caso ID: {alerta.caso_id}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => marcarLeida(alerta.id)}
                    data-testid={`btn-marcar-leida-${alerta.id}`}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como leída
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Alertas Leídas */}
      {alertasLeidas.length > 0 && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Alertas Leídas ({alertasLeidas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertasLeidas.map((alerta) => (
              <div key={alerta.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {alerta.tipo_alerta === 'SLA_5_DIAS' ? 'SLA Excedido' : 'Prioridad Alta'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(alerta.fecha_creacion)}
                  </span>
                  <span className="text-sm text-green-600 ml-auto font-medium">
                    Leída
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Alertas;
