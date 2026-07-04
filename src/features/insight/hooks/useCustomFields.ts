import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { GET_USER_PREFERENCES, INSERT_USER_PREFERENCES, UPDATE_USER_PREFERENCES } from '../graphql/userPreferences';
import type { CustomFieldDef } from '../types/customFields';

interface PrefsNode {
  nodeId: string;
  id: string;
  userId: string;
  customFieldDefinitions: CustomFieldDef[] | null;
}

interface PrefsData {
  userPreferencesCollection: {
    edges: Array<{ node: PrefsNode }>;
  };
}

export function useCustomFields() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data, loading, refetch } = useQuery<PrefsData>(GET_USER_PREFERENCES, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });

  const [insertPrefs] = useMutation(INSERT_USER_PREFERENCES);
  const [updatePrefs] = useMutation(UPDATE_USER_PREFERENCES);

  const existingNode = useMemo(
    () => data?.userPreferencesCollection?.edges?.[0]?.node ?? null,
    [data],
  );

  const fieldDefs: CustomFieldDef[] = useMemo(() => {
    const raw = existingNode?.customFieldDefinitions;
    if (!raw) return [];
    // pg_graphql may return JSONB as a string — parse if needed
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) as CustomFieldDef[]; } catch { return []; }
    }
    return raw as CustomFieldDef[];
  }, [existingNode]);

  const saveFieldDefs = useCallback(async (defs: CustomFieldDef[]) => {
    // JSONB fields must be passed as a JSON string (pg_graphql requirement)
    const defsJson = JSON.stringify(defs);
    if (existingNode?.nodeId) {
      await updatePrefs({
        variables: { nodeId: existingNode.nodeId, customFieldDefinitions: defsJson },
      });
    } else {
      await insertPrefs({
        variables: { userId, customFieldDefinitions: defsJson },
      });
    }
    // Immediately refresh so the form reflects the new field definitions
    await refetch();
  }, [insertPrefs, updatePrefs, userId, existingNode, refetch]);

  const addField = useCallback(async (def: CustomFieldDef) => {
    await saveFieldDefs([...fieldDefs, def]);
  }, [fieldDefs, saveFieldDefs]);

  const removeField = useCallback(async (id: string) => {
    await saveFieldDefs(fieldDefs.filter((d) => d.id !== id));
  }, [fieldDefs, saveFieldDefs]);

  const updateField = useCallback(async (updated: CustomFieldDef) => {
    await saveFieldDefs(fieldDefs.map((d) => d.id === updated.id ? updated : d));
  }, [fieldDefs, saveFieldDefs]);

  return { fieldDefs, loading, addField, removeField, updateField };
}
