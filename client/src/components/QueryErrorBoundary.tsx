import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from './ErrorBoundary';

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
}

export function QueryErrorBoundary({ children }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                <p className="text-muted-foreground mb-4">There was an error loading this page</p>
                <button 
                  onClick={reset}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded mr-2"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}