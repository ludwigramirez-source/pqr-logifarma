import React, { useState, useEffect } from 'react';
import { reportesAPI, metricasAPI } from '../services/api';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { FileText, Download, Users, BarChart3, Calendar, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { formatDate } from '../lib/utils';

const Reportes = () => {
  const [activeTab, setActiveTab] = useState('agentes');
  const [loading, setLoading] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);

  // Datos de agentes
  const [datosAgentes, setDatosAgentes] = useState(null);

  // Datos de casos por período
  const [datosCasos, setDatosCasos] = useState(null);
  const [tendenciaHistorica, setTendenciaHistorica] = useState(null);

  const [fechaInicio, setFechaInicio] = useState(() => {
    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - 1);
    return fecha.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    cargarDatos();
  }, [fechaInicio, fechaFin]);

  const cargarDatos = async () => {
    if (!fechaInicio || !fechaFin) return;

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      toast.error('La fecha de inicio debe ser anterior a la fecha fin');
      return;
    }

    setLoading(true);
    try {
      const [agentesRes, tiempoRes, tendenciaRes] = await Promise.all([
        metricasAPI.getDesempenoAgentes(fechaInicio, fechaFin),
        metricasAPI.getTiempoResolucion(fechaInicio, fechaFin, 'general'),
        metricasAPI.getTendenciaHistorica(fechaInicio, fechaFin, 'dia')
      ]);

      setDatosAgentes(agentesRes.data);
      setDatosCasos(tiempoRes.data);
      setTendenciaHistorica(tendenciaRes.data);
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleDescargar = async (formato) => {
    const tipoReporte = activeTab === 'agentes' ? 'desempeno_agentes' : 'casos_periodo';

    setLoadingDownload(true);
    try {
      const response = await reportesAPI.generar({
        tipo_reporte: tipoReporte,
        formato: formato,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      });

      const blob = new Blob([response.data], {
        type: formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const nombreArchivo = `reporte_${tipoReporte}_${fechaInicio}_${fechaFin}.${formato}`;
      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`Reporte descargado: ${nombreArchivo}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al descargar reporte');
    } finally {
      setLoadingDownload(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="reportes-page">
      <div>
        <h1 className="page-title text-3xl font-bold mb-2" style={{ color: 'hsl(141, 81%, 31%)' }}>
          Reportes y Estadísticas
        </h1>
        <p className="text-muted-foreground">
          Visualice y descargue reportes detallados en PDF o Excel
        </p>
      </div>

      {/* Filtros de Fecha */}
      <Card className="border-2">
        <CardHeader className="bg-muted">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Período de Consulta
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="fecha-inicio">Fecha de Inicio</Label>
              <Input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                data-testid="input-fecha-inicio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha-fin">Fecha de Fin</Label>
              <Input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                data-testid="input-fecha-fin"
              />
            </div>

            <Button onClick={cargarDatos} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar Datos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('agentes')}
            className={`px-6 py-3 font-semibold border-b-4 transition-all ${
              activeTab === 'agentes'
                ? 'border-green-600 text-green-600 bg-green-50'
                : 'border-transparent text-muted-foreground hover:text-gray-700 hover:bg-gray-50'
            }`}
            data-testid="tab-agentes"
          >
            <Users className="h-4 w-4 inline mr-2" />
            Desempeño de Agentes
          </button>
          <button
            onClick={() => setActiveTab('casos')}
            className={`px-6 py-3 font-semibold border-b-4 transition-all ${
              activeTab === 'casos'
                ? 'border-green-600 text-green-600 bg-green-50'
                : 'border-transparent text-muted-foreground hover:text-gray-700 hover:bg-gray-50'
            }`}
            data-testid="tab-casos"
          >
            <BarChart3 className="h-4 w-4 inline mr-2" />
            Casos por Período
          </button>
        </div>
      </div>

      {/* Contenido de Agentes */}
      {activeTab === 'agentes' && (
        <div className="space-y-6">
          {/* Botones de descarga */}
          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Exportar Reporte de Agentes</h3>
                  <p className="text-sm text-muted-foreground">
                    Descargue este reporte en formato PDF o Excel
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDescargar('pdf')}
                    disabled={loadingDownload || !datosAgentes?.agentes?.length}
                    variant="outline"
                    className="bg-white"
                  >
                    <FileText className="h-4 w-4 mr-2 text-red-500" />
                    Descargar PDF
                  </Button>
                  <Button
                    onClick={() => handleDescargar('excel')}
                    disabled={loadingDownload || !datosAgentes?.agentes?.length}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Descargar Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Agentes */}
          <Card className="border-2">
            <CardHeader className="bg-muted">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Desempeño de Agentes
              </CardTitle>
              <CardDescription>
                Período: {fechaInicio} a {fechaFin}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : !datosAgentes?.agentes || datosAgentes.agentes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay datos de agentes en este período
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 bg-gray-50">
                        <th className="text-left p-4 font-semibold">Agente</th>
                        <th className="text-center p-4 font-semibold">Casos Abiertos</th>
                        <th className="text-center p-4 font-semibold">Casos Cerrados</th>
                        <th className="text-center p-4 font-semibold">Tiempo Promedio (hrs)</th>
                        <th className="text-center p-4 font-semibold">Eficiencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosAgentes.agentes.map((agente, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{agente.agente}</td>
                          <td className="text-center p-4">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                              {agente.abiertos}
                            </span>
                          </td>
                          <td className="text-center p-4">
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                              {agente.cerrados}
                            </span>
                          </td>
                          <td className="text-center p-4 font-semibold">
                            {agente.promedio_horas.toFixed(2)}
                          </td>
                          <td className="text-center p-4">
                            {agente.abiertos > 0 ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-32 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{
                                      width: `${Math.min((agente.cerrados / agente.abiertos) * 100, 100)}%`
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold">
                                  {((agente.cerrados / agente.abiertos) * 100).toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 border-t-2 font-bold">
                        <td className="p-4">TOTAL</td>
                        <td className="text-center p-4">
                          {datosAgentes.agentes.reduce((sum, a) => sum + a.abiertos, 0)}
                        </td>
                        <td className="text-center p-4">
                          {datosAgentes.agentes.reduce((sum, a) => sum + a.cerrados, 0)}
                        </td>
                        <td className="text-center p-4">
                          {(datosAgentes.agentes.reduce((sum, a) => sum + a.promedio_horas, 0) / datosAgentes.agentes.length).toFixed(2)}
                        </td>
                        <td className="text-center p-4">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contenido de Casos */}
      {activeTab === 'casos' && (
        <div className="space-y-6">
          {/* Botones de descarga */}
          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg mb-1">Exportar Reporte de Casos</h3>
                  <p className="text-sm text-muted-foreground">
                    Descargue este reporte en formato PDF o Excel
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDescargar('pdf')}
                    disabled={loadingDownload || !tendenciaHistorica?.datos?.length}
                    variant="outline"
                    className="bg-white"
                  >
                    <FileText className="h-4 w-4 mr-2 text-red-500" />
                    Descargar PDF
                  </Button>
                  <Button
                    onClick={() => handleDescargar('excel')}
                    disabled={loadingDownload || !tendenciaHistorica?.datos?.length}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Descargar Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen Ejecutivo */}
          <Card className="border-2">
            <CardHeader className="bg-muted">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumen Ejecutivo
              </CardTitle>
              <CardDescription>
                Período: {fechaInicio} a {fechaFin}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total de Casos</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {tendenciaHistorica?.datos?.reduce((sum, d) => sum + d.casos_abiertos, 0) || 0}
                    </p>
                  </div>
                  <div className="p-6 bg-green-50 border-2 border-green-200 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Casos Cerrados</p>
                    <p className="text-3xl font-bold text-green-700">
                      {tendenciaHistorica?.datos?.reduce((sum, d) => sum + d.casos_cerrados, 0) || 0}
                    </p>
                  </div>
                  <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Casos Pendientes</p>
                    <p className="text-3xl font-bold text-yellow-700">
                      {tendenciaHistorica?.datos?.reduce((sum, d) => sum + d.casos_pendientes, 0) || 0}
                    </p>
                  </div>
                  <div className="p-6 bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Tiempo Promedio</p>
                    <p className="text-3xl font-bold text-purple-700">
                      {datosCasos?.promedio_general?.toFixed(1) || 0}<span className="text-lg">hrs</span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabla de Tendencia Diaria */}
          <Card className="border-2">
            <CardHeader className="bg-muted">
              <CardTitle>Tendencia Diaria de Casos</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              ) : !tendenciaHistorica?.datos || tendenciaHistorica.datos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay datos de casos en este período
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 bg-gray-50">
                        <th className="text-left p-4 font-semibold">Fecha</th>
                        <th className="text-center p-4 font-semibold">Casos Abiertos</th>
                        <th className="text-center p-4 font-semibold">Casos Cerrados</th>
                        <th className="text-center p-4 font-semibold">Casos Pendientes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tendenciaHistorica.datos.map((dia, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-4 font-medium">{dia.periodo}</td>
                          <td className="text-center p-4">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">
                              {dia.casos_abiertos}
                            </span>
                          </td>
                          <td className="text-center p-4">
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                              {dia.casos_cerrados}
                            </span>
                          </td>
                          <td className="text-center p-4">
                            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold">
                              {dia.casos_pendientes}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Reportes;
