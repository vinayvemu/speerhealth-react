import { gql } from '@apollo/client';

export const GET_USER_PREFERENCES = gql`
  query GetUserPreferences($userId: UUID!) {
    userPreferencesCollection(filter: { userId: { eq: $userId } }, first: 1) {
      edges {
        node {
          nodeId
          id
          userId
          customFieldDefinitions
        }
      }
    }
  }
`;

export const INSERT_USER_PREFERENCES = gql`
  mutation InsertUserPreferences($userId: UUID!, $customFieldDefinitions: JSON!) {
    insertIntoUserPreferencesCollection(
      objects: [{ userId: $userId, customFieldDefinitions: $customFieldDefinitions }]
    ) {
      records {
        nodeId
        id
        userId
        customFieldDefinitions
      }
    }
  }
`;

export const UPDATE_USER_PREFERENCES = gql`
  mutation UpdateUserPreferences($nodeId: ID!, $customFieldDefinitions: JSON!) {
    updateUserPreferencesCollection(
      filter: { nodeId: { eq: $nodeId } }
      set: { customFieldDefinitions: $customFieldDefinitions }
    ) {
      records {
        nodeId
        id
        userId
        customFieldDefinitions
      }
    }
  }
`;
