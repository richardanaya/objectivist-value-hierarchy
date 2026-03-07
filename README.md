# vh - Value Hierarchy CLI

An AI-first CLI for managing personal value hierarchies in Markdown. Built specifically for AI agents to help facilitate value hierarchy interviews and prioritization exercises.

## What is a Value Hierarchy?

A value hierarchy is a prioritized list of what you care about most. By comparing values head-to-head, you build clarity about what truly matters to you. The tool tracks wins/losses from comparisons to help establish a data-driven priority order.

## Installation

```bash
npm install -g objectivist-value-hierarchy
```

Or use directly with npx:
```bash
npx objectivist-value-heirarchy <command>
```

## Quick Start

```bash
# Create your first value
vh add --json '{"title": "Daily Morning Exercise Routine"}'

# Add another value with tags
vh add --json '{"title": "Building Emergency Savings", "tags": "finance|money|security"}'

# Add a description
vh add --json '{"title": "Maintaining Close Friendships", "tags": "relationships", "desc": "Social connection is fundamental to wellbeing"}'

# List your hierarchy
vh list --json '{}'

# Get suggestions for improvement
vh suggestions-to-improve --json '{}'

# Compare two values to establish priority
vh set-higher-priority-than --json '{"value": "Daily Morning Exercise Routine", "valueToBeAbove": "Building Emergency Savings"}'
```

## Commands

### JSON-First Interface

All commands use a JSON-first interface designed for AI agents:

```bash
vh <command> --json '<json-payload>' [options]
```

**Global Options:**
- `--output <format>` - Output format: `json`, `ndjson`, `toon`, or `auto` (default)
- `--fields <fields>` - Comma-separated list of fields to include (e.g., `values.title,values.rank`)
- `--dry-run` - Validate commands without executing mutating operations

### `vh add --json '{...}'`

Add a new value to your hierarchy.

**JSON Fields:**
- `title` (required) - Title of the value
- `tags` (optional) - Pipe-separated tags (e.g., `health|fitness`)
- `desc` (optional) - Description/rationale for why this value matters
- `detail` (optional) - Enforce specific titles (requires 3+ words)
- `file` (optional) - Path to markdown file (default: `value-hierarchy.md`)

**Examples:**
```bash
vh add --json '{"title": "Learning New Skills", "tags": "career|growth", "desc": "Continuous learning keeps me adaptable"}'
vh add --json '{"title": "Quality Sleep", "tags": "health|mental-health", "detail": true}'
```

### `vh edit --json '{...}'`

Edit an existing value.

**JSON Fields:**
- `id` (required) - ID of the value to edit (same as title)
- `title` (optional) - New title
- `tags` (optional) - New tags
- `desc` (optional) - New description
- `file` (optional) - Path to markdown file

**Example:**
```bash
vh edit --json '{"id": "Learning New Skills", "tags": "career|skills|education"}'
```

### `vh remove --json '{...}'`

Remove a value from your hierarchy.

**JSON Fields:**
- `id` (required) - ID of the value to remove
- `file` (optional) - Path to markdown file

**Example:**
```bash
vh remove --json '{"id": "Old Hobby I No Longer Pursue"}'
```

### `vh list --json '{...}'`

List all values in priority order (highest priority first).

**JSON Fields:**
- `limit` (optional) - Limit number of results
- `tag` (optional) - Filter by specific tag
- `file` (optional) - Path to markdown file

**Examples:**
```bash
vh list --json '{}'
vh list --json '{"limit": 5}'
vh list --json '{"tag": "health"}'
```

### `vh set-higher-priority-than --json '{...}'`

Reorder values by moving one above another. This updates the priority ranking.

**JSON Fields:**
- `value` (required) - Title of the value to move
- `valueToBeAbove` (required) - Title of the value to be placed below
- `file` (optional) - Path to markdown file

**Example:**
```bash
# "Daily Morning Exercise Routine" is now higher priority than "Building Emergency Savings"
vh set-higher-priority-than --json '{"value": "Daily Exercise", "valueToBeAbove": "Job Promotion"}'
```

### `vh suggestions-to-improve --json '{...}'`

Get comprehensive suggestions for improving your value hierarchy. Returns:

- **comparisonPairs** - Suggested pairs of values to compare
- **tagsNeedingMoreValues** - Categories with few values
- **tagsNotRepresented** - Available tags not yet used
- **valuesNeedingRationale** - Values lacking explanation
- **staleValues** - Values not updated in 30+ days
- **uncomparedValues** - Values never been compared
- **topValues/bottomValues** - Your highest and lowest priorities
- **lopsidedValues** - Values with skewed win/loss ratios
- **vagueTitles** - Values with non-specific titles
- **valuesWithNoTags** - Uncategorized values

**JSON Fields:**
- `num` (optional) - Number of comparison pairs to generate (default: 5)
- `file` (optional) - Path to markdown file

**Example:**
```bash
vh suggestions-to-improve --json '{"num": 3}'
```

### `vh tags`

Show all available tags from the Objectivist framework.

**Example:**
```bash
vh tags
```

## MCP Server

Run as a Model Context Protocol (MCP) server for integration with AI assistants like Claude:

```bash
# Run with default file (value-hierarchy.md)
vh mcp

# Run with specific file
vh mcp --file my-values.md
```

**MCP Tools:**

| Tool | Description |
|------|-------------|
| `add_value` | Add a new value to your personal value hierarchy with title, tags, and optional description |
| `edit_value` | Modify an existing value in your hierarchy - update title, tags, or description |
| `remove_value` | Delete a value from your hierarchy by its ID (title) |
| `value_suggestions_to_improve` | Get AI-generated suggestions to improve your value hierarchy, including comparison pairs and recommendations |
| `set_value_higher_priority_than` | Reorder your hierarchy by moving one value to be higher priority than another |
| `list_values` | List all values in your hierarchy in priority order, with optional filtering by tag or limit |
| `list_value_tags` | List all available value categories/tags from the Objectivist framework for categorizing your values |

## Schema Introspection

Use schema introspection to discover available commands and their parameters:

```bash
# List all commands
vh schema

# Show schema for specific command
vh schema add
vh schema list
```

## Available Tags

The tool includes 51 practical, everyday tags organized by category:

**Health & Wellness:** health, fitness, mental-health, sleep, nutrition  
**Career & Finance:** career, work, skills, learning, education, finance, money, investing, savings, budget  
**Relationships:** relationships, family, friends, romance, community  
**Home & Environment:** home, housing, environment, organization, cleanliness  
**Personal Growth:** creativity, hobbies, arts, music, writing, goals, planning, habits, discipline, focus, self-improvement, confidence, mindfulness, reflection  
**Experiences:** travel, adventure, experiences, fun, entertainment, food, cooking, dining, nature, outdoors, sports, recreation

You can also add custom tags directly to your values.

## Output Formats

- **TOON** (default in TTY) - Compact, token-efficient format
- **JSON** (default in pipes) - Standard JSON output
- **NDJSON** - Newline-delimited JSON for streaming

Set via `--output <format>` or `VH_OUTPUT_FORMAT` environment variable.

## Field Filtering

Limit response size for AI context windows:

```bash
# Only get titles and ranks
vh list --json '{}' --fields values.title,values.rank

# Only get comparison pairs
vh suggestions-to-improve --json '{}' --fields comparisonPairs
```

## File Format

Values are stored in a readable Markdown format:

```markdown
# Value Hierarchy

## Summary
- **Total Values**: 3
- **Total Comparisons**: 2
- **Last Updated**: 2026-03-01T17:20:02.407Z

## Values

### Daily Morning Exercise Routine

| Attribute | Value |
|-----------|-------|
| Wins | 2 |
| Losses | 0 |
| Tags | health|fitness |
| Updated | 2026-03-01T17:20:02.407Z |

#### Rationale
Physical health is the foundation for everything else I want to achieve.
```

**Priority is determined by file order** - values appearing earlier have higher priority.

## Best Practices

1. **Start broad, then refine** - Begin with 5-10 values, then use comparisons to establish priority
2. **Be specific** - Use concrete titles like "Daily 30-minute walk" instead of "Health"
3. **Add rationales** - Explain why each value matters to you
4. **Tag consistently** - Use tags to see patterns in your values
5. **Review regularly** - Run `suggestions-to-improve` weekly to identify gaps
6. **Compare systematically** - Work through comparison pairs to build confidence in your hierarchy
7. **Use dry-run** - Test mutating operations with `--dry-run` first

## License

MIT

## Author

Richard Anaya
