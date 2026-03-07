# Agent Security Guidelines

This CLI is frequently invoked by AI/LLM agents. Always assume inputs can be adversarial.

## Input Validation Rules

**File Paths**
- Agents may hallucinate path traversals like `../../.ssh`
- All file paths are resolved relative to the current working directory
- Absolute paths are accepted but should be used with caution
- Always validate that file operations stay within intended boundaries

**Resource IDs**
- Value IDs (titles) should not contain control characters
- Validate that referenced values exist before operations
- Be cautious of values with special characters in titles

**JSON Payloads**
- Validate all JSON input before parsing
- Reject malformed JSON with clear error messages
- Check for required fields after parsing

## Safety Rails

### Dry-Run Mode

Always use `--dry-run` for mutating operations to validate before executing:

```bash
vh add --json '{"title": "New Value"}' --dry-run
vh remove --json '{"id": "Old Value"}' --dry-run
vh set-higher-priority-than --json '{"value": "A", "valueToBeAbove": "B"}' --dry-run
```

### Confirm Before Write/Delete

For write and delete operations:
1. Use `--dry-run` first to see what would happen
2. Review the output carefully
3. Remove `--dry-run` only after confirming correctness

## Context Window Protection

Value hierarchies can grow large. Always use field masks to limit response size:

```bash
# Good - only get essential fields
vh list --json '{}' --fields values.rank,values.title,values.tags

# Bad - returns full rationale for every value
vh list --json '{}'
```

## Best Practices

1. **Use schema introspection**: Run `vh schema <command>` to understand expected inputs
2. **Start with dry-run**: Always test mutating commands with `--dry-run` first
3. **Limit output**: Use `--fields` to reduce token consumption
4. **Validate inputs**: Check required fields before executing
5. **Handle errors gracefully**: Parse error responses and take appropriate action

## Warning

**The agent is not a trusted operator.** Build like it. Validate everything.
