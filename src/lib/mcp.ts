import { getSchema, commandSchemas, CommandSchema } from './schema.js'
import {
  addValue,
  editValue,
  removeValue,
  getSuggestions,
  setHigherPriorityThan,
  listValues,
  readValues,
  writeValues,
  type Value,
} from '../commands/values.js'
import {
  logEmotion,
  listEmotions,
  listEmotionCategories,
  deleteEmotions,
} from '../commands/emotions.js'
import {
  captureAesthetic,
  listAesthetics,
  aestheticTypes,
} from '../commands/aesthetics.js'
import { loadTags } from './tags.js'
import path from 'path'


interface JSONRPCRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

interface JSONRPCResponse {
  jsonrpc: '2.0'
  id: string | number | null
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

interface Tool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

// Commands to exclude from MCP (CLI-only commands)
const EXCLUDED_COMMANDS = new Set(['schema', 'describe', 'mcp'])

// Map CLI command names to MCP tool names for clarity
const MCP_TOOL_NAMES: Record<string, string> = {
  add: 'add_value',
  edit: 'edit_value',
  remove: 'remove_value',
  list: 'list_values',
  tags: 'list_value_tags',
  'suggestions-to-improve': 'value_suggestions_to_improve',
  'set-higher-priority-than': 'set_value_higher_priority_than',
  'log-emotion': 'log_emotion',
  'list-emotions': 'list_emotions',
  'emotion-categories': 'emotion_categories',
  'delete-emotions': 'delete_emotions',
  'capture-aesthetic': 'capture_aesthetic',
  'list-aesthetics': 'list_aesthetics',
  'aesthetic-types': 'aesthetic_types',
}

export class MCPServer {
  private tools: Map<string, Tool> = new Map()
  private defaultFilePath: string

  constructor(defaultFilePath: string) {
    this.defaultFilePath = defaultFilePath
    this.registerTools()
  }

  private registerTools(): void {
    for (const schema of commandSchemas) {
      // Skip CLI-only commands
      if (EXCLUDED_COMMANDS.has(schema.name)) {
        continue
      }
      
      const tool = this.schemaToTool(schema)
      this.tools.set(tool.name, tool)
    }
  }

  private schemaToTool(schema: CommandSchema): Tool {
    const properties: Record<string, unknown> = {}
    const required: string[] = []

    // Use requestSchema if available, otherwise empty
    if (schema.requestSchema) {
      for (const [fieldName, field] of Object.entries(schema.requestSchema.properties)) {
        // Skip file parameter for MCP tools - they use the --file from CLI
        if (fieldName === 'file') {
          continue
        }

        // Custom field descriptions for MCP context
        const improvedFieldDescriptions: Record<string, Record<string, string>> = {
          'log-emotion': {
            emotion: 'The emotion to log (e.g., "joyful", "anxious", "grateful"). Will be normalized to lowercase. IMPORTANT: Check emotion_categories first and try to reuse existing emotion names for consistency.',
            notes: 'Optional notes about the emotion or context. Include details about what triggered the emotion or the situation.',
          },
          'capture-aesthetic': {
            title: 'Descriptive name for this aesthetic reference. Should be specific enough to identify the work.',
            type: 'Category: image, music, sculpture, architecture, film, literature, design, fashion, or other. Use aesthetic_types to see what you already have.',
            source: 'Artist, creator, architect, musician, or source of the work.',
            url: 'Link to the reference (image, video, article, etc.). Highly recommended for future reference.',
            tags: 'Pipe-separated descriptive tags: lighting, color, texture, mood, minimalism, baroque, etc.',
            why: 'CRUCIAL FIELD. Explain how this aesthetic connects to your value hierarchy. What values does it embody? Why does it resonate with you? This is the core objectivist insight.',
            context: 'Optional: Where/when you encountered this, any story around discovering it.',
          },
        }

        const customDesc = improvedFieldDescriptions[schema.name]?.[fieldName]

        const prop: Record<string, unknown> = {
          type: field.type,
          description: customDesc || field.description,
        }

        if (field.items) {
          prop.items = { type: field.items.type, description: field.items.description }
        }

        properties[fieldName] = prop

        // Check if field is required
        if (schema.requestSchema.required?.includes(fieldName)) {
          required.push(fieldName)
        }
      }
    }

    // Use mapped MCP name for clarity
    const mcpName = MCP_TOOL_NAMES[schema.name] || schema.name
    
    // Improve descriptions for MCP context
    const improvedDescriptions: Record<string, string> = {
      add_value: 'Add a new value to your personal value hierarchy with title, tags, and optional description',
      edit_value: 'Modify an existing value in your hierarchy - update title, tags, or description',
      remove_value: 'Delete a value from your hierarchy by its ID (title)',
      value_suggestions_to_improve: 'Get AI-generated suggestions to improve your value hierarchy, including comparison pairs and recommendations',
      set_value_higher_priority_than: 'Reorder your hierarchy by moving one value to be higher priority than another',
      list_values: 'List all values in your hierarchy in priority order, with optional filtering by tag or limit',
      list_value_tags: 'List all available value categories/tags from the Objectivist framework for categorizing your values',
      log_emotion: 'Log an emotion with optional notes to track emotional patterns over time. IMPORTANT: Try to use existing emotion categories for consistency - first call emotion_categories to see what emotions you have already logged. Emotions are always stored as lowercase.',
      list_emotions: 'List recent emotions from your emotion log, optionally filtered by days or limited count',
      emotion_categories: 'Get a distinct list of all emotion types you have logged, with occurrence counts and last logged timestamps. Use this BEFORE logging new emotions to see what categories already exist and maintain consistency.',
      delete_emotions: 'Delete emotions from the log within a specified time range. Use with caution - deleted emotions cannot be recovered. Specify from and/or to dates (ISO 8601 format, inclusive).',
      capture_aesthetic: 'Capture an aesthetic reference (image, music, sculpture, etc.) that embodies your values. Store art/media you find meaningful with connections to why it resonates. The "why" field is crucial - explain how this connects to your value hierarchy. This creates a concrete map of your abstract values for inspiration.',
      list_aesthetics: 'Browse your captured aesthetic references. Filter by type (image, music, etc.) or tags to find inspiration that aligns with your values.',
      aesthetic_types: 'Show distribution of aesthetic types (image, music, sculpture, etc.) with counts and percentages. See what kinds of art/media you value most.',
    }

    return {
      name: mcpName,
      description: improvedDescriptions[mcpName] || schema.description,
      inputSchema: {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      },
    }
  }

  listTools(): Tool[] {
    return Array.from(this.tools.values())
  }

  private async executeCommand(commandName: string, params: Record<string, unknown>): Promise<unknown> {
    // Resolve file path - always use the default file path from --file CLI option
    const filePath = this.defaultFilePath

    // Map MCP tool names back to internal command names
    const internalCommand = Object.entries(MCP_TOOL_NAMES).find(([_, mcpName]) => mcpName === commandName)?.[0] || commandName

    switch (internalCommand) {
      case 'add': {
        return await addValue(filePath, {
          title: params.title as string,
          tags: params.tags as string,
          desc: params.desc as string,
          detail: params.detail as boolean,
        })
      }

      case 'edit': {
        return await editValue(filePath, params.id as string, {
          title: params.title as string,
          tags: params.tags as string,
          desc: params.desc as string,
        })
      }

      case 'remove': {
        return await removeValue(filePath, params.id as string)
      }

      case 'suggestions-to-improve': {
        return await getSuggestions(filePath, (params.num as number) ?? 5)
      }

      case 'set-higher-priority-than': {
        return await setHigherPriorityThan(filePath, params.value as string, params.valueToBeAbove as string)
      }

      case 'list': {
        return await listValues(filePath, {
          limit: params.limit as number,
          tag: params.tag as string,
        })
      }

      case 'tags': {
        const tags = loadTags()
        return {
          type: 'master-tags',
          source: 'objectivist-lattice or fallback',
          timestamp: new Date().toISOString(),
          tags,
        }
      }

      case 'log-emotion': {
        return await logEmotion(filePath, {
          emotion: params.emotion as string,
          notes: params.notes as string,
        })
      }

      case 'list-emotions': {
        return await listEmotions(filePath, {
          days: params.days as number,
          limit: params.limit as number,
        })
      }

      case 'emotion-categories': {
        return await listEmotionCategories(filePath, {
          minCount: params.minCount as number,
        })
      }

      case 'delete-emotions': {
        return await deleteEmotions(filePath, {
          from: params.from as string,
          to: params.to as string,
        })
      }

      case 'capture-aesthetic': {
        return await captureAesthetic(filePath, {
          title: params.title as string,
          type: params.type as string,
          source: params.source as string,
          url: params.url as string,
          tags: params.tags as string,
          why: params.why as string,
          context: params.context as string,
        })
      }

      case 'list-aesthetics': {
        return await listAesthetics(filePath, {
          type: params.type as string,
          tag: params.tag as string,
          limit: params.limit as number,
        })
      }

      case 'aesthetic-types': {
        return await aestheticTypes(filePath)
      }

      default:
        throw new Error(`Command not implemented: ${commandName}`)
    }
  }

  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse | null> {
    const { id, method, params = {} } = request

    console.error(`[MCP] Received: ${method} (id: ${id ?? 'notification'})`)

    try {
      switch (method) {
        case 'initialize':
          console.error('[MCP] Handling initialize')
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: 'vh',
                version: '0.2.0',
              },
            },
          }

        case 'notifications/initialized':
          console.error('[MCP] Client initialized notification received')
          return null

        case 'tools/list':
          console.error('[MCP] Handling tools/list')
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: { tools: this.listTools() },
          }

        case 'tools/call': {
          const toolName = params.name as string
          const toolParams = (params.arguments as Record<string, unknown>) || {}

          console.error(`[MCP] tools/call: ${toolName}`)

          if (!this.tools.has(toolName)) {
            console.error(`[MCP] Tool not found: ${toolName}`)
            return {
              jsonrpc: '2.0',
              id: id ?? null,
              error: {
                code: -32601,
                message: `Tool not found: ${toolName}`,
              },
            }
          }

          console.error(`[MCP] Executing: ${toolName}`)
          try {
            const result = await this.executeCommand(toolName, toolParams)
            console.error(`[MCP] Success: ${toolName}, result:`, JSON.stringify(result).slice(0, 100))

            // Format result according to MCP spec (content array with text)
            const mcpResult = {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
              isError: false,
            }

            return {
              jsonrpc: '2.0',
              id: id ?? null,
              result: mcpResult,
            }
          } catch (err) {
            console.error(`[MCP] Error executing ${toolName}:`, err)

            // Format error according to MCP spec
            const errorResult = {
              content: [
                {
                  type: 'text',
                  text: err instanceof Error ? err.message : String(err),
                },
              ],
              isError: true,
            }

            return {
              jsonrpc: '2.0',
              id: id ?? null,
              result: errorResult,
            }
          }
        }

        default:
          console.error(`[MCP] Unknown method: ${method}`)
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          }
      }
    } catch (error) {
      console.error(`[MCP] Error:`, error)
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      }
    }
  }

  async processStdio(): Promise<void> {
    const { stdin, stdout } = process

    stdin.setEncoding('utf-8')
    stdin.resume()

    let buffer = ''

    stdin.on('data', async (chunk: string) => {
      buffer += chunk

      // Process complete lines (JSON-RPC messages)
      let newlineIndex: number
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)

        if (line.length === 0) continue

        try {
          const request = JSON.parse(line) as JSONRPCRequest
          const response = await this.handleRequest(request)
          if (response !== null) {
            stdout.write(JSON.stringify(response) + '\n')
          }
        } catch (error) {
          const errorResponse: JSONRPCResponse = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32700,
              message: 'Parse error',
              data: error instanceof Error ? error.message : 'Invalid JSON',
            },
          }
          stdout.write(JSON.stringify(errorResponse) + '\n')
        }
      }
    })

    // Wait for stdin to end
    return new Promise(resolve => {
      stdin.on('end', () => {
        resolve()
      })
    })
  }
}
