import { z } from 'zod'

/**
 * Zod schemas for vh CLI commands
 * Provides strong validation for agent-facing JSON inputs
 */

export const FileSchema = z.object({
  file: z.string().optional().default('value-hierarchy.md'),
})

export const AddValueSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters')
    .regex(/^[^#|<>]+$/, 'Title cannot contain #, |, <, or > characters'),
  tags: z.string()
    .regex(/^[a-z0-9|.-]*$/, 'Tags must be lowercase alphanumeric with | separators')
    .optional(),
  desc: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  detail: z.boolean().optional().default(false),
}).merge(FileSchema)

export const EditValueSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  tags: z.string()
    .regex(/^[a-z0-9|.-]*$/, 'Tags must be lowercase alphanumeric with | separators')
    .optional(),
  desc: z.string().max(2000).optional(),
}).merge(FileSchema)

export const RemoveValueSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).merge(FileSchema)

export const SetHigherPrioritySchema = z.object({
  value: z.string().min(1, 'Value is required'),
  valueToBeAbove: z.string().min(1, 'valueToBeAbove is required'),
}).merge(FileSchema)

export const ListValuesSchema = z.object({
  limit: z.number().int().positive().optional(),
  tag: z.string().optional(),
}).merge(FileSchema)

export const SuggestionsSchema = z.object({
  num: z.number().int().min(1).max(20).optional().default(5),
}).merge(FileSchema)

export const LogEmotionSchema = z.object({
  emotion: z.string()
    .min(1, 'Emotion is required')
    .max(50, 'Emotion must be less than 50 characters')
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Emotion can only contain letters, numbers, spaces, underscores, and hyphens'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
}).merge(FileSchema)

export const ListEmotionsSchema = z.object({
  days: z.number().int().min(1).optional(),
  limit: z.number().int().positive().optional(),
}).merge(FileSchema)

export const ListEmotionCategoriesSchema = z.object({
  minCount: z.number().int().min(1).optional(),
}).merge(FileSchema)

export const DeleteEmotionsSchema = z.object({
  from: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'from must be a valid ISO date string' }
  ),
  to: z.string().optional().refine(
    (val) => !val || !isNaN(Date.parse(val)),
    { message: 'to must be a valid ISO date string' }
  ),
}).merge(FileSchema).refine(
  (data) => {
    // Must have at least one filter
    return data.from !== undefined || data.to !== undefined
  },
  { message: 'Must specify at least one filter: from or to' }
)

export const CaptureAestheticSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  type: z.string()
    .min(1, 'Type is required')
    .regex(/^[a-z]+$/, 'Type must be lowercase letters only (e.g., image, music, sculpture)'),
  source: z.string().max(200).optional(),
  url: z.string().url('Must be a valid URL').max(2000).optional().or(z.literal('')),
  tags: z.string()
    .regex(/^[a-z0-9|.-]*$/, 'Tags must be lowercase alphanumeric with | separators')
    .optional(),
  why: z.string().max(2000, 'Why must be less than 2000 characters').optional(),
  context: z.string().max(1000, 'Context must be less than 1000 characters').optional(),
}).merge(FileSchema)

export const ListAestheticsSchema = z.object({
  type: z.string().optional(),
  tag: z.string().optional(),
  limit: z.number().int().positive().optional(),
}).merge(FileSchema)

export const AestheticTypesSchema = z.object({}).merge(FileSchema)

export const EditEmotionSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  emotion: z.string().min(1).max(50).optional(),
  notes: z.string().max(500).optional(),
}).merge(FileSchema)

export const RemoveEmotionSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).merge(FileSchema)

export const EditAestheticSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  title: z.string().min(3).max(200).optional(),
  type: z.string().regex(/^[a-z]+$/, 'Type must be lowercase letters only').optional(),
  source: z.string().max(200).optional(),
  url: z.string().url('Must be a valid URL').max(2000).optional().or(z.literal('')),
  tags: z.string().regex(/^[a-z0-9|.-]*$/, 'Tags must be lowercase alphanumeric with | separators').optional(),
  why: z.string().max(2000).optional(),
}).merge(FileSchema)

export const RemoveAestheticSchema = z.object({
  id: z.string().min(1, 'ID is required'),
}).merge(FileSchema)

export const JsonParseError = z.object({
  error: z.string(),
})

/**
 * Safe parser that returns a result object
 */
export function safeParse<T extends z.ZodType>(schema: T, data: unknown): 
  { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result as z.infer<T> }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = (err as z.ZodError).issues || (err as any).errors || []
      return { 
        success: false, 
        error: issues.map((e: any) => `${e.path?.join('.') || 'input'}: ${e.message}`).join('; ') 
      }
    }
    return { success: false, error: String(err) || 'Invalid input' }
  }
}

/**
 * Helper to parse JSON string safely with schema validation
 */
export function parseJsonWithSchema<T extends z.ZodType>(
  jsonString: string, 
  schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(jsonString)
    return safeParse(schema, parsed)
  } catch (e) {
    return { success: false, error: 'Invalid JSON format' }
  }
}