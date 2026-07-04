import { gql } from '@apollo/client';

export const INSIGHT_CARD_FRAGMENT = gql`
  fragment InsightCard on Insights {
    nodeId
    id
    title
    description
    stage
    priority
    columnOrder
    drugName
    customFields
    createdAt
    updatedAt
    createdBy
    hcp {
      nodeId
      id
      name
      specialty
      institution
    }
    category {
      nodeId
      id
      name
      color
    }
    insightTagsCollection {
      edges {
        node {
          tag {
            id
            name
          }
        }
      }
    }
  }
`;

export const LIST_INSIGHTS = gql`
  ${INSIGHT_CARD_FRAGMENT}
  query ListInsights($cursor: Cursor, $filter: InsightsFilter, $first: Int) {
    insightsCollection(
      first: $first
      after: $cursor
      filter: $filter
      orderBy: [{ columnOrder: AscNullsLast }, { createdAt: DescNullsLast }]
    ) {
      edges {
        node {
          ...InsightCard
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_STAGE_COUNTS = gql`
  query GetStageCounts {
    observation: insightsCollection(filter: { stage: { eq: "observation" } }) { totalCount }
    insight: insightsCollection(filter: { stage: { eq: "insight" } }) { totalCount }
    actionable: insightsCollection(filter: { stage: { eq: "actionable" } }) { totalCount }
    impact: insightsCollection(filter: { stage: { eq: "impact" } }) { totalCount }
  }
`;

export const GET_HCPS = gql`
  query GetHCPs($filter: HcpsFilter) {
    hcpsCollection(filter: $filter, first: 20) {
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

export const GET_CATEGORIES = gql`
  query GetCategories {
    categoriesCollection {
      edges {
        node {
          nodeId
          id
          name
          color
        }
      }
    }
  }
`;

export const GET_TAGS = gql`
  query GetTags {
    tagsCollection {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

export const GET_INSIGHT = gql`
  ${INSIGHT_CARD_FRAGMENT}
  query GetInsight($id: UUID!) {
    insightsCollection(filter: { id: { eq: $id } }, first: 1) {
      edges {
        node {
          ...InsightCard
        }
      }
    }
  }
`;
