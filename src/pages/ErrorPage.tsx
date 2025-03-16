import { useRouteError } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function ErrorPage() {
  const error = useRouteError() as any;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <AlertTriangle className="w-16 h-16 text-red-600 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Oops! Something went wrong.
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        {error.statusText || error.message}
      </p>
    </div>
  );
}