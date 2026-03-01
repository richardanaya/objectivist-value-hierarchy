# vh - Value Hierarchy CLI

A command-line tool for building and managing personal value hierarchies. Helps you identify, organize, and prioritize what matters most in your life through structured comparison and reflection.

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
vh add "Daily Morning Exercise Routine"

# Add another value with tags
vh add "Building Emergency Savings" --tags "finance|money|security"

# Add a description
vh add "Maintaining Close Friendships" --tags "relationships" --desc "Social connection is fundamental to wellbeing"

# List your hierarchy
vh list value-hierarchy.md

# Get suggestions for improvement
vh suggestions-to-improve

# Compare two values to establish priority
vh set-higher-priority-than "Daily Morning Exercise Routine" "Building Emergency Savings"
```

## Commands

### `vh add [file] <title>`

Add a new value to your hierarchy.

**Options:**
- `--tags <string>` - Pipe-separated tags (e.g., `health|fitness`)
- `--desc <string>` - Description/rationale for why this value matters
- `--detail` - Enforce specific titles (requires 3+ words)

**Examples:**
```bash
vh add "Learning New Skills" --tags "career|growth" --desc "Continuous learning keeps me adaptable"
vh add "Quality Sleep" --tags "health|mental-health" --detail
```

### `vh edit [file] <id>`

Edit an existing value.

**Options:**
- `--title <string>` - New title
- `--tags <string>` - New tags
- `--desc <string>` - New description

**Example:**
```bash
vh edit "Learning New Skills" --tags "career|skills|education"
```

### `vh remove [file] <id>`

Remove a value from your hierarchy.

**Example:**
```bash
vh remove "Old Hobby I No Longer Pursue"
```

### `vh list [file]`

List all values in priority order (highest priority first).

**Options:**
- `--limit <number>` - Limit number of results
- `--tag <tag>` - Filter by specific tag

**Examples:**
```bash
vh list value-hierarchy.md
vh list value-hierarchy.md --limit 5
vh list value-hierarchy.md --tag health
```

### `vh set-higher-priority-than [file] <value> <value-to-be-above>`

Reorder values by moving one above another. This updates the priority ranking.

**Example:**
```bash
# "Health" is now higher priority than "Career"
vh set-higher-priority-than "Daily Exercise" "Job Promotion"
```

### `vh suggestions-to-improve [file]`

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

**Options:**
- `--num <number>` - Number of comparison pairs to generate (default: 5)

**Example:**
```bash
vh suggestions-to-improve --num 3
```

### `vh tags [file]`

Show all available tags. Combines the master tag list with any tags used in your values.

**Example:**
```bash
vh tags
vh tags my-values.md
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

## How It Works

### Value Comparison

When you compare two values, the winner gets a "win" and the loser gets a "loss". The tool uses this data to:

1. **Suggest comparisons** - Prioritizes values with fewer comparisons
2. **Identify inconsistencies** - Flags values with extreme win/loss ratios
3. **Track maturity** - Shows total comparisons and average per value

### File Format

Values are stored in a readable Markdown format (`value-hierarchy.md` by default):

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

### Building Emergency Savings

| Attribute | Value |
|-----------|-------|
| Wins | 0 |
| Losses | 1 |
| Tags | finance|money|security |
| Updated | 2026-03-01T17:15:22.123Z |

#### Rationale
Financial security provides peace of mind and options.
```

**Priority is determined by file order** - values appearing earlier have higher priority.

### Output Format

Most commands output data in [TOON format](https://github.com/toon-format/toon) (Token-Oriented Object Notation), which is:
- Compact and token-efficient
- Human-readable
- LLM-friendly for AI assistants

Example output from `vh suggestions-to-improve`:
```
type: suggestions-to-improve
file: value-hierarchy.md
timestamp: "2026-03-01T17:20:02.407Z"
totalValues: 3
totalComparisons: 2
averageComparisonsPerValue: 1.3
comparisonPairs:
  description: Pairs of values to compare...
  pairs[1]:
    pairNumber: 1
    a:
      title: "Building Emergency Savings"
      id: "Building Emergency Savings"
      wins: 0
      losses: 1
    b:
      title: "Maintaining Close Friendships"
      id: "Maintaining Close Friendships"
      wins: 0
      losses: 0
```

## Best Practices

1. **Start broad, then refine** - Begin with 5-10 values, then use comparisons to establish priority
2. **Be specific** - Use concrete titles like "Daily 30-minute walk" instead of "Health"
3. **Add rationales** - Explain why each value matters to you
4. **Tag consistently** - Use tags to see patterns in your values
5. **Review regularly** - Run `suggestions-to-improve` weekly to identify gaps
6. **Compare systematically** - Work through comparison pairs to build confidence in your hierarchy

## AI Assistant Integration

This tool is designed for AI assistants to help facilitate value hierarchy interviews:

1. AI reads your current hierarchy with `vh list`
2. AI gets improvement suggestions with `vh suggestions-to-improve`
3. AI presents comparison pairs and asks "Which matters more?"
4. AI updates priority with `vh set-higher-priority-than`
5. AI suggests new values based on gaps in tags

The TOON output format is optimized for LLM context windows, making it easy for AI assistants to understand your hierarchy and provide guidance.

## License

MIT

## Author

Richard Anaya
