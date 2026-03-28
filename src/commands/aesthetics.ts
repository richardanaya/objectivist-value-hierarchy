import fs from 'fs-extra'
import path from 'path'
import crypto from 'crypto'

export interface Aesthetic {
  id: string
  title: string
  type: string
  source: string
  url: string
  tags: string
  why: string
  context: string
  addedAt: string
}

// Generate a short unique ID
function generateId(): string {
  return crypto.randomBytes(4).toString('hex') // 8 character hex string
}

export interface CaptureAestheticOptions {
  title: string
  type: string
  source?: string
  url?: string
  tags?: string
  why?: string
  context?: string
}

export interface ListAestheticsOptions {
  type?: string
  tag?: string
  limit?: number
}

export interface AestheticType {
  type: string
  count: number
  percentage: number
}

export interface AestheticCategory {
  tag: string
  count: number
  aesthetics: { title: string; id: string }[]
}

// Parse aesthetics from markdown content - looks for ## Aesthetic References section
export function parseAesthetics(content: string): Aesthetic[] {
  const aesthetics: Aesthetic[] = []
  const lines = content.split('\n')
  
  let inAesthetics = false
  
  for (const line of lines) {
    // Check for aesthetics header
    if (line.trim() === '## Aesthetic References') {
      inAesthetics = true
      continue
    }
    
    if (!inAesthetics) continue
    
    // Stop at next section header
    if (line.match(/^## /)) {
      break
    }
    
    // Parse table row | ID | Title | Type | Source | URL | Tags | Value Connection | Added |
    const match = line.match(/^\| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \| ([^|]*) \|$/)
    if (match) {
      const id = match[1].trim()
      const title = match[2].trim()
      const type = match[3].trim()
      const source = match[4].trim()
      const url = match[5].trim()
      const tags = match[6].trim()
      const why = match[7].trim()
      const addedAt = match[8].trim()
      
      // Skip header row
      if (id === 'ID' || id.match(/^-+$/)) continue
      
      aesthetics.push({
        id,
        title,
        type,
        source,
        url,
        tags,
        why,
        context: '', // Context not stored in table for brevity
        addedAt
      })
    }
  }
  
  return aesthetics
}

// Format URL as markdown link or plain text
function formatUrl(url: string): string {
  if (!url) return ''
  // If URL is long, just show "link" as text
  if (url.length > 40) {
    return `[link](${url})`
  }
  return url
}

// Format aesthetics as markdown table
function formatAestheticsTable(aesthetics: Aesthetic[]): string {
  if (aesthetics.length === 0) {
    return '## Aesthetic References\n\n*No aesthetic references captured yet.*\n'
  }
  
  let markdown = '## Aesthetic References\n\n'
  markdown += '| ID | Title | Type | Source | URL | Tags | Value Connection | Added |\n'
  markdown += '|----|-------|------|--------|-----|------|------------------|-------|\n'
  
  for (const a of aesthetics) {
    const urlDisplay = formatUrl(a.url)
    const whyDisplay = a.why.length > 50 ? a.why.substring(0, 47) + '...' : a.why
    markdown += `| ${a.id} | ${a.title} | ${a.type} | ${a.source} | ${urlDisplay} | ${a.tags} | ${whyDisplay} | ${a.addedAt} |\n`
  }
  
  return markdown + '\n'
}

// Remove aesthetics section from content
export function stripAesthetics(content: string): string {
  const lines = content.split('\n')
  let result: string[] = []
  let inAesthetics = false
  
  for (const line of lines) {
    if (line.trim() === '## Aesthetic References') {
      inAesthetics = true
      continue
    }
    
    if (inAesthetics) {
      if (line.match(/^## /)) {
        inAesthetics = false
        result.push(line)
      }
      continue
    }
    
    result.push(line)
  }
  
  // Remove trailing empty lines
  while (result.length > 0 && result[result.length - 1].trim() === '') {
    result.pop()
  }
  
  return result.join('\n')
}

export async function captureAesthetic(
  filePath: string, 
  options: CaptureAestheticOptions
): Promise<{ success: boolean; message: string; aesthetic: Aesthetic }> {
  // Auto-create directory if file doesn't exist
  if (!await fs.pathExists(filePath)) {
    await fs.ensureDir(path.dirname(filePath))
    await fs.writeFile(filePath, `# Value Hierarchy\n\n## Summary\n- **Total Values**: 0\n- **Total Comparisons**: 0\n- **Last Updated**: ${new Date().toISOString()}\n\n*No values added yet.*\n`)
  }
  
  const content = await fs.readFile(filePath, 'utf8')
  
  // Parse existing aesthetics
  const aesthetics = parseAesthetics(content)
  
  // Normalize type to lowercase
  const normalizedType = options.type.toLowerCase().trim()
  
  // Create new aesthetic entry with unique ID
  const newAesthetic: Aesthetic = {
    id: generateId(),
    title: options.title,
    type: normalizedType,
    source: options.source || '',
    url: options.url || '',
    tags: options.tags || '',
    why: options.why || '',
    context: options.context || '',
    addedAt: new Date().toISOString()
  }
  
  aesthetics.push(newAesthetic)
  
  // Strip old aesthetics section and append new one
  const baseContent = stripAesthetics(content)
  const aestheticsSection = formatAestheticsTable(aesthetics)
  const newContent = baseContent + '\n\n' + aestheticsSection
  
  await fs.writeFile(filePath, newContent)
  
  return {
    success: true,
    message: `Captured aesthetic "${options.title}" (${normalizedType}) with ID ${newAesthetic.id}`,
    aesthetic: newAesthetic
  }
}

export async function listAesthetics(
  filePath: string, 
  options: ListAestheticsOptions
): Promise<{
  type: string
  file: string
  timestamp: string
  filter: { type?: string; tag?: string; limit?: number }
  count: number
  aesthetics: Aesthetic[]
}> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File "${filePath}" does not exist.`)
  }
  
  const content = await fs.readFile(filePath, 'utf8')
  let aesthetics = parseAesthetics(content)
  
  // Filter by type
  if (options.type) {
    aesthetics = aesthetics.filter(a => a.type === options.type!.toLowerCase())
  }
  
  // Filter by tag
  if (options.tag) {
    aesthetics = aesthetics.filter(a => a.tags.split('|').includes(options.tag!))
  }
  
  // Sort by added date descending (most recent first)
  aesthetics.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
  
  const totalCount = aesthetics.length
  
  // Limit if specified
  if (options.limit !== undefined && options.limit > 0) {
    aesthetics = aesthetics.slice(0, options.limit)
  }
  
  return {
    type: 'aesthetic-list',
    file: filePath,
    timestamp: new Date().toISOString(),
    filter: {
      type: options.type,
      tag: options.tag,
      limit: options.limit
    },
    count: totalCount,
    aesthetics
  }
}

export async function aestheticTypes(
  filePath: string
): Promise<{
  type: string
  file: string
  timestamp: string
  total: number
  types: AestheticType[]
}> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File "${filePath}" does not exist.`)
  }
  
  const content = await fs.readFile(filePath, 'utf8')
  const aesthetics = parseAesthetics(content)
  
  // Count by type
  const typeCounts = new Map<string, number>()
  for (const a of aesthetics) {
    typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1)
  }
  
  // Convert to array with percentages
  const total = aesthetics.length
  const types: AestheticType[] = Array.from(typeCounts.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
  
  return {
    type: 'aesthetic-types',
    file: filePath,
    timestamp: new Date().toISOString(),
    total,
    types
  }
}

export async function editAesthetic(
  filePath: string,
  id: string,
  options: { title?: string; type?: string; source?: string; url?: string; tags?: string; why?: string }
): Promise<{
  success: boolean
  message: string
  aesthetic: Aesthetic
}> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File "${filePath}" does not exist.`)
  }
  
  const content = await fs.readFile(filePath, 'utf8')
  const aesthetics = parseAesthetics(content)
  
  const aestheticIndex = aesthetics.findIndex(a => a.id === id)
  if (aestheticIndex === -1) {
    throw new Error(`Aesthetic with ID "${id}" not found.`)
  }
  
  const aesthetic = aesthetics[aestheticIndex]
  
  // Update fields
  if (options.title !== undefined) aesthetic.title = options.title
  if (options.type !== undefined) aesthetic.type = options.type.toLowerCase().trim()
  if (options.source !== undefined) aesthetic.source = options.source
  if (options.url !== undefined) aesthetic.url = options.url
  if (options.tags !== undefined) aesthetic.tags = options.tags
  if (options.why !== undefined) aesthetic.why = options.why
  
  // Rebuild the file with updated aesthetics
  const baseContent = stripAesthetics(content)
  const aestheticsSection = formatAestheticsTable(aesthetics)
  const newContent = baseContent + '\n\n' + aestheticsSection
  
  await fs.writeFile(filePath, newContent)
  
  return {
    success: true,
    message: `Edited aesthetic ${id}`,
    aesthetic
  }
}

export async function removeAesthetic(
  filePath: string,
  id: string
): Promise<{
  success: boolean
  message: string
}> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File "${filePath}" does not exist.`)
  }
  
  const content = await fs.readFile(filePath, 'utf8')
  const aesthetics = parseAesthetics(content)
  
  const aestheticIndex = aesthetics.findIndex(a => a.id === id)
  if (aestheticIndex === -1) {
    throw new Error(`Aesthetic with ID "${id}" not found.`)
  }
  
  // Remove the aesthetic
  aesthetics.splice(aestheticIndex, 1)
  
  // Rebuild the file with remaining aesthetics
  const baseContent = stripAesthetics(content)
  const aestheticsSection = formatAestheticsTable(aesthetics)
  const newContent = baseContent + '\n\n' + aestheticsSection
  
  await fs.writeFile(filePath, newContent)
  
  return {
    success: true,
    message: `Removed aesthetic ${id} from ${filePath}`
  }
}
