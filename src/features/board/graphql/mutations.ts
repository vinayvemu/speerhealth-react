import { gql } from '@apollo/client';
import { INSIGHT_CARD_FRAGMENT } from './queries';

export const CREATE_INSIGHT = gql`
  ${INSIGHT_CARD_FRAGMENT}
  mutation CreateInsight($objects: [InsightsInsertInput!]!) {
    insertIntoInsightsCollection(objects: $objects) {
      affectedCount
      records {
        ...InsightCard
      }
    }
  }
`;

export const UPDATE_INSIGHT = gql`
  ${INSIGHT_CARD_FRAGMENT}
  mutation UpdateInsight($filter: InsightsFilter!, $set: InsightsUpdateInput!) {
    updateInsightsCollection(filter: $filter, set: $set) {
      affectedCount
      records {
        ...InsightCard
      }
    }
  }
`;

export const DELETE_INSIGHT = gql`
  mutation DeleteInsight($filter: InsightsFilter!) {
    deleteFromInsightsCollection(filter: $filter) {
      affectedCount
      records { id }
    }
  }
`;

export const LOG_ACTIVITY = gql`
  mutation LogActivity($objects: [InsightActivitiesInsertInput!]!) {
    insertIntoInsightActivitiesCollection(objects: $objects) {
      affectedCount
      records {
        id
      }
    }
  }
`;
