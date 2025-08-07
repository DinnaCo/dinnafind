import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { OTPScreen } from '@/components/screens/OTPScreen';

export default function OTPPage() {
  const { email } = useLocalSearchParams<{ email: string }>();

  if (!email) {
    return null; // or redirect to password reset
  }

  return <OTPScreen email={email} />;
}
