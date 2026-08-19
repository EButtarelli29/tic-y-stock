import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Package,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  FileText,
  Settings,
} from 'lucide-react';

const stockItems = [
  { id: 1, name: 'Producto A', quantity: 150, status: 'in-stock', reorderLevel: 50, lastUpdated: 'Hace 2 horas' },
  { id: 2, name: 'Producto B', quantity: 25, status: 'low-stock', reorderLevel: 30, lastUpdated: 'Hace 5 horas' },
  { id: 3, name: 'Producto C', quantity: 0, status: 'out-of-stock', reorderLevel: 20, lastUpdated: 'Hace 1 día' },
  { id: 4, name: 'Producto D', quantity: 300, status: 'in-stock', reorderLevel: 100, lastUpdated: 'Hace 30 min' },
  { id: 5, name: 'Producto E', quantity: 45, status: 'low-stock', reorderLevel: 50, lastUpdated: 'Hace 3 horas' },
];

const superuserStats = [
  { label: 'Total Productos', value: '1,234', icon: Package, trend: '+12%', trendUp: true },
  { label: 'Usuarios activos', value: '89', icon: Users, trend: '+5', trendUp: true },
  { label: 'Stock bajo', value: '23', icon: AlertTriangle, trend: '+3', trendUp: false },
  { label: 'Valor total', value: '$125,430', icon: BarChart3, trend: '+8.2%', trendUp: true },
];

const userStats = [
  { label: 'Mis productos', value: '45', icon: Package, trend: '+3', trendUp: true },
  { label: 'En stock', value: '38', icon: CheckCircle2, trend: '85%', trendUp: true },
  { label: 'Stock bajo', value: '5', icon: AlertTriangle, trend: '11%', trendUp: false },
  { label: 'Sin stock', value: '2', icon: XCircle, trend: '4%', trendUp: false },
];

const statusConfig = {
  'in-stock': { label: 'En stock', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'low-stock': { label: 'Stock bajo', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  'out-of-stock': { label: 'Sin stock', className: 'bg-red-100 text-red-700 border-red-200' },
};

export function HomePage() {
  const { user } = useAuth();
  const isSuperuser = user?.role === 'superuser';
  const stats = isSuperuser ? superuserStats : userStats;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Hola, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isSuperuser
              ? 'Vista general del sistema de inventario'
              : 'Resumen de tu inventario asignado'}
          </p>
        </div>
        <Badge
          className={`px-3 py-1.5 text-sm font-semibold ${
            isSuperuser
              ? 'bg-secondary text-secondary-foreground'
              : 'bg-accent text-accent-foreground border border-primary/30'
          }`}
        >
          {isSuperuser ? 'Superusuario' : 'Usuario'}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Icon className="h-4 w-4 text-secondary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {stat.trendUp ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.trendUp ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                    {stat.trend}
                  </span>
                  <span>desde el mes pasado</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stock Items Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Artículos recientes</CardTitle>
              <CardDescription className="mt-1">
                {isSuperuser ? 'Todos los artículos del sistema' : 'Tus artículos asignados'}
              </CardDescription>
            </div>
            {isSuperuser && (
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" size="sm">
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {stockItems.map((item) => {
              const config = statusConfig[item.status as keyof typeof statusConfig];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <Package className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{item.lastUpdated}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{item.quantity} uds.</p>
                      <p className="text-xs text-muted-foreground">Reorden: {item.reorderLevel}</p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border min-w-[90px] justify-center ${config.className}`}
                    >
                      {config.label}
                    </span>
                    {isSuperuser && (
                      <Button variant="outline" size="sm" className="border-secondary/30 text-secondary hover:bg-secondary/5">
                        Gestionar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions — superuser only */}
      {isSuperuser && (
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-foreground">Acciones rápidas</CardTitle>
            <CardDescription>Tareas administrativas frecuentes</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Button
                variant="outline"
                className="justify-start h-auto py-4 px-4 border-border hover:border-primary/40 hover:bg-accent group"
              >
                <Plus className="h-5 w-5 text-primary mr-3 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Nuevo producto</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Crear artículo de inventario</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-4 px-4 border-border hover:border-primary/40 hover:bg-accent group"
              >
                <Users className="h-5 w-5 text-primary mr-3 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Gestionar usuarios</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ver y editar cuentas</p>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-4 px-4 border-border hover:border-primary/40 hover:bg-accent group"
              >
                <FileText className="h-5 w-5 text-primary mr-3 group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="font-medium text-foreground">Generar reporte</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Exportar datos de inventario</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
