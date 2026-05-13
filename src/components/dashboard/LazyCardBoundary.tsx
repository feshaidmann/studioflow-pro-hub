import { Component, Suspense, type ReactNode, type ErrorInfo } from "react";
import { AlertCircle, RefreshCw, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface LazyCardBoundaryProps {
  title: string;
  icon?: LucideIcon;
  minHeight?: string;
  children: ReactNode;
}

function isChunkError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  return /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk \d+ failed/i.test(
    msg
  );
}

function CardLoadingSkeleton({
  title,
  icon: Icon,
  minHeight,
}: {
  title: string;
  icon?: LucideIcon;
  minHeight?: string;
}) {
  return (
    <Card
      className="glass-card animate-fade-in"
      style={minHeight ? { minHeight } : undefined}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`Carregando ${title}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          <span className="text-muted-foreground">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <span className="sr-only">Carregando {title}…</span>
      </CardContent>
    </Card>
  );
}

function CardErrorState({
  title,
  icon: Icon,
  error,
  onRetry,
}: {
  title: string;
  icon?: LucideIcon;
  error: unknown;
  onRetry: () => void;
}) {
  const chunkErr = isChunkError(error);
  const description = chunkErr
    ? "Não conseguimos baixar esta parte do app. Verifique sua conexão."
    : "Algo deu errado ao buscar esta seção. Tente novamente.";

  return (
    <Card className="glass-card animate-fade-in border-destructive/30" role="alert">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
          <span>Não foi possível carregar {title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
          {description}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            aria-label={`Tentar carregar ${title} novamente`}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Tentar novamente
          </Button>
          {chunkErr && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.location.reload()}
              aria-label="Recarregar página"
            >
              Recarregar página
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface BoundaryState {
  error: unknown | null;
}

interface InnerBoundaryProps {
  title: string;
  icon?: LucideIcon;
  onRetry: () => void;
  children: ReactNode;
}

class InnerErrorBoundary extends Component<InnerBoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[LazyCardBoundary:${this.props.title}]`, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <CardErrorState
          title={this.props.title}
          icon={this.props.icon}
          error={this.state.error}
          onRetry={() => {
            this.setState({ error: null });
            this.props.onRetry();
          }}
        />
      );
    }
    return this.props.children;
  }
}

export default function LazyCardBoundary({
  title,
  icon,
  minHeight,
  children,
}: LazyCardBoundaryProps) {
  return (
    <RetryWrapper title={title} icon={icon} minHeight={minHeight}>
      {children}
    </RetryWrapper>
  );
}

function RetryWrapper({
  title,
  icon,
  minHeight,
  children,
}: LazyCardBoundaryProps) {
  return (
    <RetryStateful title={title} icon={icon} minHeight={minHeight}>
      {children}
    </RetryStateful>
  );
}

class RetryStateful extends Component<LazyCardBoundaryProps, { retryKey: number }> {
  state = { retryKey: 0 };
  handleRetry = () => this.setState((s) => ({ retryKey: s.retryKey + 1 }));
  render() {
    const { title, icon, minHeight, children } = this.props;
    return (
      <InnerErrorBoundary
        key={this.state.retryKey}
        title={title}
        icon={icon}
        onRetry={this.handleRetry}
      >
        <Suspense
          fallback={<CardLoadingSkeleton title={title} icon={icon} minHeight={minHeight} />}
        >
          {children}
        </Suspense>
      </InnerErrorBoundary>
    );
  }
}
