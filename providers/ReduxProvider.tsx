// packages/mobile/src/providers/ReduxProvider.tsx
import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/hooks/redux';

interface ReduxProviderProps {
  children: React.ReactNode;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  console.log('Rendering ReduxProvider with store:', store);
  return <Provider store={store}>{children}</Provider>;
}
