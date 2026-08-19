import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Search,
  Calendar,
  User,
  Package,
  Plus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type MvtType = 'entrada' | 'salida' | 'traslado';

const movements = [
  { id: 1, type: 'entrada' as MvtType, product: 'Teclado Mecánico RGB', sku: 'TEC-001', quantity: 50, user: 'Ana García', date: '2026-07-14 09:30', origin: '—', destination: 'Almacén Principal', note: 'Reposición de stock' },
  { id: 2, type: 'salida' as MvtType, product: 'Monitor 27" 4K', sku: 'MON-027', quantity: 3, user: 'Carlos Ruiz', date: '2026-07-14 08:15', origin: 'Almacén Principal', destination: 'Oficina B', note: 'Equipamiento nuevos empleados' },
  { id: 3, type: 'traslado' as MvtType, product: 'Hub USB-C 7 puertos', sku: 'HUB-004', quantity: 20, user: 'Luis Torres', date: '2026-07-13 16:45', origin: 'Depósito Norte', destination: 'Almacén Principal', note: 'Centralización de stock' },
  { id: 4, type: 'salida' as MvtType, product: 'SSD NVMe 1TB', sku: 'SSD-010', quantity: 5, user: 'María López', date: '2026-07-13 14:00', origin: 'Almacén Principal', destination: 'IT Dept.', note: 'Actualización equipos' },
  { id: 5, type: 'entrada' as MvtType, product: 'Auriculares Noise-Cancel', sku: 'AUR-007', quantity: 30, user: 'Ana García', date: '2026-07-13 11:20', origin: '—', destination: 'Almacén Principal', note: 'Compra proveedor A' },
  { id: 6, type: 'salida' as MvtType, product: 'Mouse Inalámbrico', sku: 'MOU-003', quantity: 8, user: 'Pedro Díaz', date: '2026-07-12 10:00', origin: 'Almacén Principal', destination: 'Ventas', note: 'Despacho pedido #4421' },
  { id: 7, type: 'traslado' as MvtType, product: 'Webcam 1080p', sku: 'CAM-002', quantity: 4, user: 'Luis Torres', date: '2026-07-12 09:15', origin: 'Almacén Principal', destination: 'Sala de Reuniones', note: '' },
  { id: 8, type: 'entrada' as MvtType, product: 'Silla Ergonómica', sku: 'SIL-001', quantity: 10, user: 'Carlos Ruiz', date: '2026-07-11 15:30', origin: '—', destination: 'Depósito Norte', note: 'Pedido #1234 recibido' },
];

const mvtConfig = {
  entrada: {
    label: 'Entrada',
    icon: ArrowDownCircle,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  salida: {
    label: 'Salida',
    icon: ArrowUpCircle,
    className: 'bg-red-100 text-red-700 border-red-200',
    iconColor: 'text-red-500',
    bg: 'bg-red-50',
  },
  traslado: {
    label: 'Traslado',
    icon: ArrowLeftRight,
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    iconColor: 'text-blue-500',
    bg: 'bg-blue-50',
  },
};

const summaryStats = [
  { label: 'Total movimientos', value: movements.length, color: 'text-secondary' },
  { label: 'Entradas', value: movements.filter(m => m.type === 'entrada').length, color: 'text-emerald-600' },
  { label: 'Salidas', value: movements.filter(m => m.type === 'salida').length, color: 'text-red-600' },
  { label: 'Traslados', value: movements.filter(m => m.type === 'traslado').length, color: 'text-blue-600' },
];

export function MovimientosPage() {
  const { user } = useAuth();
  const isSuperuser = user?.role === 'superuser';
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = movements.filter(m => {
    const matchesSearch =
      m.product.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      m.user.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || m.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Movimientos</h1>
          <p className="text-muted-foreground mt-1">Historial de entradas, salidas y traslados</p>
        </div>
        {isSuperuser && (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="h-4 w-4" />
            Registrar movimiento
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map(s => (
          <Card key={s.label} className="border-border shadow-sm">
            <CardContent className="pt-5 pb-4">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Movements list */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-foreground">Registro de movimientos</CardTitle>
          <CardDescription>Ordenado por fecha, más reciente primero</CardDescription>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por producto, SKU o usuario..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-input-background border-border focus-visible:ring-primary"
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-2 bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos los tipos</option>
              <option value="entrada">Entradas</option>
              <option value="salida">Salidas</option>
              <option value="traslado">Traslados</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>No se encontraron movimientos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(mvt => {
                const config = mvtConfig[mvt.type];
                const Icon = config.icon;
                return (
                  <div
                    key={mvt.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`p-2.5 rounded-lg shrink-0 ${config.bg}`}>
                      <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">{mvt.product}</p>
                            <span className="text-xs text-muted-foreground font-mono tracking-tight">{mvt.sku}</span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
                            >
                              {config.label}
                            </span>
                          </div>
                          {mvt.note && (
                            <p className="text-sm text-muted-foreground mt-0.5">{mvt.note}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-foreground text-lg leading-none font-mono">
                            {mvt.type === 'salida' ? '-' : '+'}{mvt.quantity}
                            <span className="text-sm font-normal text-muted-foreground ml-1">uds.</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {mvt.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {mvt.user}
                        </span>
                        {mvt.type !== 'entrada' && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {mvt.origin} → {mvt.destination}
                          </span>
                        )}
                        {mvt.type === 'entrada' && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            Destino: {mvt.destination}
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
              Mostrando {filtered.length} de {movements.length} movimientos
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
