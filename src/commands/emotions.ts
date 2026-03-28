import fs from 'fs-extra'
import path from 'path'

export interface Emotion {
  timestamp: string
  emotion: string
  notes: string
}

export interface LogEmotionOptions {
  emotion: string
  notes?: string
}

export interface ListEmotionsOptions {
  days?: number
  limit?: number
}

// Parse emotions from markdown content - looks for ## Emotion Log section
export function parseEmotions(content: string): Emotion[] {
  const emotions: Emotion[] = []
  const lines = content.split('\n')
  
  let inEmotionLog = false
  
  for (const line of lines) {
    // Check for emotion log header
    if (line.trim() === '## Emotion Log') {
      inEmotionLog = true
      continue
    }
    
    if (!inEmotionLog) continue
    
    // Stop at next section header
    if (line.match(/^## /)) {
      break
    }
    
    // Parse emotion table row | Timestamp | Emotion | Notes |
    const match = line.match(/^\| ([^|]+) \| ([^|]+) \| ([^|]*) \|$/)
    if (match) {
      const timestamp = match[1].trim()
      const emotion = match[2].trim()
      const notes = match[3].trim()
      
      // Skip header row
      if (timestamp === 'Timestamp' || timestamp.match(/^-+$/)) continue
      
      emotions.push({
        timestamp,
        emotion,
        notes
      })
    }
  }
  
  return emotions
}

// Format emotions as markdown table
function formatEmotionsTable(emotions: Emotion[]): string {
  if (emotions.length === 0) {
    return '## Emotion Log\n\n*No emotions logged yet.*\n'
  }
  
  let markdown = '## Emotion Log\n\n'
  markdown += '| Timestamp | Emotion | Notes |\n'
  markdown += '|-----------|---------|-------|\n'
  
  for (const e of emotions) {
    markdown += `| ${e.timestamp} | ${e.emotion} | ${e.notes} |\n`
  }
  
  return markdown
}

// Remove emotion log section from content (used when rewriting)
export function stripEmotionLog(content: string): string {
  const lines = content.split('\n')
  let result: string[] = []
  let inEmotionLog = false
  
  for (const line of lines) {
    if (line.trim() === '## Emotion Log') {
      inEmotionLog = true
      continue
    }
    
    if (inEmotionLog) {
      if (line.match(/^## /)) {
        inEmotionLog = false
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

export async function logEmotion(filePath: string, options: LogEmotionOptions): Promise<{ success: boolean; message: string; emotion: Emotion }> {
  // Auto-create directory if file doesn't exist
  if (!await fs.pathExists(filePath)) {
    await fs.ensureDir(path.dirname(filePath))
    // Create empty value hierarchy file
    await fs.writeFile(filePath, `# Value Hierarchy\n\n## Summary\n- **Total Values**: 0\n- **Total Comparisons**: 0\n- **Last Updated**: ${new Date().toISOString()}\n\n*No values added yet.*\n`)
  }
  
  const content = await fs.readFile(filePath, 'utf8')
  
  // Parse existing emotions
  const emotions = parseEmotions(content)
  
  // Normalize emotion to lowercase
  const normalizedEmotion = options.emotion.toLowerCase().trim()
  
  // Create new emotion entry
  const newEmotion: Emotion = {
    timestamp: new Date().toISOString(),
    emotion: normalizedEmotion,
    notes: options.notes || ''
  }
  
  // Add to end (chronological order)
  emotions.push(newEmotion)
  
  // Strip old emotion log and append new one
  const baseContent = stripEmotionLog(content)
  const emotionSection = formatEmotionsTable(emotions)
  const newContent = baseContent + '\n\n' + emotionSection
  
  await fs.writeFile(filePath, newContent)
  
  return {
    success: true,
    message: `Logged emotion "${normalizedEmotion}" at ${newEmotion.timestamp}`,
    emotion: newEmotion
  }
}

export async function listEmotions(filePath: string, options: ListEmotionsOptions): Promise<{ 
  type: string
  file: string
  timestamp: string
  filter: { days?: number; limit?: number }
  count: number
  emotions: Emotion[]
}> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File "${filePath}" does not exist.`)
  }
  
  const content = await fs.readFile(filePath, 'utf8')
  let emotions = parseEmotions(content)
  
  // Filter by days if specified
  if (options.days !== undefined) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - options.days)
    emotions = emotions.filter(e => new Date(e.timestamp) >= cutoff)
  }
  
  // Sort by timestamp descending (most recent first)
  emotions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  // Limit if specified
  const totalCount = emotions.length
  if (options.limit !== undefined && options.limit > 0) {
    emotions = emotions.slice(0, options.limit)
  }
  
  return {
    type: 'emotion-list',
    file: filePath,
    timestamp: new Date().toISOString(),
    filter: {
      days: options.days,
      limit: options.limit
    },
    count: totalCount,
    emotions
  }
}

export interface ListEmotionCategoriesOptions {
  minCount?: number
}

export interface EmotionCategory {
  emotion: string
  count: number
  lastLogged: string
}

export async function listEmotionCategories(filePath: string, options: ListEmotionCategoriesOptions): Promise<{
  type: string
  file: string
  timestamp: string
  filter: { minCount?: number }
  totalUnique: number
  categories: EmotionCategory[]
}> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File "${filePath}" does not exist.`)
  }
  
  const content = await fs.readFile(filePath, 'utf8')
  const emotions = parseEmotions(content)
  
  // Group by emotion and calculate stats
  const emotionStats = new Map<string, { count: number; lastLogged: string }>()
  
  for (const e of emotions) {
    const existing = emotionStats.get(e.emotion)
    if (existing) {
      existing.count++
      // Keep the most recent timestamp
      if (e.timestamp > existing.lastLogged) {
        existing.lastLogged = e.timestamp
      }
    } else {
      emotionStats.set(e.emotion, {
        count: 1,
        lastLogged: e.timestamp
      })
    }
  }
  
  // Convert to array
  let categories: EmotionCategory[] = Array.from(emotionStats.entries()).map(([emotion, stats]) => ({
    emotion,
    count: stats.count,
    lastLogged: stats.lastLogged
  }))
  
  // Filter by minCount if specified
  if (options.minCount !== undefined && options.minCount > 0) {
    categories = categories.filter(c => c.count >= options.minCount!)
  }
  
  // Sort by count descending, then by emotion name
  categories.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count
    }
    return a.emotion.localeCompare(b.emotion)
  })
  
  return {
    type: 'emotion-categories',
    file: filePath,
    timestamp: new Date().toISOString(),
    filter: {
      minCount: options.minCount
    },
    totalUnique: categories.length,
    categories
  }
}

export interface DeleteEmotionsOptions {
  from?: string  // ISO date string (inclusive)
  to?: string    // ISO date string (inclusive)
}

export async function deleteEmotions(filePath: string, options: DeleteEmotionsOptions): Promise<{
  success: boolean
  message: string
  deletedCount: number
  remainingCount: number
  filter: { from?: string; to?: string }
}> {
  if (!await fs.pathExists(filePath)) {
    throw new Error(`File "${filePath}" does not exist.`)
  }
  
  const content = await fs.readFile(filePath, 'utf8')
  let emotions = parseEmotions(content)
  
  const originalCount = emotions.length
  
  // Parse dates
  const fromDate = options.from ? new Date(options.from) : undefined
  const toDate = options.to ? new Date(options.to) : undefined
  
  if (fromDate && isNaN(fromDate.getTime())) {
    throw new Error(`Invalid from date: ${options.from}`)
  }
  if (toDate && isNaN(toDate.getTime())) {
    throw new Error(`Invalid to date: ${options.to}`)
  }
  
  // Filter out emotions in the date range
  const remainingEmotions = emotions.filter(e => {
    const emotionDate = new Date(e.timestamp)
    
    // If both from and to specified, delete if within range [from, to]
    if (fromDate && toDate) {
      return emotionDate < fromDate || emotionDate > toDate
    }
    // If only from specified, delete if on or after from date
    if (fromDate && !toDate) {
      return emotionDate < fromDate
    }
    // If only to specified, delete if on or before to date
    if (!fromDate && toDate) {
      return emotionDate > toDate
    }
    
    return true // Keep if no filters
  })
  
  const deletedCount = originalCount - remainingEmotions.length
  
  if (deletedCount > 0) {
    // Rebuild the file with remaining emotions
    const baseContent = stripEmotionLog(content)
    const emotionSection = formatEmotionsTable(remainingEmotions)
    const newContent = baseContent + '\n\n' + emotionSection
    
    await fs.writeFile(filePath, newContent)
  }
  
  return {
    success: true,
    message: `Deleted ${deletedCount} emotion(s)${deletedCount > 0 ? ' from ' + filePath : ''}`,
    deletedCount,
    remainingCount: remainingEmotions.length,
    filter: {
      from: options.from,
      to: options.to
    }
  }
}
