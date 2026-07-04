import { onError } from '@apollo/client/link/error';

export type GraphQLErrorHandler = (message: string) => void;

let globalErrorHandler: GraphQLErrorHandler | null = null;

export function registerErrorHandler(handler: GraphQLErrorHandler): void {
  globalErrorHandler = handler;
}

export const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      console.error('[GraphQL error]', message);
      globalErrorHandler?.(message);
    });
  }
  if (networkError) {
    console.error('[Network error]', networkError);
    globalErrorHandler?.('Network error — please check your connection.');
  }
});
