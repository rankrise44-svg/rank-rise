import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Layout';
import { ROUTES } from '../config/site';

export function NotFoundPage() {
  return (
    <Container>
      <div className="flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
        <span className="font-mono text-[13px] tracking-[0.1em] text-text-subtle">404</span>
        <h1 className="mt-4 text-h1 font-bold text-text">Page not found</h1>
        <p className="mt-4 max-w-md text-body text-text-muted">
          That page doesn't exist. It may have moved when the site was reorganised.
        </p>
        <div className="mt-8 flex gap-3">
          <Button to={ROUTES.home} variant="primary">
            Back to home
          </Button>
          <Button to={ROUTES.markets} variant="secondary">
            Browse markets
          </Button>
        </div>
      </div>
    </Container>
  );
}
