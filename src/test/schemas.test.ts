import { describe, it, expect } from 'vitest';
import { insightSchema } from '@/features/insight/schemas/insightSchema';

describe('insightSchema', () => {
  it('passes with valid data', () => {
    const result = insightSchema.safeParse({
      title: 'Dr. Johnson switching patients',
      description: 'Switching from Lipitor after 6 months of failed therapy.',
      priority: 'P2',
      stage: 'observation',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = insightSchema.safeParse({
      title: '',
      description: 'Some description',
      priority: 'P1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('title');
    }
  });

  it('rejects empty description', () => {
    const result = insightSchema.safeParse({
      title: 'Valid title',
      description: '',
      priority: 'P1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('description');
    }
  });

  it('rejects invalid priority', () => {
    const result = insightSchema.safeParse({
      title: 'Valid',
      description: 'Valid',
      priority: 'P5', // invalid
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid priorities', () => {
    for (const priority of ['P1', 'P2', 'P3', 'P4'] as const) {
      const result = insightSchema.safeParse({ title: 'T', description: 'D', priority });
      expect(result.success).toBe(true);
    }
  });

  it('accepts optional fields as null', () => {
    const result = insightSchema.safeParse({
      title: 'Title',
      description: 'Desc',
      priority: 'P3',
      categoryId: null,
      hcpId: null,
      drugName: null,
    });
    expect(result.success).toBe(true);
  });
});
