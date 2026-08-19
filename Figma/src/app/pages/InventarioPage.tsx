import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Package,
  Search,
  Plus,
  Filter,
  ChevronUp,
  ChevronDown,
  Edit2,
  Trash2,
} from 'lucide-react';

type SortField = 'name' | 'quantity' | 'category';
type SortDir = 'asc' | 'desc';

const products = [
  { id: 1, name: 'Teclado Mecánico RGB', sku: 'TEC-001', category: 'Periféricos', quantity: 84, reorderLevel: 20, unitPrice: 89.99, status: 'in-stock' },
  { id: 2, name: 'Monitor 27" 4K', sku: 'MON-027', category: 'Pantallas', quantity: 12, reorderLevel: 15, unitPrice: 499.00, status: 'low-stock' },
  { id: 3, name: 'Mouse Inalámbrico', sku: 'MOU-003', category: 'Periféricos', quantity: 0, reorderLevel: 25, unitPrice: 34.50, status: 'out-of-stock' },
  { id: 4, name: 'Auriculares Noise-Cancel', sku: 'AUR-007', category: 'Audio', quantity: 47, reorderLevel: 10, unitPrice: 199.99, status: 'in-stock' },
  { id: 5, name: 'Webcam 1080p', sku: 'CAM-002', category: 'Video', quantity: 8, reorderLevel: 10, unitPrice: 79.00, status: 'low-stock' },
  { id: 6, name: 'Hub USB-C 7 puertos', sku: 'HUB-004', category: 'Conectividad', quantity: 156, reorderLevel: 30, unitPrice: 45.00, status: 'in-stock' },
  { id: 7, name: 'SSD NVMe 1TB', sku: 'SSD-010', category: 'Almacenamiento', quantity: 63, reorderLevel: 20, unitPrice: 119.00, status: 'in-stock' },
  { id: 8, name: 'Silla Ergonómica', sku: 'SIL-001', category: 'Mobiliario', quantity: 5, reorderLevel: 8, unitPrice: 350.00, status: 'low-stock' },
];

const statusConfig = {
  'in-stock': { label: 'En stock', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'low-stock': { label: 'Stock bajo', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  'out-of-stock': { label: 'Sin stock', className: 'bg-red-100 text-red-700 border-red-200' },
};

const summaryCards = [
  { label: 'Total artículos', value: products.length, color: 'text-secondary' },
  { label: 'En stock', value: products.filter(p => p.status === 'in-stock').length, color: 'text-emerald-600' },
  { label: 'Stock bajo', value: products.filter(p => p.status === 'low-stock').length, color: 'text-amber-600' },
  { label: 'Sin stock', value: products.filter(p => p.status === 'out-of-stock').length, color: 'text-red-600' },
];

export function InventarioPage() {
  const { user } = useAuth();
  const isSuperuser = user?.role === 'superuser';
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = products
    .filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return mult * a.name.localeCompare(b.name);
      if (sortField === 'quantity') return mult * (a.quantity - b.quantity);
      if (sortField === 'category') return mult * a.category.localeCompare(b.category);
      return 0;
    });

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field ? (
      sortDir === 'asc' ? (
        <ChevronUp className="h-3.5 w-3.5 text-primary inline ml-1" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 text-primary inline ml-1" />
      )
    ) : (
      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40 inline ml-1" />
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
          <p className="text-muted-foreground mt-1">Gestiona todos los productos del almacén</p>
        </div>
        {isSuperuser && (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="h-4 w-4" />
            Nuevo producto
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(card => (
          <Card key={card.label} className="border-border shadow-sm">
            <CardContent className="pt-5 pb-4">
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, SKU o categoría..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-input-background border-border focus-visible:ring-primary"
              />
            </div>
            {/* Status filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-sm border border-border rounded-md px-3 py-2 bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Todos</option>
                <option value="in-stock">En stock</option>
                <option value="low-stock">Stock bajo</option>
                <option value="out-of-stock">Sin stock</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    <button onClick={() => handleSort('name')} className="hover:text-foreground flex items-center">
                      Producto <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                    <button onClick={() => handleSort('category')} className="hover:text-foreground flex items-center">
                      Categoría <SortIcon field="category" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    <button onClick={() => handleSort('quantity')} className="hover:text-foreground flex items-center ml-auto">
                      Cantidad <SortIcon field="quantity" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Precio unit.</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  {isSuperuser && (
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p>No se encontraron productos</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((product, i) => {
                    const config = statusConfig[product.status as keyof typeof statusConfig];
                    return (
                      <tr
                        key={product.id}
                        className={`border-b border-border hover:bg-muted/30 transition-colors ${
                          i === filtered.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-secondary/10 rounded">
                              <Package className="h-3.5 w-3.5 text-secondary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{product.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell">
                          {product.category}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-semibold text-foreground font-mono">{product.quantity}</span>
                          <span className="text-xs text-muted-foreground ml-1">uds.</span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-foreground hidden sm:table-cell font-mono">
                          ${product.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
                          >
                            {config.label}
                          </span>
                        </td>
                        {isSuperuser && (
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-secondary">
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
              Mostrando {filtered.length} de {products.length} productos
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
