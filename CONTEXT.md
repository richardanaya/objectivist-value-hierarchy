# Context Window Discipline

This CLI is frequently invoked by AI/LLM agents with limited context windows. Always apply these patterns to avoid overwhelming your context.

## ALWAYS Use Field Masks

**Value hierarchies can contain many values with long rationales. ALWAYS use field masks when listing to avoid overwhelming your context window.**

### Bad (Returns all fields including full rationales)

```bash
vh list --json '{}'
```

### Good (Returns only needed fields)

```bash
vh list --json '{}' --fields values.rank,values.title,values.tags
vh suggestions-to-improve --json '{}' --fields comparisonPairs
```

## Schema Introspection

Use schema introspection to understand what fields are available:

```bash
# List all commands
vh schema

# Show specific command schema
vh schema list
vh schema add
```

## Output Format Selection

- **TTY (interactive terminal)**: TOON format (compact, human-readable)
- **Non-TTY (pipes, scripts)**: JSON format automatically

Override with `--output <format>` or `VH_OUTPUT_FORMAT` env var.

## Limiting Results

Use the `limit` parameter to restrict the number of values returned:

```bash
vh list --json '{"limit": 5}'
```

## Summary Checklist

Before every command, ask:

- [ ] Can I use `--fields` to limit returned data?
- [ ] Can I use `limit` to reduce result count?
- [ ] Do I need all this data in my context?
- [ ] Should I use `--dry-run` first?

**Remember: Every token counts. Be ruthless about limiting response size.**
