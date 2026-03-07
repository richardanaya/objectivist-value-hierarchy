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

        const prop: Record<string, unknown> = {
          type: field.type,
          description: field.description,
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
