import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth';

export default function Index() {
  const { user } = useAuthStore();

  return <Redirect href={user ? '/(app)/dashboard' : '/(auth)/login'} />;
}
