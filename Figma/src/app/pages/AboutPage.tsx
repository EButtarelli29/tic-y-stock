import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Package, Shield, Zap, Users, BarChart3, Clock, Mail, Phone, MapPin } from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Gestión de Inventario',
    description: 'Rastrea y administra niveles de stock en tiempo real con catálogos completos de productos.',
  },
  {
    icon: Shield,
    title: 'Seguro y Confiable',
    description: 'Seguridad de nivel empresarial con control de acceso por roles y cifrado de datos.',
  },
  {
    icon: Zap,
    title: 'Rápido y Eficiente',
    description: 'Alto rendimiento con actualizaciones instantáneas e interfaz completamente responsiva.',
  },
  {
    icon: Users,
    title: 'Trabajo en Equipo',
    description: 'Soporte multiusuario con distintos niveles de permisos para una colaboración fluida.',
  },
  {
    icon: BarChart3,
    title: 'Análisis y Reportes',
    description: 'Obtén insights con reportes detallados y análisis sobre tus datos de inventario.',
  },
  {
    icon: Clock,
    title: 'Actualizaciones en Tiempo Real',
    description: 'Notificaciones instantáneas sobre niveles de stock, pedidos y eventos importantes.',
  },
];

const stats = [
  { label: 'Usuarios activos', value: '10,000+' },
  { label: 'Productos gestionados', value: '5M+' },
  { label: 'Disponibilidad', value: '99.9%' },
  { label: 'Países', value: '50+' },
];

export function AboutPage() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center space-y-4 py-10 px-4">
        <div className="inline-flex items-center gap-3 bg-secondary px-6 py-3 rounded-full mb-2">
          <Package className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-white tracking-wide">Tic &amp; Stock</span>
        </div>
        <h1 className="text-4xl font-bold text-foreground leading-tight">
          La plataforma de inventario para<br />
          <span className="text-primary">negocios modernos</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Diseñada para simplificar la gestión de existencias y empoderar a equipos de cualquier tamaño.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap mt-4">
          {['v2.0', 'Cloud-based', 'Tiempo real', 'Multi-rol'].map((tag) => (
            <span
              key={tag}
              className="text-xs font-medium px-3 py-1 rounded-full bg-accent text-accent-foreground border border-primary/20"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border shadow-sm text-center">
            <CardContent className="pt-6 pb-4">
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mission */}
      <Card className="border-l-4 border-l-primary border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground text-xl">Nuestra misión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed text-base">
            En Tic &amp; Stock creemos que la gestión de inventario debe ser simple, eficiente y accesible para todos.
            Nuestra misión es proveer a las empresas las herramientas necesarias para rastrear, administrar y optimizar
            sus niveles de stock fácilmente. Ya sea una pequeña empresa o una gran corporación, nuestra plataforma
            escala con tus necesidades ofreciendo funciones potentes sin complejidad innecesaria.
          </p>
        </CardContent>
      </Card>

      {/* Features */}
      <div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Características principales</h2>
          <p className="text-muted-foreground">
            Todo lo que necesitas para gestionar tu inventario de forma efectiva
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="border-border shadow-sm hover:shadow-md transition-shadow hover:border-primary/30"
              >
                <CardHeader className="pb-3">
                  <div className="p-2.5 bg-secondary/10 rounded-lg w-fit mb-3">
                    <Icon className="h-5 w-5 text-secondary" />
                  </div>
                  <CardTitle className="text-base text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* About & Contact */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Sobre nosotros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm leading-relaxed">
            <p>
              Fundada en 2020, Tic &amp; Stock ha crecido hasta convertirse en una de las soluciones líderes
              de gestión de inventario en el mercado. Nuestro equipo trabaja incansablemente para que la plataforma
              satisfaga las necesidades cambiantes del negocio moderno.
            </p>
            <p>
              Atendemos clientes en sectores como retail, manufactura, salud y logística. Nuestro compromiso
              con la innovación y la seguridad nos ha ganado la confianza de miles de empresas.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <span className="text-foreground">contacto@ticstock.com</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Phone className="h-4 w-4 text-primary" />
              </div>
              <span className="text-foreground">+1 (555) 123-4567</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <span className="text-foreground">123 Business Ave, Tech City, TC 12345</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
