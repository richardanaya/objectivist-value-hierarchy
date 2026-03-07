import fs from 'fs-extra';
import path from 'path';
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
];
export function loadTags() {
    // Try to load from objectivist-lattice repo
    const home = process.env.HOME || '';
    const latticePath = path.join(home, 'objectivist-lattice', 'tags.txt');
    if (fs.existsSync(latticePath)) {
        const content = fs.readFileSync(latticePath, 'utf8');
        return content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    }
    return fallbackTags;
}
export async function readValues(filePath) {
    const values = [];
    if (!await fs.pathExists(filePath)) {
        return values;
    }
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    let currentValue = null;
    let inRationale = false;
    let rationaleLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check for value header (### value-id)
        const valueMatch = line.match(/^### (.+)$/);
        if (valueMatch) {
            // Save previous value if exists
            if (currentValue && currentValue.id) {
                if (inRationale && rationaleLines.length > 0) {
                    currentValue.rationale = rationaleLines.join('\n').trim();
                }
                values.push(currentValue);
            }
            // Start new value - id and title are the same
            const title = valueMatch[1];
            currentValue = {
                id: title,
                title: title,
                wins: 0,
                losses: 0,
                tags: '',
                updatedAt: new Date().toISOString(),
                rationale: ''
            };
            inRationale = false;
            rationaleLines = [];
            continue;
        }
        if (!currentValue)
            continue;
        // Parse rationale header
        if (line.trim() === '#### Rationale') {
            inRationale = true;
            rationaleLines = [];
            continue;
        }
        // Parse table rows
        const tableMatch = line.match(/^\| (Wins|Losses|Tags|Updated) \| (.+) \|$/);
        if (tableMatch) {
            const key = tableMatch[1];
            const value = tableMatch[2].trim();
            switch (key) {
                case 'Wins':
                    currentValue.wins = parseInt(value);
                    break;
                case 'Losses':
                    currentValue.losses = parseInt(value);
                    break;
                case 'Tags':
                    currentValue.tags = value === '(none)' ? '' : value;
                    break;
                case 'Updated':
                    currentValue.updatedAt = value;
                    break;
            }
            continue;
        }
        // Collect rationale lines
        if (inRationale) {
            // Stop collecting when we hit a table row or other structured content
            if (line.match(/^\| /) || line.match(/^#### /) || line.match(/^\*\*/)) {
                inRationale = false;
            }
            else if (line.trim() !== '' || rationaleLines.length > 0) {
                rationaleLines.push(line);
            }
        }
    }
    // Save last value if exists
    if (currentValue && currentValue.id) {
        if (inRationale && rationaleLines.length > 0) {
            currentValue.rationale = rationaleLines.join('\n').trim();
        }
        values.push(currentValue);
    }
    return values;
}
export async function writeValues(filePath, values) {
    const totalComparisons = values.reduce((sum, v) => sum + v.wins + v.losses, 0);
    const lastUpdated = values.length > 0
        ? values.reduce((latest, v) => v.updatedAt > latest ? v.updatedAt : latest, values[0].updatedAt)
        : new Date().toISOString();
    let markdown = `# Value Hierarchy\n\n`;
    markdown += `## Summary\n`;
    markdown += `- **Total Values**: ${values.length}\n`;
    markdown += `- **Total Comparisons**: ${totalComparisons}\n`;
    markdown += `- **Last Updated**: ${lastUpdated}\n\n`;
    if (values.length === 0) {
        markdown += `*No values added yet.*\n`;
    }
    else {
        markdown += `## Values\n\n`;
        // Values are already in priority order (file order = priority)
        for (const v of values) {
            markdown += `### ${v.title}\n\n`;
            markdown += `| Attribute | Value |\n`;
            markdown += `|-----------|-------|\n`;
            markdown += `| Wins | ${v.wins} |\n`;
            markdown += `| Losses | ${v.losses} |\n`;
            markdown += `| Tags | ${v.tags || '(none)'} |\n`;
            markdown += `| Updated | ${v.updatedAt} |\n\n`;
            markdown += `#### Rationale\n`;
            if (v.rationale && v.rationale.trim()) {
                markdown += `${v.rationale}\n`;
            }
            else {
                markdown += `*(No rationale provided yet)*\n`;
            }
            markdown += `\n`;
        }
    }
    await fs.writeFile(filePath, markdown);
}
export async function addValue(filePath, options) {
    // Auto-create directory if file doesn't exist
    if (!await fs.pathExists(filePath)) {
        await fs.ensureDir(path.dirname(filePath));
    }
    const values = await readValues(filePath);
    // Check for detail if requested and title seems broad
    if (options.detail && options.title.split(' ').length < 3) {
        return {
            success: false,
            message: `NOT ADDED: "${options.title}" seems too broad (fewer than 3 words). Consider making it more specific, e.g., "Daily Walking and Strength Training" instead of "Physical Fitness". Rephrase with the human and retry without --detail.`
        };
    }
    const now = new Date().toISOString();
    const newValue = {
        id: options.title,
        title: options.title,
        wins: 0,
        losses: 0,
        tags: options.tags || '',
        updatedAt: now,
        rationale: options.desc || ''
    };
    values.push(newValue);
    await writeValues(filePath, values);
    return {
        success: true,
        message: `Added "${options.title}" to ${filePath}`
    };
}
export async function editValue(filePath, id, options) {
    if (!await fs.pathExists(filePath)) {
        throw new Error(`File "${filePath}" does not exist.`);
    }
    const values = await readValues(filePath);
    const value = values.find(v => v.id === id);
    if (!value) {
        throw new Error(`Value with id "${id}" not found.`);
    }
    const now = new Date().toISOString();
    if (options.title)
        value.title = options.title;
    if (options.tags !== undefined)
        value.tags = options.tags;
    if (options.desc)
        value.rationale = options.desc;
    value.updatedAt = now;
    await writeValues(filePath, values);
    return {
        success: true,
        message: `Edited value "${id}" in ${filePath}`
    };
}
export async function removeValue(filePath, id) {
    if (!await fs.pathExists(filePath)) {
        throw new Error(`File "${filePath}" does not exist.`);
    }
    const values = await readValues(filePath);
    const index = values.findIndex(v => v.id === id);
    if (index === -1) {
        throw new Error(`Value with id "${id}" not found.`);
    }
    values.splice(index, 1);
    await writeValues(filePath, values);
    return {
        success: true,
        message: `Removed value "${id}" from ${filePath}`
    };
}
export async function getSuggestions(filePath, num) {
    if (!await fs.pathExists(filePath)) {
        throw new Error(`File "${filePath}" does not exist.`);
    }
    const values = await readValues(filePath);
    // Keep original order for priority-based calculations (file order = priority)
    const valuesByPriority = [...values];
    // Calculate tag counts
    const tagCounts = {};
    values.forEach(v => {
        v.tags.split('|').forEach(tag => {
            if (tag)
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    // Find tags with less than 5 values
    const tagsNeedingMoreValues = Object.entries(tagCounts)
        .filter(([tag, count]) => count < 5)
        .map(([tag, count]) => ({ tag, currentCount: count }));
    // 1. Values needing rationale (empty or very short rationale)
    const valuesNeedingRationale = values
        .filter(v => v.rationale.trim().length < 20)
        .map(v => ({ title: v.title, id: v.id, rationaleLength: v.rationale.trim().length }));
    // 2. Stale values (not updated in 30+ days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const staleValues = values
        .filter(v => new Date(v.updatedAt) < thirtyDaysAgo)
        .map(v => ({
        title: v.title,
        id: v.id,
        updatedAt: v.updatedAt,
        daysSinceUpdate: Math.floor((now.getTime() - new Date(v.updatedAt).getTime()) / (24 * 60 * 60 * 1000))
    }));
    // 3. Total comparisons (each comparison has exactly 1 win)
    const totalComparisons = values.reduce((sum, v) => sum + v.wins, 0);
    // 4. Average comparisons per value
    const averageComparisonsPerValue = values.length > 0 ? Math.round((totalComparisons * 2 / values.length) * 10) / 10 : 0;
    // 5. Uncompared values (never been compared)
    const uncomparedValues = values
        .filter(v => v.wins === 0 && v.losses === 0)
        .map(v => ({ title: v.title, id: v.id }));
    // 6. Top and bottom values (by priority = file order)
    const topValues = valuesByPriority.slice(0, 3).map((v, idx) => ({
        title: v.title,
        id: v.id,
        position: idx + 1
    }));
    const bottomValues = valuesByPriority.slice(-3).reverse().map((v, idx) => ({
        title: v.title,
        id: v.id,
        position: valuesByPriority.length - 2 + idx
    }));
    // 7. Tags not represented (from available tags with zero values)
    const availableTags = loadTags();
    const tagsNotRepresented = availableTags.filter(tag => !tagCounts[tag]);
    // 8. Lopsided values (skewed win/loss ratio)
    const lopsidedValues = values
        .filter(v => {
        const total = v.wins + v.losses;
        if (total < 5)
            return false; // Need at least 5 comparisons
        const winRate = v.wins / total;
        return winRate > 0.8 || winRate < 0.2;
    })
        .map(v => {
        const total = v.wins + v.losses;
        return {
            title: v.title,
            id: v.id,
            wins: v.wins,
            losses: v.losses,
            winRate: Math.round((v.wins / total) * 100) / 100
        };
    });
    // 9. Vague titles (fewer than 3 words)
    const vagueTitles = values
        .filter(v => v.title.trim().split(/\s+/).length < 3)
        .map(v => ({
        title: v.title,
        id: v.id,
        wordCount: v.title.trim().split(/\s+/).length
    }));
    // 10. Values with no tags
    const valuesWithNoTags = values
        .filter(v => v.tags.trim().length === 0)
        .map(v => ({ title: v.title, id: v.id }));
    // Generate comparison pairs if we have enough values
    let pairs = [];
    if (values.length >= 2) {
        // Select pairs - prioritize values with fewer total comparisons
        values.sort((a, b) => (a.wins + a.losses) - (b.wins + b.losses));
        const minCount = values[0].wins + values[0].losses;
        let candidates;
        if (minCount >= 3) {
            // Random biased to less compared
            candidates = values;
        }
        else {
            candidates = values.filter(v => (v.wins + v.losses) === minCount);
            if (candidates.length < num * 2) {
                candidates = values.slice(0, Math.min(values.length, num * 2));
            }
        }
        // Shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }
        const selectedPairs = [];
        for (let i = 0; i < Math.min(num * 2, candidates.length - 1); i += 2) {
            selectedPairs.push([candidates[i], candidates[i + 1]]);
        }
        pairs = selectedPairs.map((pair, idx) => ({
            pairNumber: idx + 1,
            a: {
                title: pair[0].title,
                id: pair[0].id,
                wins: pair[0].wins,
                losses: pair[0].losses
            },
            b: {
                title: pair[1].title,
                id: pair[1].id,
                wins: pair[1].wins,
                losses: pair[1].losses
            }
        }));
    }
    // Build data object dynamically, only including non-empty categories
    const data = {
        type: 'suggestions-to-improve',
        file: filePath,
        timestamp: new Date().toISOString(),
        totalValues: values.length,
        totalComparisons,
        averageComparisonsPerValue
    };
    // Always include comparisonPairs (even if empty pairs array)
    data.comparisonPairs = {
        description: 'Pairs of values to compare to refine your hierarchy priority. Prioritizes values with fewer comparisons.',
        pairs
    };
    // Conditionally add suggestion categories only if they have values
    if (tagsNeedingMoreValues.length > 0) {
        data.tagsNeedingMoreValues = {
            description: 'Tags that have fewer than 5 values associated with them. Consider adding more values in these categories.',
            tags: tagsNeedingMoreValues
        };
    }
    if (tagsNotRepresented.length > 0) {
        data.tagsNotRepresented = {
            description: 'Available tags from the Objectivist framework that currently have no values. Consider if any of these areas matter to you.',
            tags: tagsNotRepresented
        };
    }
    if (valuesNeedingRationale.length > 0) {
        data.valuesNeedingRationale = {
            description: 'Values with empty or very short rationales. Consider adding explanations for why these values matter to you.',
            values: valuesNeedingRationale
        };
    }
    if (staleValues.length > 0) {
        data.staleValues = {
            description: 'Values not updated in 30+ days. Consider if these still reflect your current priorities.',
            values: staleValues
        };
    }
    if (uncomparedValues.length > 0) {
        data.uncomparedValues = {
            description: 'Values that have never been compared to others. These need comparison to establish proper priority.',
            values: uncomparedValues
        };
    }
    if (topValues.length > 0) {
        data.topValues = {
            description: 'Your highest priority values (top 3 in the hierarchy). Review to confirm these truly matter most.',
            values: topValues
        };
    }
    if (bottomValues.length > 0) {
        data.bottomValues = {
            description: 'Your lowest priority values (bottom 3 in the hierarchy). Review to confirm placement or consider removal.',
            values: bottomValues
        };
    }
    if (lopsidedValues.length > 0) {
        data.lopsidedValues = {
            description: 'Values with very skewed win/loss ratios (>80% or <20% after 5+ comparisons). These may need re-evaluation.',
            values: lopsidedValues
        };
    }
    if (vagueTitles.length > 0) {
        data.vagueTitles = {
            description: 'Values with short titles (fewer than 3 words). Consider making these more specific and concrete.',
            values: vagueTitles
        };
    }
    if (valuesWithNoTags.length > 0) {
        data.valuesWithNoTags = {
            description: 'Values without any tags. Consider categorizing these to see how they fit in your Objectivist framework.',
            values: valuesWithNoTags
        };
    }
    return data;
}
export async function setHigherPriorityThan(filePath, valueTitle, valueToBeAboveTitle) {
    if (!await fs.pathExists(filePath)) {
        throw new Error(`File "${filePath}" does not exist.`);
    }
    const values = await readValues(filePath);
    // Find both values
    const valueIndex = values.findIndex(v => v.title === valueTitle);
    const targetIndex = values.findIndex(v => v.title === valueToBeAboveTitle);
    if (valueIndex === -1) {
        throw new Error(`Value "${valueTitle}" not found.`);
    }
    if (targetIndex === -1) {
        throw new Error(`Value "${valueToBeAboveTitle}" not found.`);
    }
    if (valueIndex === targetIndex) {
        throw new Error('Cannot set a value higher priority than itself.');
    }
    // Remove the value from its current position
    const [value] = values.splice(valueIndex, 1);
    // Adjust target index if we removed an item before it
    const adjustedTargetIndex = valueIndex < targetIndex ? targetIndex - 1 : targetIndex;
    // Insert the value right before the target
    values.splice(adjustedTargetIndex, 0, value);
    // Update timestamp
    value.updatedAt = new Date().toISOString();
    await writeValues(filePath, values);
    return {
        success: true,
        message: `Moved "${valueTitle}" to be higher priority than "${valueToBeAboveTitle}"`
    };
}
export async function listValues(filePath, options) {
    if (!await fs.pathExists(filePath)) {
        throw new Error(`File "${filePath}" does not exist.`);
    }
    let values = await readValues(filePath);
    if (options.tag) {
        values = values.filter(v => v.tags.split('|').includes(options.tag));
    }
    // Values are already in priority order from the file
    if (options.limit) {
        values = values.slice(0, options.limit);
    }
    return {
        type: 'value-list',
        file: filePath,
        filter: options.tag || 'all',
        limit: options.limit || 'none',
        timestamp: new Date().toISOString(),
        values: values.map((v, idx) => ({
            rank: idx + 1,
            title: v.title,
            wins: v.wins,
            losses: v.losses,
            tags: v.tags,
            rationale: v.rationale,
            id: v.id,
            updatedAt: v.updatedAt
        }))
    };
}
