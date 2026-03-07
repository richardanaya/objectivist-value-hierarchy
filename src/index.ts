#!/usr/bin/env node

import { Command, Option } from 'commander'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
  addValue,
  editValue,
  removeValue,
  getSuggestions,
  setHigherPriorityThan,
  listValues,
} from './commands/values.js'
import { loadTags } from './lib/tags.js'
import { getSchema, getMutatingCommands } from './lib/schema.js'
import { formatOutput, OutputFormat } from './lib/output.js'
import { MCPServer } from './lib/mcp.js'
import path from 'path'
import {
  AddValueSchema,
  EditValueSchema,
  RemoveValueSchema,
  SetHigherPrioritySchema,
  ListValuesSchema,
  SuggestionsSchema,
  parseJsonWithSchema,
} from './lib/validation.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'))

let isDryRun = false
let currentDir = process.cwd()

function getOutputFormat(opts: { output?: string }): OutputFormat {
  // Check explicit --output flag first
  const outputFormat = opts.output?.toLowerCase()
  if (outputFormat === 'json') return 'json'
  if (outputFormat === 'ndjson') return 'ndjson'
  if (outputFormat === 'toon') return 'toon'
  if (outputFormat === 'auto') return 'auto'

  // Check environment variable as fallback
  const envFormat = process.env.VH_OUTPUT_FORMAT?.toLowerCase()
  if (envFormat === 'json') return 'json'
  if (envFormat === 'ndjson') return 'ndjson'
  if (envFormat === 'toon') return 'toon'
  if (envFormat === 'auto') return 'auto'

  return 'auto'
}

function getFields(opts: { fields?: string }): string[] | undefined {
  if (!opts.fields) return undefined
  return opts.fields
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0)
}

function formatWithOptions(data: unknown, opts: { output?: string; fields?: string }): string {
  const format = getOutputFormat(opts)
  const fields = getFields(opts)
  return formatOutput(data, { format, fields })
}

// Helper to check if dry-run should be applied
function shouldExecute(commandName: string): boolean {
  if (!isDryRun) return true

  const mutatingCommands = getMutatingCommands()
  if (mutatingCommands.includes(commandName)) {
    console.log(`[DRY-RUN] Would execute: ${commandName}`)
    return false
  }
  return true
}

// Resolve file path relative to current directory
function resolveFile(file?: string): string {
  if (!file) return path.join(currentDir, 'value-hierarchy.md')
  if (path.isAbsolute(file)) return file
  return path.join(currentDir, file)
}

const program = new Command()

program
  .name('vh')
  .description('Manage a personal value hierarchy in Markdown files')
  .version(packageJson.version)
  .addOption(new Option('--output <format>', 'Output format (json, ndjson, toon, auto)').env('VH_OUTPUT_FORMAT'))
  .addOption(new Option('--fields <fields>', 'Comma-separated list of fields to include in output'))
  .addOption(new Option('--dry-run', 'Validate commands without executing mutating operations'))
  .hook('preAction', async (thisCommand) => {
    const opts = thisCommand.opts()
    isDryRun = opts.dryRun || false
  })

// Schema introspection commands
program
  .command('schema')
  .description('Show schema for a specific command or all commands')
  .argument('[command]', 'Command name to show schema for (omit for all commands)')
  .action(async (commandName: string | undefined, _cmd) => {
    const opts = program.opts()
    const schema = getSchema(commandName)

    if (commandName && !schema) {
      console.log(formatWithOptions({ error: `Unknown command: ${commandName}` }, opts))
      process.exit(1)
    }

    console.log(formatWithOptions(schema, opts))
  })

program
  .command('describe')
  .description('Describe available commands (alias for schema)')
  .argument('[command]', 'Command name to describe (omit for all commands)')
  .action(async (commandName: string | undefined, _cmd) => {
    const opts = program.opts()
    const schema = getSchema(commandName)

    if (commandName && !schema) {
      console.log(formatWithOptions({ error: `Unknown command: ${commandName}` }, opts))
      process.exit(1)
    }

    console.log(formatWithOptions(schema, opts))
  })

// Value management commands
program
  .command('add')
  .description('Add a value to the hierarchy')
  .requiredOption('--json <json>', 'Full JSON payload with title and optional fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse and validate JSON using Zod
    const parseResult = parseJsonWithSchema(options.json, AddValueSchema)
    if (!parseResult.success) {
      console.log(formatWithOptions({ error: parseResult.error }, opts))
      process.exit(1)
    }
    const data = parseResult.data

    const filePath = resolveFile(data.file)

    if (!shouldExecute('add')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'add',
            params: { file: filePath, title: data.title, tags: data.tags, desc: data.desc, detail: data.detail },
          },
          opts
        )
      )
      return
    }

    try {
      const result = await addValue(filePath, {
        title: data.title,
        tags: data.tags,
        desc: data.desc,
        detail: data.detail,
      })
      console.log(formatWithOptions(result, opts))
    } catch (err) {
      console.log(formatWithOptions({ error: err instanceof Error ? err.message : String(err) }, opts))
      process.exit(1)
    }
  })

program
  .command('edit')
  .description('Edit an existing value')
  .requiredOption('--json <json>', 'Full JSON payload with id and optional fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse and validate JSON using Zod
    const parseResult = parseJsonWithSchema(options.json, EditValueSchema)
    if (!parseResult.success) {
      console.log(formatWithOptions({ error: parseResult.error }, opts))
      process.exit(1)
    }
    const data = parseResult.data

    const filePath = resolveFile(data.file)

    if (!shouldExecute('edit')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'edit',
            params: { file: filePath, id: data.id, title: data.title, tags: data.tags, desc: data.desc },
          },
          opts
        )
      )
      return
    }

    try {
      const result = await editValue(filePath, data.id, {
        title: data.title,
        tags: data.tags,
        desc: data.desc,
      })
      console.log(formatWithOptions(result, opts))
    } catch (err) {
      console.log(formatWithOptions({ error: err instanceof Error ? err.message : String(err) }, opts))
      process.exit(1)
    }
  })

program
  .command('remove')
  .description('Remove a value from the hierarchy')
  .requiredOption('--json <json>', 'Full JSON payload with id field')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse and validate JSON using Zod
    const parseResult = parseJsonWithSchema(options.json, RemoveValueSchema)
    if (!parseResult.success) {
      console.log(formatWithOptions({ error: parseResult.error }, opts))
      process.exit(1)
    }
    const data = parseResult.data

    const filePath = resolveFile(data.file)

    if (!shouldExecute('remove')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'remove',
            params: { file: filePath, id: data.id },
          },
          opts
        )
      )
      return
    }

    try {
      const result = await removeValue(filePath, data.id)
      console.log(formatWithOptions(result, opts))
    } catch (err) {
      console.log(formatWithOptions({ error: err instanceof Error ? err.message : String(err) }, opts))
      process.exit(1)
    }
  })

program
  .command('suggestions-to-improve')
  .description('Get suggestions for improving your value hierarchy (comparison pairs and recommendations)')
  .option('--json <json>', 'JSON payload with optional file and num fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse and validate JSON using Zod
    let data: { file?: string; num?: number } = {}
    if (options.json) {
      const parseResult = parseJsonWithSchema(options.json, SuggestionsSchema)
      if (!parseResult.success) {
        console.log(formatWithOptions({ error: parseResult.error }, opts))
        process.exit(1)
      }
      data = parseResult.data
    }

    const filePath = resolveFile(data.file)
    const num = data.num ?? 5

    try {
      const result = await getSuggestions(filePath, num)
      console.log(formatWithOptions(result, opts))
    } catch (err) {
      console.log(formatWithOptions({ error: err instanceof Error ? err.message : String(err) }, opts))
      process.exit(1)
    }
  })

program
  .command('set-higher-priority-than')
  .description('Reorder: move a value above another in priority')
  .requiredOption('--json <json>', 'Full JSON payload with value and valueToBeAbove fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse and validate JSON using Zod
    const parseResult = parseJsonWithSchema(options.json, SetHigherPrioritySchema)
    if (!parseResult.success) {
      console.log(formatWithOptions({ error: parseResult.error }, opts))
      process.exit(1)
    }
    const data = parseResult.data

    const filePath = resolveFile(data.file)

    if (!shouldExecute('set-higher-priority-than')) {
      console.log(
        formatWithOptions(
          {
            dryRun: true,
            command: 'set-higher-priority-than',
            params: { file: filePath, value: data.value, valueToBeAbove: data.valueToBeAbove },
          },
          opts
        )
      )
      return
    }

    try {
      const result = await setHigherPriorityThan(filePath, data.value, data.valueToBeAbove)
      console.log(formatWithOptions(result, opts))
    } catch (err) {
      console.log(formatWithOptions({ error: err instanceof Error ? err.message : String(err) }, opts))
      process.exit(1)
    }
  })

program
  .command('list')
  .description('List values in priority order')
  .option('--json <json>', 'JSON payload with optional file, limit, and tag fields')
  .action(async (options, command) => {
    const opts = command.optsWithGlobals()

    // Parse and validate JSON using Zod (empty object is valid for list)
    let data: { file?: string; limit?: number; tag?: string } = {}
    if (options.json) {
      const parseResult = parseJsonWithSchema(options.json, ListValuesSchema)
      if (!parseResult.success) {
        console.log(formatWithOptions({ error: parseResult.error }, opts))
        process.exit(1)
      }
      data = parseResult.data
    }

    const filePath = resolveFile(data.file)

    try {
      const result = await listValues(filePath, {
        limit: data.limit,
        tag: data.tag,
      })
      console.log(formatWithOptions(result, opts))
    } catch (err) {
      console.log(formatWithOptions({ error: err instanceof Error ? err.message : String(err) }, opts))
      process.exit(1)
    }
  })

program
  .command('tags')
  .description('Show available tags (master list from objectivist-lattice or fallback)')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    
    const masterTags = loadTags()
    
    const data = {
      type: 'master-tags',
      source: 'objectivist-lattice or fallback',
      timestamp: new Date().toISOString(),
      tags: masterTags
    }
    console.log(formatWithOptions(data, opts))
  })

// Context and agents commands
program
  .command('context')
  .description('Show context window discipline guidelines')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    try {
      const content = readFileSync(join(__dirname, '../CONTEXT.md'), 'utf-8')
      console.log(content)
    } catch {
      console.log(formatWithOptions({ error: 'CONTEXT.md not found' }, opts))
      process.exit(1)
    }
  })

program
  .command('agents')
  .description('Show agent security guidelines')
  .action(async (_args, command) => {
    const opts = command.optsWithGlobals()
    try {
      const content = readFileSync(join(__dirname, '../AGENTS.md'), 'utf-8')
      console.log(content)
    } catch {
      console.log(formatWithOptions({ error: 'AGENTS.md not found' }, opts))
      process.exit(1)
    }
  })

// MCP Server command
program
  .command('mcp')
  .description('Run as an MCP (Model Context Protocol) server')
  .option('--file <path>', 'Path to the value hierarchy markdown file to use as the database', 'value-hierarchy.md')
  .action(async (options) => {
    const filePath = path.isAbsolute(options.file) ? options.file : path.join(currentDir, options.file)
    const server = new MCPServer(filePath)
    await server.processStdio()
  })

program.parse()
