import { encode } from '@toon-format/toon'

export type OutputFormat = 'toon' | 'json' | 'ndjson' | 'auto'

export interface OutputOptions {
  format: OutputFormat
  fields?: string[]
}

function isTTY(): boolean {
  try {
    return process.stdout.isTTY === true
  } catch {
    return false
  }
}

export function detectOutputFormat(preferredFormat: OutputFormat = 'auto'): 'toon' | 'json' {
  if (preferredFormat === 'auto') {
    return isTTY() ? 'toon' : 'json'
  }
  return preferredFormat === 'toon' ? 'toon' : 'json'
}

export function filterFields(data: unknown, fields?: string[]): unknown {
  if (!fields || fields.length === 0) {
    return data
  }

  if (Array.isArray(data)) {
    return data.map(item => filterFields(item, fields))
  }

  if (data === null || typeof data !== 'object') {
    return data
  }

  const result: Record<string, unknown> = {}
  const dataObj = data as Record<string, unknown>

  // Group fields by their first path component
  const fieldGroups = new Map<string, string[]>()
  const rootFields: string[] = []

  for (const field of fields) {
    const parts = field.split('.')
    if (parts.length === 1) {
      rootFields.push(field)
    } else {
      const firstPart = parts[0]
      const restPath = parts.slice(1).join('.')
      if (!fieldGroups.has(firstPart)) {
        fieldGroups.set(firstPart, [])
      }
      fieldGroups.get(firstPart)!.push(restPath)
    }
  }

  // Handle root level fields
  for (const field of rootFields) {
    if (field in dataObj) {
      result[field] = dataObj[field]
    }
  }

  // Handle nested fields
  for (const [firstPart, subFields] of fieldGroups) {
    if (firstPart in dataObj) {
      const firstValue = dataObj[firstPart]

      if (Array.isArray(firstValue)) {
        // Filter array elements - collect all requested sub-fields for each item
        result[firstPart] = firstValue.map(item => {
          if (item !== null && typeof item === 'object') {
            const filteredItem: Record<string, unknown> = {}
            for (const subField of subFields) {
              // Handle multi-level nesting (e.g., "a.b.c")
              const subParts = subField.split('.')
              let current: unknown = item
              let valid = true
              for (const part of subParts) {
                if (current !== null && typeof current === 'object' && part in current) {
                  current = (current as Record<string, unknown>)[part]
                } else {
                  valid = false
                  break
                }
              }
              if (valid) {
                // Set the value at the first level of subField
                const firstSubPart = subParts[0]
                if (subParts.length === 1) {
                  filteredItem[firstSubPart] = current
                } else {
                  // For nested paths, build the structure
                  let target: Record<string, unknown> = filteredItem
                  for (let i = 0; i < subParts.length - 1; i++) {
                    const part = subParts[i]
                    if (!(part in target)) {
                      target[part] = {}
                    }
                    target = target[part] as Record<string, unknown>
                  }
                  target[subParts[subParts.length - 1]] = current
                }
              }
            }
            return filteredItem
          }
          return item
        })
      } else if (firstValue !== null && typeof firstValue === 'object') {
        // For nested objects, recursively filter
        result[firstPart] = filterFields(firstValue, subFields)
      } else {
        // Primitive value at nested path
        result[firstPart] = firstValue
      }
    }
  }

  return result
}

export function formatOutput(data: unknown, options: OutputOptions | boolean): string {
  let format: OutputFormat
  let fields: string[] | undefined

  if (typeof options === 'boolean') {
    format = options ? 'json' : 'auto'
  } else {
    format = options.format
    fields = options.fields
  }

  const filteredData = filterFields(data, fields)

  switch (format) {
    case 'toon':
      return encode(filteredData)
    case 'json':
      return JSON.stringify(filteredData, null, 2)
    case 'ndjson':
      if (Array.isArray(filteredData)) {
        return filteredData.map(item => JSON.stringify(item)).join('\n')
      }
      return JSON.stringify(filteredData)
    case 'auto':
    default:
      return isTTY() ? encode(filteredData) : JSON.stringify(filteredData, null, 2)
  }
}

export function formatNDJSON(data: unknown[]): string {
  return data.map(item => JSON.stringify(item)).join('\n')
}
