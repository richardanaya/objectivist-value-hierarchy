import fs from 'fs-extra'
import path from 'path'

const fallbackTags = [
  // Core life areas (practical)
  'health', 'fitness', 'mental-health', 'sleep', 'nutrition',
  'career', 'work', 'skills', 'learning', 'education',
  'finance', 'money', 'investing', 'savings', 'budget',
  'relationships', 'family', 'friends', 'romance', 'community',
  'home', 'housing', 'environment', 'organization', 'cleanliness',
  
  // Personal development
  'creativity', 'hobbies', 'arts', 'music', 'writing',
  'goals', 'planning', 'habits', 'discipline', 'focus',
  'self-improvement', 'confidence', 'mindfulness', 'reflection',
  
  // Experiences & enjoyment
  'travel', 'adventure', 'experiences', 'fun', 'entertainment',
  'food', 'cooking', 'dining',
  'nature', 'outdoors', 'sports', 'recreation'
]

/**
 * Load tags from objectivist-lattice if available, otherwise use fallback
 */
export function loadTags(): string[] {
  // Try to load from objectivist-lattice repo
  const home = process.env.HOME || ''
  const latticePath = path.join(home, 'objectivist-lattice', 'tags.txt')
  if (fs.existsSync(latticePath)) {
    try {
      const content = fs.readFileSync(latticePath, 'utf8')
      return content.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
    } catch (err) {
      console.warn('Failed to load tags from lattice, using fallback')
    }
  }
  return fallbackTags
}