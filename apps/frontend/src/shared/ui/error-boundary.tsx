import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcwIcon } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Uncaught render error', error, info);
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback(error, this.reset);
      }
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-12 text-center"
        >
          <p className="font-medium">Что-то пошло не так</p>
          <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" size="sm" onClick={this.reset}>
            <RotateCcwIcon />
            Попробовать снова
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
