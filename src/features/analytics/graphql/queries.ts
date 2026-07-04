import { gql } from '@apollo/client';

export const GET_KPI_COUNTS = gql`
  query GetKpiCounts($dateFrom: Datetime, $dateTo: Datetime) {
    total: insightsCollection { totalCount }
    observation: insightsCollection(filter: { stage: { eq: "observation" } }) { totalCount }
    insight: insightsCollection(filter: { stage: { eq: "insight" } }) { totalCount }
    actionable: insightsCollection(filter: { stage: { eq: "actionable" } }) { totalCount }
    impact: insightsCollection(filter: { stage: { eq: "impact" } }) { totalCount }
    previousWeek: insightsCollection(filter: {
      createdAt: { gte: $dateFrom, lte: $dateTo }
    }) { totalCount }
  }
`;

export const GET_ALL_INSIGHTS_FOR_ANALYTICS = gql`
  query GetAllInsightsForAnalytics($cursor: Cursor, $filter: InsightsFilter) {
    insightsCollection(
      first: 30
      after: $cursor
      filter: $filter
      orderBy: [{ createdAt: DescNullsLast }]
    ) {
      edges {
        node {
          id
          title
          stage
          priority
          createdAt
          updatedAt
          drugName
          hcp { id name }
          category { id name }
        }
      }
      pageInfo { hasNextPage endCursor }
      totalCount
    }
  }
`;
