import { lazy, Suspense } from 'react';
import { useView } from './lib/route';
import Home from './pages/Home';

const Portal = lazy(() => import('./pages/Portal'));

export default function App() {
  const view = useView();
  if (view === 'portal')
    return (
      <Suspense fallback={null}>
        <Portal />
      </Suspense>
    );
  return <Home />;
}
