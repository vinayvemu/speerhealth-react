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

export const INSERT_INSIGHT_TAGS = gql`
  mutation InsertInsightTags($objects: [InsightTagsInsertInput!]!) {
    insertIntoInsightTagsCollection(objects: $objects) {
      affectedCount
    }
  }
`;

export const DELETE_INSIGHT_TAGS = gql`
  mutation DeleteInsightTags($insightId: UUID!) {
    deleteFromInsightTagsCollection(filter: { insightId: { eq: $insightId } }) {
      affectedCount
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
