import React, {
  ErrorInfo,
  PropsWithChildren,
} from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  diagnosticsService,
} from '../diagnostics/DiagnosticsService';

type State = {
  failed: boolean;

  recoveryKey:
    number;

  errorReference:
    string | null;
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

    errorReference:
      null,
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
      `ui-${Date.now()
        .toString(36)}`;

    diagnosticsService.record(
      'error-boundary',
      `${reference}:${error.name}:${error.message}:${info.componentStack ?? ''}`,
      'error',
    );

    this.setState({
      errorReference:
        reference,
    });
  }

  private retry = (): void => {
    this.setState(
      (current) => ({
        failed: false,

        recoveryKey:
          current
            .recoveryKey + 1,

        errorReference:
          null,
      }),
    );
  };

  render() {
    if (this.state.failed) {
      return (
        <View
          style={
            styles.container
          }
        >
          <Text
            style={
              styles.title
            }
          >
            MUDRIK encountered an interface error
          </Text>

          <Text
            style={
              styles.body
            }
          >
            The application core can be restarted safely.
          </Text>

          {this.state
            .errorReference && (
            <Text
              selectable
              style={
                styles.reference
              }
            >
              Reference:{' '}
              {
                this.state
                  .errorReference
              }
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restart application interface"
            onPress={
              this.retry
            }
            style={
              styles.button
            }
          >
            <Text
              style={
                styles.buttonText
              }
            >
              Retry
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <React.Fragment
        key={
          this.state
            .recoveryKey
        }
      >
        {this.props.children}
      </React.Fragment>
    );
  }
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent:
        'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor:
        '#0B0C0F',
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

    reference: {
      marginTop: 12,
      color: '#A5AAB4',
      fontSize: 11,
    },

    button: {
      marginTop: 22,
      minHeight: 44,
      paddingHorizontal: 22,
      justifyContent:
        'center',
      borderRadius: 22,
      backgroundColor:
        '#4295F5',
    },

    buttonText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
