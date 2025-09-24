import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react-native';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error?: Error | null;
};

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error } as AppErrorBoundaryState;
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Add breadcrumb for context
    Sentry.addBreadcrumb({
      category: 'error-boundary',
      message: 'Uncaught error in component',
      level: 'error',
      data: {
        componentStack: info.componentStack,
      },
    });

    // Capture the exception with Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: info.componentStack,
      },
    });

    // Also log locally
    logger.error('[AppErrorBoundary] Uncaught error:', { error, info });

    if (this.props.onError) {
      try {
        this.props.onError(error, info);
      } catch (onErrorError) {
        // Prevent recursive error loops if onError throws
        logger.error('[AppErrorBoundary] Error in onError callback:', { error: onErrorError });
        Sentry.captureException(onErrorError, {
          extra: {
            context: 'AppErrorBoundary.onError',
            originalError: error,
          },
        });
      }
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          {this.state.error?.message ? (
            <Text style={styles.message} numberOfLines={3}>
              {this.state.error.message}
            </Text>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8F8F8',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FF4500',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default AppErrorBoundary;