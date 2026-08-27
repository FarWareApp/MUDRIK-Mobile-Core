import React, { ErrorInfo, PropsWithChildren } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { diagnosticsService } from '../diagnostics/DiagnosticsService';

type State = {
  failed: boolean;
};

export class AppErrorBoundary extends React.Component<
  PropsWithChildren,
  State
> {
  state: State = {
    failed: false,
  };

  static getDerivedStateFromError(): State {
    return {
      failed: true,
    };
  }

  componentDidCatch(
    error: Error,
    info: ErrorInfo,
  ): void {
    diagnosticsService.record(
      'error-boundary',
      `${error.name}:${error.message}:${info.componentStack ?? ''}`,
      'error',
    );
  }

  private retry = (): void => {
    this.setState({
      failed: false,
    });
  };

  render() {
    if (this.state.failed) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>
            MUDRIK encountered an interface error
          </Text>

          <Text style={styles.body}>
            The application core is still running.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={this.retry}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0B0C0F',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },

  body: {
    marginTop: 10,
    color: '#A5AAB4',
    fontSize: 15,
    textAlign: 'center',
  },

  button: {
    marginTop: 22,
    minHeight: 44,
    paddingHorizontal: 22,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#4295F5',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
