import { gql } from '@apollo/client';

export const GET_INSIGHT_ACTIVITIES = gql`
  query GetInsightActivities($insightId: UUID!) {
    insightActivitiesCollection(
      filter: { insightId: { eq: $insightId } }
      orderBy: [{ createdAt: DescNullsLast }]
      first: 20
    ) {
      edges {
        node {
          nodeId
          id
          insightId
          userId
          action
          fieldName
          oldValue
          newValue
          createdAt
        }
      }
    }
  }
`;

export const SEARCH_HCPS = gql`
  query SearchHCPs($search: String!) {
    hcpsCollection(
      filter: { name: { ilike: $search } }
      first: 10
    ) {
      edges {
        node {
          nodeId
          id
          name
          specialty
          institution
        }
      }
    }
  }
`;
