# objectivist-value-hierarchy

AI Assistant Tool for Conducting Objectivist Value Hierarchy Interviews with Humans

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Repository: [git@github.com:richardanaya/objectivist-value-hierarchy.git](git@github.com:richardanaya/objectivist-value-hierarchy.git)

## Purpose

This CLI exists solely for use by an AI assistant during live conversations with a human.
It helps the AI systematically elicit, refine, and maintain the human's personal Objectivist value hierarchy (life as the ultimate standard of value, productive achievement as the central integrating purpose).

Each hierarchy lives in its own single, portable CSV file.

## Installation

```bash
npm install -g objectivist-value-hierarchy
```

## Recommended AI Workflow During a Conversation

1. `value-hierarchy init personal.csv`
2. `value-hierarchy add personal.csv "New Value" --tags "tag1|tag2" --detail`
3. `value-hierarchy interview personal.csv --personality`
   → Use the generated protocol to interview the human naturally, adding new values as they emerge and probing for rationales
4. `value-hierarchy pairs personal.csv --num 5`
   → Generate comparison pairs including new vs old and old vs old
5. After the human answers, `value-hierarchy update-scores personal.csv --responses "A>B,C>D"`
6. Refine rationales: Use `value-hierarchy rationale personal.csv <id> --update "New rationale"` to update based on interview insights
7. `value-hierarchy top10 personal.csv`
   → Show the human their updated ranking immediately

## Commands

- `init <file>`: Create a new CSV hierarchy file
- `add <file> <title> [--detail]`: Add a new value to the hierarchy
- `edit <file> <id> [--title] [--tags] [--desc]`: Edit an existing value
- `rationale <file> <id> [--update <string>]`: Display or update the rationale for a value
- `remove <file> <id>`: Remove a value from the hierarchy
- `interview <file> [--personality]`: Generate full interview protocol
- `pairs <file> [--num N]`: Generate list of comparison pairs
- `update-scores <file> --responses`: Apply fixed-point score updates (winner +10, loser -10) from interview responses
- `top10 <file> [--tag TAG]`: Show the current Top 10 values (primary view to share with human)
- `list <file> [--limit N] [--tag TAG]`: List all values sorted by importance
- `hierarchy <file>`: Show full hierarchy grouped by tags
- `validate <file>`: Check file integrity and suggest improvements
- `stats <file>`: Show statistics and insights
- `guide`: Show value specificity guidelines
- `feedback <message>`: Log feedback for improvements
- `tags`: Show master tag list from objectivist-lattice

## Examples

```bash
value-hierarchy init ./personal.csv
value-hierarchy add personal.csv "Daily Walking" --detail
value-hierarchy interview ~/hierarchies/career.csv --personality
value-hierarchy pairs personal.csv --num 5
value-hierarchy update-scores personal.csv --responses "Life>Health,Reason>Purpose"
value-hierarchy rationale personal.csv 20240101120000-daily-walking --update "Promotes health and vitality, aligning with life as ultimate value"
value-hierarchy top10 personal.csv --tag productivity
```

Run `value-hierarchy <command> --help` for detailed help on a command.