import { z } from 'zod';

export const insightSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
  description: z.string().min(1, 'Description is required').max(5000, 'Max 5000 characters'),
  priority: z.enum(['P1', 'P2', 'P3', 'P4'], { required_error: 'Priority is required' }),
  stage: z.enum(['observation', 'insight', 'actionable', 'impact']).optional(),
  categoryId: z.string().nullable().optional(),
  hcpId: z.string().nullable().optional(),
  drugName: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export type InsightFormValues = z.infer<typeof insightSchema>;
