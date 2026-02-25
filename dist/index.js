#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const csv_writer_1 = require("csv-writer");
const slugify_1 = __importDefault(require("slugify"));
const toon = __importStar(require("@toon-format/toon"));
const program = new commander_1.Command();
program
    .name('value-hierarchy')
    .description('AI Assistant Tool for Conducting Objectivist Value Hierarchy Interviews with Humans\n\n' +
    'PURPOSE\n' +
    'This CLI exists solely for use by an AI assistant during live conversations with a human.  \n' +
    'It helps the AI systematically elicit, refine, and maintain the human\'s personal Objectivist value hierarchy (life as the ultimate standard of value, productive achievement as the central integrating purpose).\n\n' +
    'Each hierarchy lives in its own single, portable file named <name>.values.csv (e.g. personal.values.csv, career.values.csv, 2026-review.values.csv).\n\n' +
    'RECOMMENDED AI WORKFLOW DURING A CONVERSATION\n' +
    '1. value-hierarchy init personal.values.csv\n' +
    '2. value-hierarchy add personal.values.csv "New Value" --tags "tag1|tag2" --detail\n' +
    '3. value-hierarchy interview personal.values.csv --num 5 --personality\n' +
    '   -> Use the generated protocol to interview the human naturally\n' +
    '4. After the human answers, value-hierarchy update-scores personal.values.csv --responses "A>B,C>D"\n' +
    '5. value-hierarchy top10 personal.values.csv\n' +
    '   -> Show the human their updated ranking immediately\n\n' +
    'COMMANDS\n' +
    '  init <file>                        Create a new .values.csv hierarchy file\n' +
    '  add <file> <title> [--detail]        Add a new value to the hierarchy\n' +
    '  edit <file> <id> [--title] [--tags] [--desc] Edit an existing value\n' +
    '  remove <file> <id>                  Remove a value from the hierarchy\n' +
    '  interview <file> [--num N] [--personality] Generate full interview protocol + comparison pairs\n' +
    '  update-scores <file> --responses     Apply Elo-like score updates from interview responses\n' +
    '  top10 <file> [--tag TAG]            Show the current Top 10 values (primary view to share with human)\n' +
    '  list <file> [--limit N] [--tag TAG] List all values sorted by importance\n' +
    '  hierarchy <file>                    Show full hierarchy grouped by tags\n' +
    '  validate <file>                     Check file integrity and suggest improvements\n' +
    '  stats <file>                        Show statistics and insights\n' +
    '  guide                               Show value specificity guidelines\n' +
    '  feedback <message>                  Log feedback for improvements\n' +
    '  tags                                Show master tag list from objectivist-lattice\n\n' +
    'OPTIONS\n' +
    '  -h, --help        display help for command\n' +
    '  -v, --version     output the version number\n\n' +
    'EXAMPLES\n' +
    '  value-hierarchy init ./personal.values.csv\n' +
    '  value-hierarchy add personal.values.csv "Daily Walking" --detail\n' +
    '  value-hierarchy interview ~/hierarchies/career.values.csv --num 5 --personality\n' +
    '  value-hierarchy update-scores personal.values.csv --responses "Life>Health,Reason>Purpose"\n' +
    '  value-hierarchy top10 personal.values.csv --tag productivity\n\n' +
    'Run "value-hierarchy <command> --help" for detailed help on a command.')
    .version('0.0.4');
const fallbackTags = [
    'life', 'reason', 'purpose', 'self-esteem', 'productive-achievement',
    'ethics', 'politics', 'epistemology', 'metaphysics',
    'productivity', 'goals', 'career', 'health', 'relationships', 'creativity',
    'habits', 'learning', 'philosophy', 'principles', 'rationality', 'happiness'
];
function loadTags() {
    // Try to load from objectivist-lattice repo
    const home = process.env.HOME || '';
    const latticePath = path.join(home, 'objectivist-lattice', 'tags.txt');
    if (fs.existsSync(latticePath)) {
        const content = fs.readFileSync(latticePath, 'utf8');
        return content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    }
    return fallbackTags;
}
function validateFile(filePath) {
    if (!filePath.endsWith('.values.csv')) {
        console.error(`Error: --file must point to a file ending with .values.csv. You provided: ${filePath}`);
        process.exit(1);
    }
}
async function readValues(filePath) {
    const values = [];
    if (!await fs.pathExists(filePath)) {
        return values;
    }
    const stream = fs.createReadStream(filePath).pipe((0, csv_parser_1.default)());
    for await (const row of stream) {
        values.push({
            id: row.id,
            title: row.title,
            score: parseFloat(row.score),
            comparisonCount: parseInt(row.comparisonCount),
            tags: row.tags,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            rationale: row.rationale
        });
    }
    return values;
}
async function writeValues(filePath, values) {
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: filePath,
        header: [
            { id: 'id', title: 'id' },
            { id: 'title', title: 'title' },
            { id: 'score', title: 'score' },
            { id: 'comparisonCount', title: 'comparisonCount' },
            { id: 'tags', title: 'tags' },
            { id: 'createdAt', title: 'createdAt' },
            { id: 'updatedAt', title: 'updatedAt' },
            { id: 'rationale', title: 'rationale' }
        ]
    });
    await csvWriter.writeRecords(values);
}
function generateId(title) {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
    const slug = (0, slugify_1.default)(title, { lower: true, strict: true });
    return `${timestamp}-${slug}`;
}
program
    .command('init <file>')
    .description('Creates a new .values.csv file at the exact path you specify (creates parent directories if needed).\nUse this once per new hierarchy you are helping a human build.')
    .action(async (filePath, options) => {
    validateFile(filePath);
    await fs.ensureDir(path.dirname(filePath));
    let values = [];
    await writeValues(filePath, values);
    console.log(`Created ${filePath}`);
});
program
    .command('add <file> <title>')
    .description('Appends a new value to the specified .values.csv file.\nPerfect when the human names a new value during conversation.')
    .option('--tags <string>', 'Pipe-separated tags (e.g. "productivity|learning|habits")')
    .option('--desc <string>', 'Optional initial rationale/description')
    .option('--detail', 'Prompt for more detail if value seems too broad')
    .action(async (filePath, title, options) => {
    validateFile(filePath);
    const values = await readValues(filePath);
    // Check for detail if --detail is used and title seems broad
    if (options.detail && title.split(' ').length < 3) {
        console.log(`"${title}" seems broad. Consider making it more specific, e.g., "Daily Walking and Strength Training" instead of "Physical Fitness".`);
    }
    const now = new Date().toISOString();
    const newValue = {
        id: generateId(title),
        title,
        score: 1500,
        comparisonCount: 0,
        tags: options.tags || '',
        createdAt: now,
        updatedAt: now,
        rationale: options.desc || ''
    };
    values.push(newValue);
    await writeValues(filePath, values);
    console.log(`Added "${title}" to ${filePath}`);
});
program
    .command('edit <file> <id>')
    .description('Edits an existing value in the specified .values.csv file.')
    .option('--title <string>', 'New title for the value')
    .option('--tags <string>', 'New pipe-separated tags')
    .option('--desc <string>', 'New rationale/description')
    .action(async (filePath, id, options) => {
    validateFile(filePath);
    const values = await readValues(filePath);
    const value = values.find(v => v.id === id);
    if (!value) {
        console.error(`Error: Value with id "${id}" not found.`);
        process.exit(1);
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
    console.log(`Edited value "${id}" in ${filePath}`);
});
program
    .command('remove <file> <id>')
    .description('Removes a value from the specified .values.csv file.')
    .action(async (filePath, id) => {
    validateFile(filePath);
    const values = await readValues(filePath);
    const index = values.findIndex(v => v.id === id);
    if (index === -1) {
        console.error(`Error: Value with id "${id}" not found.`);
        process.exit(1);
    }
    values.splice(index, 1);
    await writeValues(filePath, values);
    console.log(`Removed value "${id}" from ${filePath}`);
});
program
    .command('interview <file>')
    .description(`Generates a complete, ready-to-use interview protocol plus N comparison pairs for you (the AI) to use with the human.\n\nThe output contains:\n* Session header with the exact file being used\n* Full step-by-step interviewing protocol\n* Natural-language phrasing templates you can read or adapt\n* Objectivist-grounded probing questions\n* List of comparison pairs (prioritizes least-compared values first)\n\nRemember, a great interview is a mix of comparing existing values and adding new ones as they emerge in conversation. One effective technique is looking at existing values and suggesting 10 potential value options speculated on based on existing ones for the user to choose from (or obviously writing their own values). This is a fun little game that doesn't keep the conversation too slow.\n\nOPTIONS\n  --num <number>    Number of comparisons to generate (default: 5)\n  --personality      Enable sophisticated, cultured personality mode (flag)\n\nAfter the session, use "update-scores" command to apply results automatically.`)
    .option('--num <number>', 'Number of comparisons to generate', '5')
    .option('--personality', 'Enable sophisticated, cultured personality mode (boolean flag)')
    .action(async (filePath, options) => {
    validateFile(filePath);
    const values = await readValues(filePath);
    if (values.length < 2) {
        console.error('Error: Need at least 2 values for interview. Add more values first.');
        process.exit(1);
    }
    const num = parseInt(options.num);
    // Select pairs
    values.sort((a, b) => a.comparisonCount - b.comparisonCount);
    const minCount = values[0].comparisonCount;
    let candidates;
    if (minCount >= 3) {
        // Random biased to less compared
        candidates = values;
    }
    else {
        candidates = values.filter(v => v.comparisonCount === minCount);
        if (candidates.length < num * 2) {
            candidates = values.slice(0, Math.min(values.length, num * 2));
        }
    }
    // Shuffle candidates
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const pairs = [];
    for (let i = 0; i < Math.min(num * 2, candidates.length - 1); i += 2) {
        pairs.push([candidates[i], candidates[i + 1]]);
    }
    const now = new Date().toISOString();
    const personality = options.personality ? 'cultured' : 'default';
    const protocols = {
        default: {
            header: '=== VALUE-HIERARCHY INTERVIEW SESSION PREPARED FOR AI AGENT ===',
            intro: '1. Introduce the session: "I\'m going to ask you to compare some of your values to help refine your hierarchy."',
            remind: '4. Remind: "Remember, this hierarchy is always revisable. Inconsistencies resolve through more comparisons."',
            update: '5. After all pairs, run "value-hierarchy update-scores <file> --responses \'A>B,C>D\'" to update scores automatically.'
        },
        cultured: {
            header: '=== DELVING DEEP INTO YOUR VALUE HIERARCHY ===',
            intro: '1. Start the conversation: "Oh, let\'s not skimp on the depths here, shall we? Comparing these values will help us uncover the profound layers of your priorities."',
            remind: '4. Remind gently: "Remember, this hierarchy is yours to shape - let\'s explore until we hit bedrock."',
            update: '5. After all pairs, run "value-hierarchy update-scores <file> --responses \'A>B,C>D\'" to apply the insights seamlessly.'
        }
    };
    const proto = protocols[personality];
    console.log(proto.header);
    console.log(`Session File: ${filePath}`);
    console.log(`Prepared At: ${now} (UTC)`);
    console.log('');
    if (personality === 'cultured') {
        console.log('PERSONALITY MODE: SOPHISTICATED AND CULTURED');
        console.log('');
        console.log('This mode adopts a refined, intellectual tone, blending a hint of pretentiousness with genuine friendliness. The AI interviewer speaks with eloquence and wit, encouraging deep exploration of your values rather than superficial comparisons. It positions the conversation as an opportunity for profound self-discovery, much like a cultured mentor guiding you through layers of personal philosophy.');
        console.log('');
        console.log('Expect phrases that evoke sophistication and warmth, such as urging to "not skimp on the depths" or exploring "profound layers." The focus is on going deep, reminding you that your value hierarchy is malleable and worth thorough examination. This creates an engaging dialogue where comparisons become springboards for richer insights, aligned with Objectivist principles of life as the ultimate value and productive achievement as the central purpose.');
        console.log('');
        console.log('Ultimately, this personality turns the interview into a memorable, insightful experience. It balances snooty charm with approachable depth, fostering intellectual camaraderie. By delving into the "bedrock" of your priorities, it helps build not just a ranked list, but a deeply reflective understanding of what drives you, leading to more concrete actions in daily life.');
        console.log('');
    }
    console.log('STEP-BY-STEP INTERVIEWING PROTOCOL:');
    console.log(proto.intro);
    console.log('2. For each pair, use the friendly phrasing templates below, swapping in the value titles.');
    console.log('3. After each comparison, jot down the human\'s pick and why.');
    console.log(proto.remind);
    console.log(proto.update);
    console.log('');
    console.log('NATURAL-LANGUAGE PHRASE TEMPLATES:');
    console.log('* "Between [Value A] and [Value B], which is more important to you right now, and why?"');
    console.log('* "If you had to choose one over the other in a conflict, which would you prioritize: [Value A] or [Value B]?"');
    console.log('* "Considering your long-term happiness, does [Value A] serve [Value B], or vice versa?"');
    console.log('');
    console.log('OBJECTIVIST-GROUNDED PROBING QUESTIONS:');
    console.log('* "How does this choice align with life as your ultimate value?"');
    console.log('* "Does this reflect productive achievement as your central purpose?"');
    console.log('* "What concrete actions would this ranking lead to in your daily life?"');
    console.log('');
    console.log('COMPARISON PAIRS FOR THIS SESSION:');
    pairs.forEach((pair, idx) => {
        console.log(`${idx + 1}. ${pair[0].title} vs ${pair[1].title}`);
    });
});
program
    .command('update-scores <file>')
    .description('Updates scores and comparison counts based on interview responses.\nUse after an interview session to apply Elo-like adjustments automatically.')
    .option('--responses <string>', 'Comma-separated responses, e.g., "A>B,C>D" where A wins over B, etc.')
    .option('--pairs <string>', 'The pairs used in the interview, as output by interview command (optional, for validation)')
    .action(async (filePath, options) => {
    validateFile(filePath);
    if (!options.responses) {
        console.error('Error: --responses is required.');
        process.exit(1);
    }
    const values = await readValues(filePath);
    const responses = options.responses.split(',');
    const now = new Date().toISOString();
    responses.forEach((resp) => {
        const [winner, loser] = resp.split('>');
        if (!winner || !loser) {
            console.error(`Invalid response format: ${resp}. Expected "Winner>Loser".`);
            process.exit(1);
        }
        const winValue = values.find(v => v.title === winner.trim());
        const loseValue = values.find(v => v.title === loser.trim());
        if (!winValue || !loseValue) {
            console.error(`Value not found: ${winner} or ${loser}`);
            process.exit(1);
        }
        // Elo-like update: winner +10, loser -10 (simple for now)
        winValue.score += 10;
        loseValue.score -= 10;
        winValue.comparisonCount += 1;
        loseValue.comparisonCount += 1;
        winValue.updatedAt = now;
        loseValue.updatedAt = now;
    });
    await writeValues(filePath, values);
    console.log(`Updated scores for ${responses.length} comparisons in ${filePath}`);
});
program
    .command('top10 <file>')
    .description('Displays the current Top 10 values from the specified .values.csv file.\nThis is the primary view you should share with the human after every interview session.')
    .option('--tag <tag>', 'Optional. Show only the Top 10 values that contain this tag')
    .action(async (filePath, options) => {
    validateFile(filePath);
    let values = await readValues(filePath);
    if (options.tag) {
        values = values.filter(v => v.tags.includes(options.tag));
    }
    values.sort((a, b) => b.score - a.score);
    const top10 = values.slice(0, 10);
    const data = {
        type: 'top-values',
        file: filePath,
        filter: options.tag || 'all',
        timestamp: new Date().toISOString(),
        values: top10.map((v, idx) => ({
            rank: idx + 1,
            title: v.title,
            score: v.score,
            comparisonCount: v.comparisonCount,
            tags: v.tags,
            rationale: v.rationale,
            id: v.id,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt
        }))
    };
    console.log(toon.encode(data));
});
program
    .command('list <file>')
    .description('Lists all values in the hierarchy sorted by current score (highest first).')
    .option('--limit <number>', 'Limit the number of values shown')
    .option('--tag <tag>', 'Show only values containing this tag')
    .action(async (filePath, options) => {
    validateFile(filePath);
    let values = await readValues(filePath);
    if (options.tag) {
        values = values.filter(v => v.tags.includes(options.tag));
    }
    values.sort((a, b) => b.score - a.score);
    if (options.limit) {
        values = values.slice(0, parseInt(options.limit));
    }
    const data = {
        type: 'value-list',
        file: filePath,
        filter: options.tag || 'all',
        limit: options.limit || 'none',
        timestamp: new Date().toISOString(),
        values: values.map((v, idx) => ({
            rank: idx + 1,
            title: v.title,
            score: v.score,
            comparisonCount: v.comparisonCount,
            tags: v.tags,
            rationale: v.rationale,
            id: v.id,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt
        }))
    };
    console.log(toon.encode(data));
});
program
    .command('hierarchy <file>')
    .description('Displays the full ranked hierarchy grouped first by overall rank, then by tag clusters.\nExtremely useful when reviewing how values cluster around major life areas with the human.')
    .action(async (filePath) => {
    validateFile(filePath);
    const values = await readValues(filePath);
    values.sort((a, b) => b.score - a.score);
    const data = {
        type: 'hierarchy',
        file: filePath,
        timestamp: new Date().toISOString(),
        values: values.map((v, idx) => ({
            rank: idx + 1,
            title: v.title,
            score: v.score,
            tags: v.tags,
            rationale: v.rationale,
            id: v.id,
            comparisonCount: v.comparisonCount,
            createdAt: v.createdAt,
            updatedAt: v.updatedAt
        }))
    };
    console.log(toon.encode(data));
});
program
    .command('validate <file>')
    .description('Validates the .values.csv file for integrity, duplicates, and suggestions for specificity.')
    .action(async (filePath) => {
    validateFile(filePath);
    const values = await readValues(filePath);
    const issues = [];
    const titles = new Set();
    values.forEach(v => {
        if (titles.has(v.title))
            issues.push(`Duplicate title: ${v.title}`);
        titles.add(v.title);
        if (v.title.split(' ').length < 3)
            issues.push(`Value "${v.title}" may be too broad; consider more detail.`);
    });
    if (issues.length === 0) {
        console.log(`${filePath} is valid.`);
    }
    else {
        console.log('Issues found:');
        issues.forEach(issue => console.log(`- ${issue}`));
    }
});
program
    .command('guide')
    .description('Displays guidelines for value specificity and Objectivist principles.')
    .action(() => {
    console.log('VALUE SPECIFICITY GUIDELINES:');
    console.log('* Values should be actionable and personal, e.g., "Writing Tech Articles" not just "Writing".');
    console.log('* Capture specific actions, contexts, or emotions, e.g., "Exploring Food with Wife" instead of "Family Exploration".');
    console.log('* Align with Objectivism: Life as ultimate value, productive achievement as central purpose.');
    console.log('* Examples: "Daily Walking and Strength Training", "Epistemology in AI Research", "Being a Family Man with Wife and Kids".');
});
program
    .command('stats <file>')
    .description('Shows key statistics and insights about the current hierarchy:\n* Total values\n* Total comparisons performed\n* Least-compared values\n* Strongest tag clusters\n* Value Specificity Score\n* One-sentence insight for you (the AI) to share with the human')
    .action(async (filePath) => {
    validateFile(filePath);
    const values = await readValues(filePath);
    const totalValues = values.length;
    const totalComparisons = values.reduce((sum, v) => sum + v.comparisonCount, 0);
    const leastCompared = values.filter(v => v.comparisonCount === Math.min(...values.map(vv => vv.comparisonCount)));
    const tagCounts = {};
    values.forEach(v => {
        v.tags.split('|').forEach(tag => {
            if (tag)
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });
    const strongestTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const avgTitleLength = values.reduce((sum, v) => sum + v.title.split(' ').length, 0) / totalValues;
    const specificityScore = Math.round(avgTitleLength * 10) / 10; // e.g., 3.2
    const data = {
        type: 'stats',
        file: filePath,
        timestamp: new Date().toISOString(),
        totalValues,
        totalComparisons,
        leastComparedValues: leastCompared.map(v => v.title),
        strongestTagClusters: strongestTags.map(([tag, count]) => ({ tag, count })),
        valueSpecificityScore: specificityScore,
        insight: `Your hierarchy shows a strong focus on ${strongestTags[0]?.[0] || 'core values'}, with ${totalComparisons} comparisons refining your priorities.`
    };
    console.log(toon.encode(data));
});
program
    .command('feedback <message>')
    .description('Logs user feedback for future improvements. Message can be a string describing issues or suggestions.')
    .action((message) => {
    // For now, just log to console; in future, could save to file or send somewhere
    console.log(`Feedback logged: ${message}`);
});
program
    .command('tags')
    .description('Displays the master tag list (synced from your objectivist-lattice repository, with fallback to the 21 standard tags).')
    .action(() => {
    const tags = loadTags();
    const data = {
        type: 'master-tags',
        source: 'objectivist-lattice or fallback',
        timestamp: new Date().toISOString(),
        tags
    };
    console.log(toon.encode(data));
});
program.parse();
