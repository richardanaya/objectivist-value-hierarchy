export const commandSchemas = [
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
];
export function getSchema(commandName) {
    if (!commandName) {
        return commandSchemas;
    }
    return commandSchemas.find(cmd => cmd.name === commandName) || null;
}
export function getMutatingCommands() {
    return commandSchemas.filter(cmd => cmd.mutating).map(cmd => cmd.name);
}
export function validateCommandParams(commandName, params) {
    const schema = getSchema(commandName);
    if (!schema || Array.isArray(schema)) {
        return { valid: false, errors: [`Unknown command: ${commandName}`] };
    }
    const errors = [];
    // Check required JSON fields if there's a request schema
    if (schema.requestSchema?.required) {
        for (const field of schema.requestSchema.required) {
            if (!(field in params) || params[field] === undefined || params[field] === null) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
