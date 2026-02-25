# objectivist-value-hierarchy

AI Assistant Tool for Conducting Objectivist Value Hierarchy Interviews with Humans

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Repository: [git@github.com:richardanaya/objectivist-value-hierarchy.git](git@github.com:richardanaya/objectivist-value-hierarchy.git)

## Purpose

This CLI exists solely for use by an AI assistant during live conversations with a human.
It helps the AI systematically elicit, refine, and maintain the human's personal Objectivist value hierarchy (life as the ultimate standard of value, productive achievement as the central integrating purpose).

Each hierarchy lives in its own single, portable file named `<name>.values.csv` (e.g. personal.values.csv, career.values.csv, 2026-review.values.csv).

## Installation

```bash
npm install -g objectivist-value-hierarchy
```

## Recommended AI Workflow During a Conversation

1. `value-hierarchy init --seed personal.values.csv`
2. `value-hierarchy add personal.values.csv "New Value" --tags "tag1|tag2"`
3. `value-hierarchy interview personal.values.csv --num 5`
   → Use the generated protocol to interview the human naturally
4. After the human answers, manually edit the .values.csv file to update scores and comparisonCount
5. `value-hierarchy top10 personal.values.csv`
   → Show the human their updated ranking immediately

## Commands

- `init <file> [--seed]`: Create a new .values.csv hierarchy file
- `add <file> <title>`: Add a new value to the hierarchy
- `interview <file> [--num N]`: Generate full interview protocol + comparison pairs
- `top10 <file> [--tag TAG]`: Show the current Top 10 values (primary view to share with human)
- `list <file> [--limit N] [--tag TAG]`: List all values sorted by importance
- `hierarchy <file>`: Show full hierarchy grouped by tags
- `stats <file>`: Show statistics and insights
- `tags`: Show master tag list from objectivist-lattice

## Examples

```bash
value-hierarchy init --seed ./personal.values.csv
value-hierarchy interview ~/hierarchies/career.values.csv --num 5
value-hierarchy top10 personal.values.csv --tag productivity
```

Run `value-hierarchy <command> --help` for detailed help on a command.