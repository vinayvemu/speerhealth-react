import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  defaultDataIdFromObject,
  type Reference,
} from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';
import { authLink } from './links/authLink';
import { errorLink } from './links/errorLink';

const httpLink = createHttpLink({
  uri: `${import.meta.env.VITE_SUPABASE_URL}/graphql/v1`,
});

export const cache = new InMemoryCache({
  dataIdFromObject(responseObject) {
    // pg_graphql uses nodeId as the global unique identifier
    if ('nodeId' in responseObject && typeof responseObject.nodeId === 'string') {
      return responseObject.nodeId;
    }
    return defaultDataIdFromObject(responseObject);
  },
  typePolicies: {
    Query: {
      fields: {
        insightsCollection: relayStylePagination(['filter', 'orderBy']),
        insightActivitiesCollection: relayStylePagination(['filter', 'orderBy']),
      },
    },
    Insights: {
      fields: {
        insightTagsCollection: { merge: (_existing: Reference[], incoming: Reference[]) => incoming },
        // Derive `tags` from the junction table so all components can use insight.tags directly
        tags: {
          read(_: unknown, { readField }) {
            const collection = readField<{ edges: Array<{ node: { tag: { id: string; name: string } } }> }>('insightTagsCollection');
            return collection?.edges?.map((e) => e.node.tag) ?? [];
          },
        },
      },
    },
  },
});

export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink).concat(httpLink),
  cache,
  defaultOptions: {
    watchQuery: { errorPolicy: 'all' },
    query: { errorPolicy: 'all' },
  },
});
