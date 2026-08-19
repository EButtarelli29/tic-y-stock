import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Package, AlertCircle, ShieldCheck, User } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'user' | 'superuser'>('user');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name, role);
      navigate('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Package className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold text-secondary">Tic &amp; Stock</span>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-foreground">Crear cuenta</CardTitle>
            <CardDescription>Completa tus datos para comenzar a gestionar tu inventario</CardDescription>
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
                <Label htmlFor="name" className="text-foreground font-medium">Nombre completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-input-background border-border focus-visible:ring-primary"
                  required
                />
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-foreground font-medium">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mín. 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input-background border-border focus-visible:ring-primary"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-foreground font-medium">Confirmar</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repite la contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-input-background border-border focus-visible:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Role selection */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium">Tipo de cuenta</Label>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as 'user' | 'superuser')}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="user"
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      role === 'user'
                        ? 'border-primary bg-accent'
                        : 'border-border bg-input-background hover:border-border/60'
                    }`}
                  >
                    <RadioGroupItem value="user" id="user" className="sr-only" />
                    <User className={`h-5 w-5 ${role === 'user' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className={`text-sm font-medium ${role === 'user' ? 'text-accent-foreground' : 'text-foreground'}`}>
                        Usuario
                      </p>
                      <p className="text-xs text-muted-foreground">Acceso básico</p>
                    </div>
                  </label>
                  <label
                    htmlFor="superuser"
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      role === 'superuser'
                        ? 'border-primary bg-accent'
                        : 'border-border bg-input-background hover:border-border/60'
                    }`}
                  >
                    <RadioGroupItem value="superuser" id="superuser" className="sr-only" />
                    <ShieldCheck className={`h-5 w-5 ${role === 'superuser' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className={`text-sm font-medium ${role === 'superuser' ? 'text-accent-foreground' : 'text-foreground'}`}>
                        Superusuario
                      </p>
                      <p className="text-xs text-muted-foreground">Acceso completo</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
                disabled={isLoading}
              >
                {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Inicia sesión
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
