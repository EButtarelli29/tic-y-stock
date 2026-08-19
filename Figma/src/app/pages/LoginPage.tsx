import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel — Azul TIC */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-white tracking-wide">Tic &amp; Stock</span>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Control total de tu inventario, en un solo lugar.
          </h2>
          <p className="text-white/60 text-lg leading-relaxed">
            Gestiona existencias, genera reportes y coordina tu equipo con una plataforma diseñada para la eficiencia.
          </p>
        </div>
        <div className="flex gap-8 text-white/50 text-sm">
          <div>
            <p className="text-2xl font-bold text-primary">10K+</p>
            <p>Usuarios activos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">5M+</p>
            <p>Productos gestionados</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">99.9%</p>
            <p>Uptime</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <Package className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold text-secondary">Tic &amp; Stock</span>
          </div>

          <Card className="border-border shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl text-foreground">Bienvenido de vuelta</CardTitle>
              <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-foreground font-medium">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-input-background border-border focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-foreground font-medium">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input-background border-border focus-visible:ring-primary"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4 pt-2">
                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
                  disabled={isLoading}
                >
                  {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  ¿No tienes cuenta?{' '}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    Regístrate
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
