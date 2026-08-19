import { RouterProvider } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { router } from './routes';

export default function App() {
  return (
    <div className="size-full">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </div>
  );
}