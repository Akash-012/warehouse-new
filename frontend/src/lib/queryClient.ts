import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,   // 30 seconds — data considered fresh
      gcTime: 5 * 60 * 1000,  // 5 minutes — keep unused cache before garbage collection
    },
  },
});

export default queryClient;
