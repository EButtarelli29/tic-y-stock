import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
  Bell,
  BellOff,
  Clock,
  Package,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AlertSeverity = 'critica' | 'advertencia' | 'info';
type AlertStatus = 'activa' | 'resuelta';

interface Alert {
  id: number;
  severity: AlertSeverity;
  title: string;
  description: string;
  product: string;
  sku: string;
  date: string;
  status: AlertStatus;
}

const initialAlerts: Alert[] = [
  { id: 1, severity: 'critica', title: 'Sin stock', description: 'El producto ha agotado su inventario. Se requiere reposición inmediata.', product: 'Mouse Inalámbrico', sku: 'MOU-003', date: '2026-07-14 08:00', status: 'activa' },
  { id: 2, severity: 'advertencia', title: 'Stock bajo', description: 'El nivel de stock está por debajo del punto de reorden (15 uds.). Nivel actual: 12.', product: 'Monitor 27" 4K', sku: 'MON-027', date: '2026-07-14 07:30', status: 'activa' },
  { id: 3, severity: 'advertencia', title: 'Stock bajo', description: 'El nivel de stock está por debajo del punto de reorden (10 uds.). Nivel actual: 8.', product: 'Webcam 1080p', sku: 'CAM-002', date: '2026-07-13 22:15', status: 'activa' },
  { id: 4, severity: 'advertencia', title: 'Stock bajo', description: 'El nivel de stock está por debajo del punto de reorden (8 uds.). Nivel actual: 5.', product: 'Silla Ergonómica', sku: 'SIL-001', date: '2026-07-13 18:40', status: 'activa' },
  { id: 5, severity: 'info', title: 'Movimiento inusual', description: 'Se registraron 50 salidas en menos de 2 horas, fuera del patrón habitual.', product: 'Hub USB-C 7 puertos', sku: 'HUB-004', date: '2026-07-13 14:20', status: 'activa' },
  { id: 6, severity: 'critica', title: 'Sin stock', description: 'Producto agotado resuelto — reposición de 50 unidades registrada.', product: 'Auriculares Noise-Cancel', sku: 'AUR-007', date: '2026-07-12 10:00', status: 'resuelta' },
  { id: 7, severity: 'advertencia', title: 'Stock bajo', description: 'Stock repuesto a 84 unidades. Alerta cerrada.', product: 'Teclado Mecánico RGB', sku: 'TEC-001', date: '2026-07-11 09:00', status: 'resuelta' },
];

const severityConfig = {
  critica: {
    label: 'Crítica',
    icon: XCircle,
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    iconColor: 'text-red-500',
    borderColor: 'border-l-red-500',
    bg: 'bg-red-50',
  },
  advertencia: {
    label: 'Advertencia',
    icon: AlertTriangle,
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    iconColor: 'text-amber-500',
    borderColor: 'border-l-amber-500',
    bg: 'bg-amber-50',
  },
  info: {
    label: 'Información',
    icon: Info,
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    iconColor: 'text-blue-500',
    borderColor: 'border-l-blue-500',
    bg: 'bg-blue-50',
  },
};

export function AlertasPage() {
  const { user } = useAuth();
  const isSuperuser = user?.role === 'superuser';
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [filterStatus, setFilterStatus] = useState<'all' | 'activa' | 'resuelta'>('activa');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const resolve = (id: number) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'resuelta' as AlertStatus } : a))
    );
  };

  const active = alerts.filter(a => a.status === 'activa');
  const critical = active.filter(a => a.severity === 'critica').length;
  const warnings = active.filter(a => a.severity === 'advertencia').length;
  const infos = active.filter(a => a.severity === 'info').length;

  const filtered = alerts.filter(a => {
    const matchesStatus = filterStatus === 'all' || a.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || a.severity === filterSeverity;
    return matchesStatus && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas</h1>
          <p className="text-muted-foreground mt-1">
            {active.length > 0
              ? `${active.length} alerta${active.length !== 1 ? 's' : ''} activa${active.length !== 1 ? 's' : ''} requieren atención`
              : 'Sin alertas activas'}
          </p>
        </div>
        {active.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Todo en orden</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
            <Bell className="h-4 w-4" />
            <span className="text-sm font-medium">{active.length} activas</span>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-3xl font-bold text-foreground">{active.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Alertas activas</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-3xl font-bold text-red-600">{critical}</p>
            <p className="text-sm text-muted-foreground mt-1">Críticas</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-3xl font-bold text-amber-600">{warnings}</p>
            <p className="text-sm text-muted-foreground mt-1">Advertencias</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardContent className="pt-5 pb-4">
            <p className="text-3xl font-bold text-blue-600">{infos}</p>
            <p className="text-sm text-muted-foreground mt-1">Informativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts list */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground">Listado de alertas</CardTitle>
          <CardDescription>Notificaciones del sistema sobre el estado del inventario</CardDescription>
          <div className="flex gap-3 mt-3 flex-wrap">
            <div className="flex rounded-lg border border-border overflow-hidden text-sm">
              {(['activa', 'all', 'resuelta'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    filterStatus === s
                      ? 'bg-secondary text-white'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {s === 'activa' ? 'Activas' : s === 'resuelta' ? 'Resueltas' : 'Todas'}
                </button>
              ))}
            </div>
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-1.5 bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas las severidades</option>
              <option value="critica">Críticas</option>
              <option value="advertencia">Advertencias</option>
              <option value="info">Informativas</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BellOff className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No hay alertas en esta categoría</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(alert => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;
                const isResolved = alert.status === 'resuelta';
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border border-l-4 transition-colors ${config.borderColor} ${
                      isResolved
                        ? 'border-border bg-muted/20 opacity-60'
                        : 'border-border hover:bg-muted/20'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{alert.title}</p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.badgeClass}`}
                            >
                              {config.label}
                            </span>
                            {isResolved && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3" />
                                Resuelta
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{alert.description}</p>
                        </div>

                        {!isResolved && isSuperuser && (
                          <Button
                            size="sm"
                            onClick={() => resolve(alert.id)}
                            className="bg-primary hover:bg-primary/90 text-white shrink-0 gap-1.5"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Resolver
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {alert.product}
                          <span className="font-mono tracking-tight">({alert.sku})</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {alert.date}
                        </span>
                        {!isResolved && (
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <ChevronRight className="h-3 w-3" />
                            Requiere acción
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {filtered.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
              Mostrando {filtered.length} de {alerts.length} alertas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
