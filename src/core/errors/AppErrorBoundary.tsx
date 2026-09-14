import React, {
  ErrorInfo,
  PropsWithChildren,
} from 'react';

import {
  diagnosticsService,
} from '../diagnostics/DiagnosticsService';
import { AppErrorFallback } from './AppErrorFallback';

type State = {
  failed: boolean;
  recoveryKey: number;
  errorReference: string | null;
};

export class AppErrorBoundary
  extends React.Component<
    PropsWithChildren,
    State
  >
{
  state: State = {
    failed: false,
    recoveryKey: 0,
    errorReference: null,
  };

  static getDerivedStateFromError():
    Partial<State> {
    return {
      failed: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: ErrorInfo,
  ): void {
    const reference =
      `ui-${Date.now().toString(36)}`;

    diagnosticsService.record(
      'error-boundary',
      `${reference}:${error.name}:${error.message}:${info.componentStack ?? ''}`,
      'error',
    );

    this.setState({
      errorReference: reference,
    });
  }

  private retry = (): void => {
    this.setState(
      (current) => ({
        failed: false,
        recoveryKey:
          current.recoveryKey + 1,
        errorReference: null,
      }),
    );
  };

  render() {
    if (this.state.failed) {
      return (
        <AppErrorFallback
          errorReference={
            this.state.errorReference
          }
          onRetry={this.retry}
        />
      );
    }

    return (
      <React.Fragment
        key={this.state.recoveryKey}
      >
        {this.props.children}
      </React.Fragment>
    );
  }
}
