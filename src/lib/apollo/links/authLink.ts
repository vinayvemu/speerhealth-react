import { setContext } from '@apollo/client/link/context';
import { supabase } from '@/lib/supabase/client';

export const authLink = setContext(async (_, { headers }: { headers: Record<string, string> }) => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    headers: {
      ...headers,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
  };
});
