export interface CommandSchema {
  name: string
  description: string
  arguments?: ArgumentSchema[]
  requestSchema?: RequestSchema
  responseSchema?: ResponseSchema
  examples?: string[]
  mutating?: boolean
}

export interface RequestSchema {
  description: string
  properties: Record<string, SchemaProperty>
  required?: string[]
}

export interface ResponseSchema {
  description: string
  properties: Record<string, SchemaProperty>
}

export interface SchemaProperty {
  type: string
  description: string
  required?: boolean
  items?: SchemaProperty
  properties?: Record<string, SchemaProperty>
  readOnly?: boolean
  format?: string
  default?: unknown
}

export interface ArgumentSchema {
  name: string
  description: string
  required?: boolean
  variadic?: boolean
}

export const commandSchemas: CommandSchema[] = [
  {
    name: 'add',
    description: 'Add a value to the hierarchy',
    requestSchema: {
      description: 'Request body for adding a value',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        title: { type: 'string', description: 'Title of the value' },
        tags: { type: 'string', description: 'Pipe-separated tags (optional)' },
        desc: { type: 'string', description: 'Description/rationale (optional)' },
        detail: { type: 'boolean', description: 'Require specific title (3+ words)', default: false },
      },
      required: ['title'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether operation succeeded', readOnly: true },
        message: { type: 'string', description: 'Status message', readOnly: true },
      },
    },
    examples: [
      'vh add --json \'{"title": "Daily Walking and Strength Training"}\'',
      'vh add --json \'{"file": "my-values.md", "title": "Meditation Practice", "tags": "health|mental-health", "desc": "Daily mindfulness practice"}\'',
    ],
    mutating: true,
  },
  {
    name: 'edit',
    description: 'Edit an existing value',
    requestSchema: {
      description: 'Request body for editing a value',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        id: { type: 'string', description: 'ID of the value to edit (same as title)' },
        title: { type: 'string', description: 'New title (optional)' },
        tags: { type: 'string', description: 'New tags (optional)' },
        desc: { type: 'string', description: 'New description/rationale (optional)' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether operation succeeded', readOnly: true },
        message: { type: 'string', description: 'Status message', readOnly: true },
      },
    },
    examples: [
      'vh edit --json \'{"id": "Meditation Practice", "tags": "health|mental-health|mindfulness"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'remove',
    description: 'Remove a value from the hierarchy',
    requestSchema: {
      description: 'Request body for removing a value',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        id: { type: 'string', description: 'ID of the value to remove' },
      },
      required: ['id'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether operation succeeded', readOnly: true },
        message: { type: 'string', description: 'Status message', readOnly: true },
      },
    },
    examples: [
      'vh remove --json \'{"id": "Old Value"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'suggestions-to-improve',
    description: 'Get suggestions for improving your value hierarchy (comparison pairs and recommendations)',
    requestSchema: {
      description: 'Request body for getting improvement suggestions',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        num: { type: 'number', description: 'Number of comparison pairs to generate', default: 5 },
      },
    },
    responseSchema: {
      description: 'Suggestions object with multiple categories',
      properties: {
        type: { type: 'string', description: 'Response type', readOnly: true },
        file: { type: 'string', description: 'File path', readOnly: true },
        timestamp: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
        totalValues: { type: 'number', description: 'Total number of values', readOnly: true },
        totalComparisons: { type: 'number', description: 'Total comparisons made', readOnly: true },
        averageComparisonsPerValue: { type: 'number', description: 'Average comparisons per value', readOnly: true },
        comparisonPairs: { type: 'object', description: 'Pairs of values to compare', readOnly: true },
      },
    },
    examples: [
      'vh suggestions-to-improve --json \'{"num": 10}\'',
      'vh suggestions-to-improve --json \'{"file": "my-values.md", "num": 3}\' --fields comparisonPairs',
    ],
  },
  {
    name: 'set-higher-priority-than',
    description: 'Reorder: move a value above another in priority',
    requestSchema: {
      description: 'Request body for reordering values',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        value: { type: 'string', description: 'Title of the value to move' },
        valueToBeAbove: { type: 'string', description: 'Title of the value to be placed below' },
      },
      required: ['value', 'valueToBeAbove'],
    },
    responseSchema: {
      description: 'Success confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether operation succeeded', readOnly: true },
        message: { type: 'string', description: 'Status message', readOnly: true },
      },
    },
    examples: [
      'vh set-higher-priority-than --json \'{"value": "Health", "valueToBeAbove": "Career"}\' --dry-run',
    ],
    mutating: true,
  },
  {
    name: 'list',
    description: 'List values in priority order',
    requestSchema: {
      description: 'Request body for listing values',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        limit: { type: 'number', description: 'Limit number of results (optional)' },
        tag: { type: 'string', description: 'Filter by tag (optional)' },
      },
    },
    responseSchema: {
      description: 'List of values in priority order',
      properties: {
        type: { type: 'string', description: 'Response type', readOnly: true },
        file: { type: 'string', description: 'File path', readOnly: true },
        filter: { type: 'string', description: 'Applied filter', readOnly: true },
        limit: { type: 'string', description: 'Applied limit', readOnly: true },
        timestamp: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
        values: { type: 'array', description: 'Array of values', readOnly: true },
      },
    },
    examples: [
      'vh list --json \'{"file": "my-values.md"}\'',
      'vh list --json \'{"tag": "health", "limit": 5}\' --fields values.rank,values.title,values.tags',
    ],
  },
  {
    name: 'tags',
    description: 'Show available tags (master list from objectivist-lattice or fallback)',
    responseSchema: {
      description: 'List of available tags',
      properties: {
        type: { type: 'string', description: 'Response type', readOnly: true },
        source: { type: 'string', description: 'Tag source', readOnly: true },
        timestamp: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
        tags: { type: 'array', description: 'Array of tag strings', readOnly: true },
      },
    },
    examples: ['vh tags', 'vh tags --output json'],
  },
  {
    name: 'schema',
    description: 'Show schema for a specific command or all commands',
    arguments: [
      { name: '[command]', description: 'Command name to show schema for (omit for all commands)', required: false },
    ],
    responseSchema: {
      description: 'Command schema or array of all schemas',
      properties: {
        name: { type: 'string', description: 'Command name', readOnly: true },
        description: { type: 'string', description: 'Command description', readOnly: true },
        requestSchema: { type: 'object', description: 'Input schema', readOnly: true },
        responseSchema: { type: 'object', description: 'Output schema', readOnly: true },
        examples: { type: 'array', description: 'Usage examples', readOnly: true },
        mutating: { type: 'boolean', description: 'Whether command modifies data', readOnly: true },
      },
    },
    examples: ['vh schema', 'vh schema add'],
  },
  {
    name: 'describe',
    description: 'Describe available commands (alias for schema)',
    arguments: [
      { name: '[command]', description: 'Command name to describe (omit for all commands)', required: false },
    ],
    responseSchema: {
      description: 'Command schema or array of all schemas',
      properties: {
        name: { type: 'string', description: 'Command name', readOnly: true },
        description: { type: 'string', description: 'Command description', readOnly: true },
        requestSchema: { type: 'object', description: 'Input schema', readOnly: true },
        responseSchema: { type: 'object', description: 'Output schema', readOnly: true },
        examples: { type: 'array', description: 'Usage examples', readOnly: true },
        mutating: { type: 'boolean', description: 'Whether command modifies data', readOnly: true },
      },
    },
    examples: ['vh describe', 'vh describe add'],
  },
  {
    name: 'mcp',
    description: 'Run as an MCP (Model Context Protocol) server',
    arguments: [
      { name: '--file <path>', description: 'Path to the value hierarchy markdown file to use as the database (default: value-hierarchy.md)', required: false },
    ],
    examples: ['vh mcp', 'vh mcp --file my-values.md'],
  },
  {
    name: 'log-emotion',
    description: 'Log an emotion with optional notes. Prefer using existing emotion categories when possible - use "emotion-categories" command to see what you have already logged. Emotions are always stored as lowercase.',
    requestSchema: {
      description: 'Request body for logging an emotion. Tip: Run "vh emotion-categories --json \'{}\'" first to see existing emotions and try to reuse those categories for consistency.',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        emotion: { type: 'string', description: 'The emotion to log (e.g., "joyful", "anxious", "grateful"). Will be normalized to lowercase. Try to reuse existing emotions from "emotion-categories" command.' },
        notes: { type: 'string', description: 'Optional notes about the emotion or context' },
      },
      required: ['emotion'],
    },
    responseSchema: {
      description: 'Logged emotion confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether operation succeeded', readOnly: true },
        message: { type: 'string', description: 'Status message', readOnly: true },
        emotion: { type: 'object', description: 'The logged emotion entry', readOnly: true },
      },
    },
    examples: [
      'vh log-emotion --json \'{"emotion": "joyful"}\'',
      'vh log-emotion --json \'{"emotion": "anxious", "notes": "Before big presentation"}\'',
    ],
    mutating: true,
  },
  {
    name: 'list-emotions',
    description: 'List emotions from the emotion log',
    requestSchema: {
      description: 'Request body for listing emotions',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        days: { type: 'number', description: 'Filter to emotions from the last N days' },
        limit: { type: 'number', description: 'Limit number of results' },
      },
    },
    responseSchema: {
      description: 'List of emotions',
      properties: {
        type: { type: 'string', description: 'Response type', readOnly: true },
        file: { type: 'string', description: 'File path', readOnly: true },
        timestamp: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
        filter: { type: 'object', description: 'Applied filters', readOnly: true },
        count: { type: 'number', description: 'Total count of emotions matching filter', readOnly: true },
        emotions: { type: 'array', description: 'Array of emotion entries', readOnly: true },
      },
    },
    examples: [
      'vh list-emotions --json \'{}\'',
      'vh list-emotions --json \'{"days": 7}\'',
      'vh list-emotions --json \'{"limit": 10}\'',
    ],
  },
  {
    name: 'emotion-categories',
    description: 'List distinct emotion categories with counts. Use this BEFORE logging new emotions to see what categories already exist and maintain consistency in your emotion tracking.',
    requestSchema: {
      description: 'Request body for listing emotion categories. Run this before log-emotion to retrieve existing emotion names and promote consistent categorization.',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        minCount: { type: 'number', description: 'Only show emotions logged at least this many times' },
      },
    },
    responseSchema: {
      description: 'Distinct emotion categories with occurrence stats',
      properties: {
        type: { type: 'string', description: 'Response type', readOnly: true },
        file: { type: 'string', description: 'File path', readOnly: true },
        timestamp: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
        filter: { type: 'object', description: 'Applied filters', readOnly: true },
        totalUnique: { type: 'number', description: 'Number of unique emotions', readOnly: true },
        categories: { type: 'array', description: 'Array of emotion categories with counts', readOnly: true },
      },
    },
    examples: [
      'vh emotion-categories --json \'{}\'',
      'vh emotion-categories --json \'{"minCount": 3}\'',
    ],
  },
  {
    name: 'delete-emotions',
    description: 'Delete emotions from the log by time range. Use with caution - deleted emotions cannot be recovered. Supports dry-run to preview what would be deleted.',
    requestSchema: {
      description: 'Request body for deleting emotions. Must specify at least one of: from (start date), to (end date). Dates should be ISO 8601 format. Both are inclusive.',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        from: { type: 'string', description: 'Delete emotions on or after this date (ISO 8601 format). Example: "2026-03-01T00:00:00Z"' },
        to: { type: 'string', description: 'Delete emotions on or before this date (ISO 8601 format). Example: "2026-03-28T23:59:59Z"' },
      },
    },
    responseSchema: {
      description: 'Deletion confirmation with count of deleted emotions',
      properties: {
        success: { type: 'boolean', description: 'Whether operation succeeded', readOnly: true },
        message: { type: 'string', description: 'Status message', readOnly: true },
        deletedCount: { type: 'number', description: 'Number of emotions deleted', readOnly: true },
        remainingCount: { type: 'number', description: 'Number of emotions remaining', readOnly: true },
        filter: { type: 'object', description: 'Applied filters', readOnly: true },
      },
    },
    examples: [
      'vh delete-emotions --json \'{"from": "2026-03-01T00:00:00Z"}\' --dry-run',
      'vh delete-emotions --json \'{"from": "2026-03-01T00:00:00Z", "to": "2026-03-15T23:59:59Z"}\'',
      'vh delete-emotions --json \'{"to": "2026-03-01T00:00:00Z"}\'',
    ],
    mutating: true,
  },
  {
    name: 'capture-aesthetic',
    description: 'Capture an aesthetic reference (image, music, sculpture, etc.) that embodies your values. Store art/media you find meaningful with connections to why it resonates with your value hierarchy.',
    requestSchema: {
      description: 'Request body for capturing an aesthetic reference. The "why" field is crucial - explain how this connects to your values. Use aesthetic-types to see what types you have already captured.',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        title: { type: 'string', description: 'Descriptive name for this aesthetic reference' },
        type: { type: 'string', description: 'Type: image, music, sculpture, architecture, film, literature, design, fashion, or other' },
        source: { type: 'string', description: 'Artist/creator name (optional)' },
        url: { type: 'string', description: 'Link to reference - highly recommended (optional)', format: 'uri' },
        tags: { type: 'string', description: 'Pipe-separated tags: lighting, color, texture, mood, era, style (optional)' },
        why: { type: 'string', description: 'CRUCIAL: How this connects to your value hierarchy. What values does it embody?' },
        context: { type: 'string', description: 'Where/when you encountered it (optional)' },
      },
      required: ['title', 'type'],
    },
    responseSchema: {
      description: 'Captured aesthetic confirmation',
      properties: {
        success: { type: 'boolean', description: 'Whether operation succeeded', readOnly: true },
        message: { type: 'string', description: 'Status message', readOnly: true },
        aesthetic: { type: 'object', description: 'The captured aesthetic entry', readOnly: true },
      },
    },
    examples: [
      'vh capture-aesthetic --json \'{"title": "Sunlight Through Morning Mist", "type": "image", "source": "Photographer Name", "url": "https://example.com/photo.jpg", "tags": "light|nature|minimalism", "why": "The clarity of light represents my value of intellectual honesty"}\'',
      'vh capture-aesthetic --json \'{"title": "Glass House Architecture", "type": "architecture", "source": "Philip Johnson", "why": "Physical manifestation of transparency - nothing to hide"}\'',
    ],
    mutating: true,
  },
  {
    name: 'list-aesthetics',
    description: 'List captured aesthetic references',
    requestSchema: {
      description: 'Request body for listing aesthetics',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
        type: { type: 'string', description: 'Filter by type: image, music, sculpture, etc.' },
        tag: { type: 'string', description: 'Filter by specific tag' },
        limit: { type: 'number', description: 'Limit number of results' },
      },
    },
    responseSchema: {
      description: 'List of aesthetic references',
      properties: {
        type: { type: 'string', description: 'Response type', readOnly: true },
        file: { type: 'string', description: 'File path', readOnly: true },
        timestamp: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
        filter: { type: 'object', description: 'Applied filters', readOnly: true },
        count: { type: 'number', description: 'Total count of aesthetics', readOnly: true },
        aesthetics: { type: 'array', description: 'Array of aesthetic entries', readOnly: true },
      },
    },
    examples: [
      'vh list-aesthetics --json \'{}\'',
      'vh list-aesthetics --json \'{"type": "image"}\'',
      'vh list-aesthetics --json \'{"tag": "minimalism", "limit": 5}\'',
    ],
  },
  {
    name: 'aesthetic-types',
    description: 'Show distribution of aesthetic types (image, music, sculpture, etc.) with counts and percentages',
    requestSchema: {
      description: 'Request body for getting aesthetic type distribution',
      properties: {
        file: { type: 'string', description: 'Path to the value hierarchy markdown file', default: 'value-hierarchy.md' },
      },
    },
    responseSchema: {
      description: 'Distribution of aesthetic types',
      properties: {
        type: { type: 'string', description: 'Response type', readOnly: true },
        file: { type: 'string', description: 'File path', readOnly: true },
        timestamp: { type: 'string', format: 'date-time', description: 'Timestamp', readOnly: true },
        total: { type: 'number', description: 'Total number of aesthetics', readOnly: true },
        types: { type: 'array', description: 'Array of type distributions', readOnly: true },
      },
    },
    examples: [
      'vh aesthetic-types --json \'{}\'',
    ],
  },
]

export function getSchema(commandName?: string): CommandSchema | CommandSchema[] | null {
  if (!commandName) {
    return commandSchemas
  }

  return commandSchemas.find(cmd => cmd.name === commandName) || null
}

export function getMutatingCommands(): string[] {
  return commandSchemas.filter(cmd => cmd.mutating).map(cmd => cmd.name)
}

export function validateCommandParams(
  commandName: string,
  params: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const schema = getSchema(commandName)
  if (!schema || Array.isArray(schema)) {
    return { valid: false, errors: [`Unknown command: ${commandName}`] }
  }

  const errors: string[] = []

  // Check required JSON fields if there's a request schema
  if (schema.requestSchema?.required) {
    for (const field of schema.requestSchema.required) {
      if (!(field in params) || params[field] === undefined || params[field] === null) {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
