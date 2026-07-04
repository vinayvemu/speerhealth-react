import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useLazyQuery, useQuery, useApolloClient } from '@apollo/client';
import {
  Box, Typography, MenuItem, Autocomplete, CircularProgress,
  Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip,
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { insightSchema, type InsightFormValues } from '../../schemas/insightSchema';
import { CREATE_INSIGHT, UPDATE_INSIGHT, LOG_ACTIVITY, INSERT_INSIGHT_TAGS, DELETE_INSIGHT_TAGS } from '@/features/board/graphql/mutations';
import { SEARCH_HCPS } from '../../graphql/queries';
import { GET_CATEGORIES, GET_TAGS, GET_INSIGHT, LIST_INSIGHTS } from '@/features/board/graphql/queries';
import type { Insight, HCP, Tag, CategoryRecord } from '@/shared/types/domain';
import { STAGES, STAGE_LABELS } from '@/shared/types/domain';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/shared/components/ui/Toast';
import { echoSuppressor } from '@/lib/supabase/echoSuppression';
import { useConflictResolution } from '@/features/realtime/hooks/useConflictResolution';
import { ConflictModal } from '@/features/realtime/components/ConflictModal/ConflictModal';
import { AppDrawer } from '@/shared/components/ui/AppDrawer';
import { PrimaryButton } from '@/shared/components/ui/PrimaryButton';
import { FormTextField, FormSelect, ITEM_SX } from '@/shared/components/ui/FormFields';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { CustomFieldsSection } from './CustomFieldsSection';
import type { CustomFieldValues } from '../../types/customFields';

interface Props {
  insight?: Insight;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface CategoriesData { categoriesCollection: { edges: Array<{ node: CategoryRecord }> } }
interface TagsData { tagsCollection: { edges: Array<{ node: Tag }> } }
interface HCPsData { hcpsCollection: { edges: Array<{ node: HCP }> } }
interface InsightData { insightsCollection: { edges: Array<{ node: Insight }> } }

export function InsightForm({ insight, open, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const apolloClient = useApolloClient();
  const isEdit = Boolean(insight);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<InsightFormValues | null>(null);
  const parseCustomFields = (raw: unknown): CustomFieldValues => {
    if (!raw) return {};
    if (typeof raw === 'string') { try { return JSON.parse(raw) as CustomFieldValues; } catch { return {}; } }
    return raw as CustomFieldValues;
  };

  const [customFields, setCustomFields] = useState<CustomFieldValues>(
    parseCustomFields(insight?.customFields),
  );

  const { conflict, detectConflict, resolveKeepMine, resolveKeepTheirs, resolveMerge } = useConflictResolution();

  const { data: categoriesData } = useQuery<CategoriesData>(GET_CATEGORIES);
  const { data: tagsData } = useQuery<TagsData>(GET_TAGS);
  const [searchHCPs, { data: hcpData, loading: hcpLoading }] = useLazyQuery<HCPsData>(SEARCH_HCPS);

  const [createInsight] = useMutation(CREATE_INSIGHT);
  const [updateInsight] = useMutation(UPDATE_INSIGHT);
  const [logActivity] = useMutation(LOG_ACTIVITY);
  const [insertTags] = useMutation(INSERT_INSIGHT_TAGS);
  const [deleteTags] = useMutation(DELETE_INSIGHT_TAGS);

  const categories = categoriesData?.categoriesCollection?.edges?.map((e) => e.node) ?? [];
  const allTags = tagsData?.tagsCollection?.edges?.map((e) => e.node) ?? [];
  const hcpOptions = hcpData?.hcpsCollection?.edges?.map((e) => e.node) ?? [];

  const { control, handleSubmit, reset, getValues, setValue, formState: { errors, isDirty, isSubmitting } } = useForm<InsightFormValues>({
    resolver: zodResolver(insightSchema),
    mode: 'onChange',
    defaultValues: {
      title: insight?.title ?? '',
      description: insight?.description ?? '',
      priority: insight?.priority ?? 'P3',
      stage: insight?.stage ?? 'observation',
      categoryId: insight?.category?.id ?? null,
      hcpId: insight?.hcp?.id ?? null,
      drugName: insight?.drugName ?? '',
      tagIds: insight?.tags?.map((t) => t.id) ?? [],
    },
  });

  const handleTranscript = useCallback((text: string) => {
    const current = getValues('description') ?? '';
    setValue('description', current ? `${current} ${text}` : text, { shouldDirty: true });
  }, [getValues, setValue]);

  const { status: speechStatus, toggle: toggleSpeech, stop: stopSpeech } = useSpeechRecognition({ onTranscript: handleTranscript });

  // Stop mic immediately when the drawer is dismissed — don't wait for unmount
  useEffect(() => {
    if (!open) stopSpeech();
  }, [open, stopSpeech]);

  useEffect(() => {
    if (open) {
      reset({
        title: insight?.title ?? '',
        description: insight?.description ?? '',
        priority: insight?.priority ?? 'P3',
        stage: insight?.stage ?? 'observation',
        categoryId: insight?.category?.id ?? null,
        hcpId: insight?.hcp?.id ?? null,
        drugName: insight?.drugName ?? '',
        tagIds: insight?.tags?.map((t) => t.id) ?? [],
      });
      setCustomFields(parseCustomFields(insight?.customFields));
    }
  }, [open, insight, reset]);

  const handleClose = () => {
    stopSpeech(); // kill mic immediately — don't wait for open → false effect
    if (isDirty) { setShowUnsavedDialog(true); return; }
    onClose();
  };

  const syncTags = async (insightId: string, tagIds: string[]) => {
    // Delete all existing tag associations for this insight
    await deleteTags({ variables: { insightId } });
    if (tagIds.length > 0) {
      const { errors } = await insertTags({
        variables: {
          objects: tagIds.map((tagId) => ({ insightId, tagId })),
        },
      });
      if (errors?.length) {
        console.error('[syncTags] insertTags error:', errors);
        throw new Error(errors[0].message);
      }
    }
  };

  const doSave = async (values: InsightFormValues) => {
    const tagIds = values.tagIds ?? [];
    // JSONB fields must be passed as a JSON string (pg_graphql requirement)
    const customFieldsJson = Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null;
    if (isEdit && insight) {
      echoSuppressor.tag(insight.id);
      const { data } = await updateInsight({
        variables: {
          filter: { id: { eq: insight.id } },
          set: {
            title: values.title,
            description: values.description,
            priority: values.priority,
            stage: values.stage,
            categoryId: values.categoryId ?? null,
            hcpId: values.hcpId ?? null,
            drugName: values.drugName ?? null,
            customFields: customFieldsJson,
          },
        },
      });

      // Sync tags independently (junction table)
      await syncTags(insight.id, tagIds);

      const updated = data?.updateInsightsCollection?.records?.[0];
      if (updated) {
        const changedFields: string[] = [];
        if (values.title !== insight.title) changedFields.push('title');
        if (values.priority !== insight.priority) changedFields.push('priority');
        if (values.stage !== insight.stage) changedFields.push('stage');

        await Promise.all(changedFields.map((field) =>
          logActivity({
            variables: {
              objects: [{
                insightId: insight.id,
                userId: user?.id,
                action: 'updated',
                fieldName: field,
                oldValue: String(insight[field as keyof Insight] ?? ''),
                newValue: String(values[field as keyof InsightFormValues] ?? ''),
              }],
            },
          })
        ));
      }
      // Refetch list after all mutations (tags + customFields) are committed
      await apolloClient.refetchQueries({ include: [LIST_INSIGHTS] });
      toast('Insight updated', 'success');
    } else {
      const { data } = await createInsight({
        variables: {
          objects: [{
            title: values.title,
            description: values.description,
            priority: values.priority,
            stage: values.stage ?? 'observation',
            categoryId: values.categoryId ?? null,
            hcpId: values.hcpId ?? null,
            drugName: values.drugName ?? null,
            customFields: customFieldsJson,
            createdBy: user?.id,
          }],
        },
      });
      const created = data?.insertIntoInsightsCollection?.records?.[0];
      if (created) {
        // Insert tag associations for the new insight
        await syncTags(created.id, tagIds);

        logActivity({
          variables: {
            objects: [{ insightId: created.id, userId: user?.id, action: 'created', fieldName: null, oldValue: null, newValue: null }],
          },
        }).catch(() => { });
      }
      // Refetch list after all mutations (tags + customFields) are committed
      await apolloClient.refetchQueries({ include: [LIST_INSIGHTS] });
      toast('Insight created', 'success');
    }
    onSaved();
  };

  const onSubmit = async (values: InsightFormValues) => {
    try {
      if (isEdit && insight) {
        const { data: freshData } = await apolloClient.query<InsightData>({
          query: GET_INSIGHT,
          variables: { id: insight.id },
          fetchPolicy: 'network-only',
        });
        const fresh = freshData?.insightsCollection?.edges?.[0]?.node;
        if (fresh) {
          const myValues: Partial<Insight> = {
            title: values.title, description: values.description,
            priority: values.priority, stage: values.stage,
          };
          const hasConflict = detectConflict(myValues, fresh, insight.updatedAt);
          if (hasConflict) { setPendingValues(values); return; }
        }
      }
      await doSave(values);
    } catch {
      toast('Failed to save insight', 'error');
    }
  };

  const handleKeepMine = async () => {
    const resolved = resolveKeepMine();
    if (resolved && pendingValues) {
      try { await doSave(pendingValues); } catch { toast('Failed to save insight', 'error'); }
    }
    setPendingValues(null);
  };

  const handleKeepTheirs = () => { resolveKeepTheirs(); setPendingValues(null); onClose(); };

  const handleMerge = async () => {
    const merged = resolveMerge();
    if (merged && pendingValues) {
      const mergedValues: InsightFormValues = {
        ...pendingValues,
        title: (merged.title ?? pendingValues.title) as string,
        description: (merged.description ?? pendingValues.description) as string,
        priority: (merged.priority ?? pendingValues.priority) as InsightFormValues['priority'],
        stage: merged.stage ?? pendingValues.stage,
      };
      try { await doSave(mergedValues); } catch { toast('Failed to save insight', 'error'); }
    }
    setPendingValues(null);
  };

  const footer = (
    <PrimaryButton
      type="submit"
      fullWidth
      loading={isSubmitting}
      onClick={handleSubmit(onSubmit)}
      aria-label={isEdit ? 'Save changes' : 'Create insight'}
    >
      {isEdit ? 'Save Changes' : 'Create Insight'}
    </PrimaryButton>
  );

  return (
    <>
      <AppDrawer
        open={open}
        onClose={onClose}
        onHeaderClose={handleClose}
        title={isEdit ? 'Edit Insight' : 'Log Insight'}
        subtitle={isEdit ? 'Update the insight details' : 'Capture a new field intelligence insight'}
        footer={footer}
        isForm
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Title */}
        <Controller name="title" control={control} render={({ field }) => (
          <FormTextField
            {...field}
            label="Title"
            placeholder="e.g. HCP raised access concern for formulary"
            error={Boolean(errors.title)}
            helperText={errors.title?.message}
            fullWidth multiline maxRows={3}
            aria-label="Insight title"
          />
        )} />

        {/* Description + Voice-to-Text */}
        <Controller name="description" control={control} render={({ field }) => (
          <Box sx={{ position: 'relative' }}>
            <FormTextField
              {...field}
              label="Description"
              placeholder="What happened? What did the HCP say or signal?"
              error={Boolean(errors.description)}
              helperText={errors.description?.message}
              fullWidth multiline rows={3}
              aria-label="Insight description"
              slotProps={{
                input: {
                  endAdornment: (
                    <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                      <Tooltip
                        title={
                          speechStatus === 'unsupported' ? 'Speech not supported in this browser'
                          : speechStatus === 'denied' ? 'Microphone permission denied'
                          : speechStatus === 'requesting' ? 'Requesting microphone…'
                          : speechStatus === 'recording' ? 'Stop recording'
                          : 'Record description'
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={toggleSpeech}
                            disabled={speechStatus === 'unsupported' || speechStatus === 'denied' || speechStatus === 'requesting'}
                            sx={{
                              color: speechStatus === 'recording' ? '#EF4444' : '#9CA3AF',
                              '&:hover': { color: speechStatus === 'recording' ? '#DC2626' : '#3F51B5' },
                              animation: speechStatus === 'recording' ? 'pulse 1.2s ease-in-out infinite' : 'none',
                              '@keyframes pulse': {
                                '0%, 100%': { opacity: 1 },
                                '50%': { opacity: 0.4 },
                              },
                            }}
                            aria-label={speechStatus === 'recording' ? 'Stop recording' : 'Start recording'}
                          >
                            {speechStatus === 'recording' ? <MicOffIcon sx={{ fontSize: 16 }} /> : <MicIcon sx={{ fontSize: 16 }} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  ),
                },
              }}
            />
          </Box>
        )} />

        {/* Priority + Stage */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Controller name="priority" control={control} render={({ field }) => (
            <FormSelect
              {...field}
              label="Priority"
              containerSx={{ flex: 1 }}
              error={Boolean(errors.priority)}
              helperText={errors.priority?.message}
              aria-label="Select priority"
            >
              {(['P1', 'P2', 'P3', 'P4'] as const).map((p) => (
                <MenuItem key={p} value={p} sx={ITEM_SX}>{p}</MenuItem>
              ))}
            </FormSelect>
          )} />
          <Controller name="stage" control={control} render={({ field }) => (
            <FormSelect {...field} label="Stage" containerSx={{ flex: 1 }} aria-label="Select stage">
              {STAGES.map((s) => (
                <MenuItem key={s} value={s} sx={ITEM_SX}>{STAGE_LABELS[s]}</MenuItem>
              ))}
            </FormSelect>
          )} />
        </Box>

        {/* Category */}
        <Controller name="categoryId" control={control} render={({ field }) => (
          <FormSelect
            {...field}
            value={field.value ?? ''}
            label="Category"
            containerSx={{ width: '100%' }}
            aria-label="Select category"
          >
            <MenuItem value="" sx={ITEM_SX}>None</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id} sx={ITEM_SX}>{c.name}</MenuItem>
            ))}
          </FormSelect>
        )} />

        {/* HCP Autocomplete */}
        <Controller name="hcpId" control={control} render={({ field }) => (
          <Autocomplete
            options={hcpOptions}
            loading={hcpLoading}
            getOptionLabel={(o) => o.name}
            defaultValue={insight?.hcp ?? null}
            onChange={(_, v) => field.onChange(v?.id ?? null)}
            onInputChange={(_, val) => {
              if (val.length >= 2) searchHCPs({ variables: { search: `%${val}%` } });
            }}
            renderInput={(params) => (
              <FormTextField
                {...params}
                label="Linked HCP"
                slotProps={{
                  ...params.slotProps,
                  htmlInput: { ...params.slotProps?.htmlInput, style: { fontSize: '0.8125rem' } },
                  input: {
                    ...(params.slotProps?.input as object),
                    endAdornment: hcpLoading ? <CircularProgress size={14} /> : (params.slotProps?.input as { endAdornment?: React.ReactNode })?.endAdornment,
                  },
                }}
              />
            )}
            renderOption={(props, o) => (
              <Box component="li" {...props}>
                <Box>
                  <Typography sx={{ fontSize: '0.8125rem' }}>{o.name}</Typography>
                  {o.specialty && <Typography sx={{ fontSize: '0.7rem' }} color="text.secondary">{o.specialty}</Typography>}
                </Box>
              </Box>
            )}
            aria-label="Search and select HCP"
          />
        )} />

        {/* Drug Name */}
        <Controller name="drugName" control={control} render={({ field }) => (
          <FormTextField {...field} value={field.value ?? ''} label="Drug Name" fullWidth aria-label="Drug name" />
        )} />

        {/* Tags */}
        <Controller name="tagIds" control={control} render={({ field }) => (
          <Autocomplete
            multiple
            options={allTags}
            getOptionLabel={(o: Tag) => o.name}
            value={allTags.filter((t) => (field.value ?? []).includes(t.id))}
            onChange={(_, v: Tag[]) => field.onChange(v.map((t) => t.id))}
            slotProps={{ chip: { size: 'small', sx: { fontSize: '0.7rem', height: 20 } } }}
            renderInput={(params) => (
              <FormTextField
                {...params}
                label="Tags"
                slotProps={{
                  ...params.slotProps,
                  htmlInput: { ...params.slotProps?.htmlInput, style: { fontSize: '0.8125rem' } },
                }}
              />
            )}
            aria-label="Select tags"
          />
        )} />

        {/* Custom Fields */}
        <CustomFieldsSection values={customFields} onChange={setCustomFields} />
      </AppDrawer>

      {conflict && (
        <ConflictModal
          conflict={conflict}
          onKeepMine={handleKeepMine}
          onKeepTheirs={handleKeepTheirs}
          onMerge={handleMerge}
        />
      )}

      <Dialog open={showUnsavedDialog} onClose={() => setShowUnsavedDialog(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <Typography>You have unsaved changes. Are you sure you want to close?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUnsavedDialog(false)}>Keep Editing</Button>
          <Button color="error" onClick={() => { setShowUnsavedDialog(false); onClose(); }}>Discard</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
