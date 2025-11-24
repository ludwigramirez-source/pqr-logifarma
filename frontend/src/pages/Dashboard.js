import React, { useEffect, useState } from 'react';
import { metricasAPI, alertasAPI } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, CheckCircle, Clock, TrendingUp, AlertTriangle, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [casosPorHora, setCasosPorHora] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [metricsRes, casosPorHoraRes] = await Promise.all([
        metricasAPI.getDashboard(),
        metricasAPI.getCasosPorHora(new Date().toISOString().split('T')[0])
      ]);
      
      setMetrics(metricsRes.data);
      setCasosPorHora(casosPorHoraRes.data);
    } catch (error) {
      toast.error('Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Casos Abiertos',
        data: Array.from({ length: 24 }, (_, i) => {
          const found = casosPorHora.find(c => c.hora === i);
          return found ? found.cantidad : 0;
        }),
        backgroundColor: 'hsl(141, 81%, 31%)',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
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
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h1 className="page-title text-3xl font-bold mb-2" style={{ color: 'hsl(141, 81%, 31%)' }}>Dashboard</h1>
        <p className="text-muted-foreground">Métricas y estadísticas del sistema PQR</p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2" data-testid="metric-casos-abiertos">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Casos Abiertos Hoy
            </CardTitle>
            <FileText className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{metrics?.casos_abiertos_hoy || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-2" data-testid="metric-casos-cerrados">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Casos Cerrados Hoy
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{metrics?.casos_cerrados_hoy || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-2" data-testid="metric-casos-proceso">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En Proceso
            </CardTitle>
            <Clock className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{metrics?.casos_en_proceso || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-2" data-testid="metric-alertas">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alertas Activas
            </CardTitle>
            <Bell className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{metrics?.alertas_activas || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estadísticas Generales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Total de Casos</span>
              <span className="text-2xl font-bold" style={{ color: 'hsl(141, 81%, 31%)' }}>
                {metrics?.total_casos || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Tasa Resolución 1ª Llamada</span>
              <span className="text-2xl font-bold" style={{ color: 'hsl(213, 100%, 40%)' }}>
                {metrics?.tasa_resolucion_primera_llamada || 0}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Tiempo Promedio Resolución</span>
              <span className="text-2xl font-bold text-yellow-600">
                {metrics?.tiempo_promedio_resolucion || 0}h
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle>Casos por Hora (Hoy)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
