import { Stack } from 'expo-router';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  // TEMP: Always clear session on app start for testing
  useEffect(() => {
    AsyncStorage.removeItem('userData');
  }, []);

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData && pathname !== '/LoginScreen') {
        router.replace('/LoginScreen');
      } else if (userData && (pathname === '/' || pathname === '/LoginScreen')) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="LoginScreen" />
      </Stack>
    </SafeAreaProvider>
  );
}
