import { existsSync, readFileSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, extname } from 'path';
import { z } from 'zod';

export const name = 'dsh-code-review-ai';
export const inject = ['settings', 'tools', 'commands'] as const;

const configSchema = z.object({
  enabled: z.boolean().default(true),
  language: z.string().default('auto'),
  severity: z.enum(['error', 'warning', 'info']).default('warning'),
  maxFileSize: z.number().default(102400),
});

type Config = z.infer<typeof configSchema>;

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.cs': 'csharp',
  '.sql': 'sql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
};

function detectLanguage(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || 'unknown';
}

function readFileContent(filePath: string, maxFileSize: number): string | null {
  if (!existsSync(filePath)) return null;
  const stat = readFileSync(filePath);
  if (stat.length > maxFileSize) return null;
  return stat.toString('utf-8');
}

interface Issue {
  line: number;
  message: string;
  suggestion: string;
}

function checkSecurityIssues(content: string, lang: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split('\n');

  const patterns = [
    { regex: /eval\s*\(/gi, message: 'Use of eval() detected', suggestion: 'Avoid eval(), use safer alternatives' },
    { regex: /new\s+Function\s*\(/gi, message: 'Dynamic function creation detected', suggestion: 'Avoid new Function(), use regular functions' },
    { regex: /execSync\s*\(/gi, message: 'Synchronous exec detected', suggestion: 'Use async execution or validate inputs strictly' },
    { regex: /__proto__\s*=/gi, message: 'Prototype pollution risk', suggestion: 'Use Object.create(null) or freeze prototypes' },
    { regex: /\.\.\/\.\.\//g, message: 'Path traversal pattern detected', suggestion: 'Validate and sanitize file paths' },
    { regex: /password\s*[:=]\s*['"][^'"]+['"]/gi, message: 'Hardcoded password detected', suggestion: 'Use environment variables or secure vault' },
    { regex: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, message: 'Hardcoded API key detected', suggestion: 'Use environment variables' },
    { regex: /secret\s*[:=]\s*['"][^'"]+['"]/gi, message: 'Hardcoded secret detected', suggestion: 'Use environment variables or secure vault' },
    { regex: /innerHTML\s*=/gi, message: 'innerHTML assignment detected', suggestion: 'Use textContent or sanitize input to prevent XSS' },
    { regex: /document\.write\s*\(/gi, message: 'document.write() detected', suggestion: 'Use DOM manipulation methods instead' },
    { regex: /\$\{.*\}.*(?:query|sql|select|insert|update|delete)/gi, message: 'Potential SQL injection', suggestion: 'Use parameterized queries' },
    { regex: /(?:query|sql|select|insert|update|delete).*\$\{/gi, message: 'Potential SQL injection', suggestion: 'Use parameterized queries' },
    { regex: /child_process/gi, message: 'Child process module usage', suggestion: 'Validate and sanitize all command inputs' },
    { regex: /RegExp\s*\(/gi, message: 'Dynamic RegExp construction', suggestion: 'Use regex literals or validate patterns' },
    { regex: /\(\?:[^)]*\)(?:\+|\*|\{)/g, message: 'Potentially unsafe regex (ReDoS risk)', suggestion: 'Test regex with worst-case inputs' },
  ];

  lines.forEach((line, idx) => {
    patterns.forEach(({ regex, message, suggestion }) => {
      if (regex.test(line)) {
        issues.push({ line: idx + 1, message, suggestion });
      }
      regex.lastIndex = 0;
    });
  });

  return issues;
}

function checkPerformanceIssues(content: string, lang: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split('\n');

  const patterns = [
    { regex: /for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*\w+\.length/g, message: 'Large loop detected', suggestion: 'Consider using array methods or limiting iterations' },
    { regex: /\.forEach\s*\(\s*async/g, message: 'Async callback in forEach', suggestion: 'Use Promise.all with map for parallel execution' },
    { regex: /await\s+.*\n\s*await\s+.*\n\s*await\s+/g, message: 'Multiple sequential awaits', suggestion: 'Use Promise.all for independent operations' },
    { regex: /(?:readFileSync|writeFileSync|statSync)/g, message: 'Synchronous file I/O in potentially async context', suggestion: 'Use async file operations' },
    { regex: /(?:setInterval|setTimeout)\s*\(\s*(?:function|\(\))/g, message: 'Timer without cleanup', suggestion: 'Ensure timers are cleared when no longer needed' },
    { regex: /(?:addEventListener)\s*\(\s*['"][^'"]+['"]\s*,\s*(?:function|\([^)]*\)\s*=>)/g, message: 'Event listener without cleanup', suggestion: 'Remove event listeners when component unmounts' },
    { regex: /new\s+Map\(\)|new\s+Set\(\)/g, message: 'Growing collection without size limit', suggestion: 'Consider adding size limits or cleanup logic' },
    { regex: /\+\=\s*['"]/g, message: 'String concatenation in loop', suggestion: 'Use array.join() or template literals' },
    { regex: /JSON\.parse\s*\(\s*JSON\.stringify/g, message: 'Deep clone via JSON', suggestion: 'Use structuredClone() or a proper deep clone utility' },
    { regex: /console\.\w+\s*\(/g, message: 'Console output in production code', suggestion: 'Remove or use a proper logging library' },
  ];

  lines.forEach((line, idx) => {
    patterns.forEach(({ regex, message, suggestion }) => {
      if (regex.test(line)) {
        issues.push({ line: idx + 1, message, suggestion });
      }
      regex.lastIndex = 0;
    });
  });

  return issues;
}

function checkStyleIssues(content: string, lang: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split('\n');

  const patterns = [
    { regex: /(?:TODO|FIXME|HACK|XXX)\b/gi, message: 'Unresolved comment marker', suggestion: 'Address the TODO/FIXME before merging' },
    { regex: /console\.log\s*\(/g, message: 'console.log left in code', suggestion: 'Remove debug logging' },
    { regex: /(?:^|\s)(?:0x[0-9a-fA-F]+|\d{4,})\b/g, message: 'Magic number detected', suggestion: 'Extract to a named constant' },
    { regex: /(?:if|for|while)\s*\([^)]*\)\s*\{[^}]*\{[^}]*\{/g, message: 'Deeply nested code', suggestion: 'Refactor to reduce nesting depth' },
  ];

  lines.forEach((line, idx) => {
    patterns.forEach(({ regex, message, suggestion }) => {
      if (regex.test(line)) {
        issues.push({ line: idx + 1, message, suggestion });
      }
      regex.lastIndex = 0;
    });
  });

  const functionPattern = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|\w+\s*\([^)]*\)\s*(?::\s*\w+\s*)?\{)/g;
  let match;
  while ((match = functionPattern.exec(content)) !== null) {
    const startLine = content.substring(0, match.index).split('\n').length;
    const afterMatch = content.substring(match.index);
    let braceCount = 0;
    let endLine = startLine;
    for (let i = 0; i < afterMatch.length && i < 5000; i++) {
      if (afterMatch[i] === '{') braceCount++;
      if (afterMatch[i] === '}') braceCount--;
      if (braceCount === 0 && i > 0) {
        endLine = content.substring(0, match.index + i + 1).split('\n').length;
        break;
      }
    }
    if (endLine - startLine > 50) {
      issues.push({ line: startLine, message: `Long function (${endLine - startLine} lines)`, suggestion: 'Break into smaller functions' });
    }
  }

  const importRegex = /^(?:import|from|require)\s+/gm;
  let importMatch;
  const imports: { line: number; text: string }[] = [];
  while ((importMatch = importRegex.exec(content)) !== null) {
    const lineNum = content.substring(0, importMatch.index).split('\n').length;
    imports.push({ line: lineNum, text: lines[lineNum - 1] || '' });
  }

  if (lang === 'typescript' || lang === 'javascript') {
    imports.forEach(({ line, text }) => {
      const nameMatch = text.match(/(?:import\s+\{\s*([^}]+)\s*\}|import\s+(\w+))/);
      if (nameMatch) {
        const imported = (nameMatch[1] || nameMatch[2] || '').split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
        imported.forEach(name => {
          if (name && !content.replace(lines[line - 1], '').includes(name)) {
            issues.push({ line, message: `Unused import: ${name}`, suggestion: 'Remove unused import' });
          }
        });
      }
    });
  }

  return issues;
}

function checkBestPractices(content: string, lang: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split('\n');

  if (lang === 'typescript' || lang === 'javascript') {
    const catchBlocks = content.match(/catch\s*\([^)]*\)\s*\{\s*\}/g);
    if (catchBlocks) {
      lines.forEach((line, idx) => {
        if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
          issues.push({ line: idx + 1, message: 'Empty catch block', suggestion: 'Handle the error or rethrow' });
        }
      });
    }

    const exportFuncs = content.match(/(?:export\s+(?:async\s+)?function|export\s+const\s+\w+\s*=\s*(?:async\s+)?)/g);
    if (exportFuncs) {
      lines.forEach((line, idx) => {
        if (/(?:export\s+(?:async\s+)?function|export\s+const\s+\w+\s*=)/.test(line)) {
          const prevLine = lines[idx - 1] || '';
          if (!prevLine.includes('/**') && !prevLine.includes('*')) {
            issues.push({ line: idx + 1, message: 'Missing JSDoc on exported function', suggestion: 'Add JSDoc documentation' });
          }
        }
      });
    }

    lines.forEach((line, idx) => {
      if (/function\s+\w+\(|const\s+\w+\s*=.*=>/.test(line) && !/:\s*(?:void|string|number|boolean|any|never|unknown|\w+[\w<>\[\]|&]*)/.test(line)) {
        if (!line.includes('export') && line.includes('function')) {
          issues.push({ line: idx + 1, message: 'Missing return type annotation', suggestion: 'Add explicit return type' });
        }
      }
    });
  }

  if (lang === 'python') {
    lines.forEach((line, idx) => {
      if (/def\s+\w+\s*\([^)]*\)\s*:/.test(line) && !/#\s*type:/.test(line) && !/->/.test(line)) {
        issues.push({ line: idx + 1, message: 'Missing type hints', suggestion: 'Add type annotations' });
      }
    });
  }

  return issues;
}

function calculateHealthScore(
  security: Issue[],
  performance: Issue[],
  style: Issue[],
  bestPractices: Issue[]
): number {
  let score = 100;
  security.forEach(() => { score -= 5; });
  performance.forEach(() => { score -= 3; });
  style.forEach(() => { score -= 1; });
  bestPractices.forEach(() => { score -= 2; });
  return Math.max(0, Math.min(100, score));
}

interface ReviewResult {
  file: string;
  language: string;
  healthScore: number;
  issues: {
    security: Issue[];
    performance: Issue[];
    style: Issue[];
    bestPractices: Issue[];
  };
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

function reviewFile(filePath: string, config: Config): ReviewResult | null {
  const content = readFileContent(filePath, config.maxFileSize);
  if (!content) return null;

  const lang = config.language === 'auto' ? detectLanguage(filePath) : config.language;

  const security = checkSecurityIssues(content, lang);
  const performance = checkPerformanceIssues(content, lang);
  const style = checkStyleIssues(content, lang);
  const bestPractices = checkBestPractices(content, lang);

  const allIssues = [...security, ...performance, ...style, ...bestPractices];
  const healthScore = calculateHealthScore(security, performance, style, bestPractices);

  return {
    file: filePath,
    language: lang,
    healthScore,
    issues: { security, performance, style, bestPractices },
    summary: {
      total: allIssues.length,
      errors: 0,
      warnings: allIssues.length,
      info: 0,
    },
  };
}

function reviewDiff(diff: string, config: Config): ReviewResult[] {
  const results: ReviewResult[] = [];
  const filePattern = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  let fileMatch;

  while ((fileMatch = filePattern.exec(diff)) !== null) {
    const filePath = fileMatch[2];
    const diffSection = diff.substring(fileMatch.index);
    const nextFileIdx = diff.indexOf('\ndiff --git ', fileMatch.index + 1);
    const section = nextFileIdx === -1 ? diffSection : diffSection.substring(0, nextFileIdx - fileMatch.index);

    const addedLines = section.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).map(l => l.substring(1)).join('\n');
    if (addedLines.trim()) {
      const lang = detectLanguage(filePath);
      const security = checkSecurityIssues(addedLines, lang);
      const performance = checkPerformanceIssues(addedLines, lang);
      const style = checkStyleIssues(addedLines, lang);
      const bestPractices = checkBestPractices(addedLines, lang);
      const allIssues = [...security, ...performance, ...style, ...bestPractices];

      results.push({
        file: filePath,
        language: lang,
        healthScore: calculateHealthScore(security, performance, style, bestPractices),
        issues: { security, performance, style, bestPractices },
        summary: { total: allIssues.length, errors: 0, warnings: allIssues.length, info: 0 },
      });
    }
  }

  return results;
}

function walkDir(dir: string, pattern: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...walkDir(fullPath, pattern));
      }
    } else {
      if (pattern === '*' || entry.name.endsWith(pattern.replace('*', ''))) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

export default function plugin(ctx: any) {
  const settings = ctx.settings.get<Config>(name);
  const config = configSchema.parse(settings || {});

  ctx.tools.register(name, 'review_file', {
    description: 'Review a single file for code quality issues',
    parameters: z.object({
      file: z.string().describe('Path to the file to review'),
    }),
    execute: async (params: { file: string }) => {
      const result = reviewFile(params.file, config);
      if (!result) {
        return { error: 'File not found or exceeds max file size' };
      }
      return result;
    },
  });

  ctx.tools.register(name, 'review_directory', {
    description: 'Review all files in a directory',
    parameters: z.object({
      path: z.string().optional().describe('Directory path (defaults to current directory)'),
      pattern: z.string().optional().describe('File pattern filter (e.g., *.ts)'),
    }),
    execute: async (params: { path?: string; pattern?: string }) => {
      const dir = params.path || '.';
      const pattern = params.pattern || '*';
      const files = walkDir(dir, pattern);
      const results: ReviewResult[] = [];

      for (const file of files) {
        const result = reviewFile(file, config);
        if (result) results.push(result);
      }

      const totalIssues = results.reduce((acc, r) => acc + r.summary.total, 0);
      const avgScore = results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + r.healthScore, 0) / results.length)
        : 0;

      return {
        directory: dir,
        fileCount: results.length,
        totalIssues,
        averageHealthScore: avgScore,
        files: results,
      };
    },
  });

  ctx.tools.register(name, 'review_diff', {
    description: 'Review git diff output for issues in changed code',
    parameters: z.object({
      diff: z.string().describe('Git diff output to review'),
    }),
    execute: async (params: { diff: string }) => {
      const results = reviewDiff(params.diff, config);
      const totalIssues = results.reduce((acc, r) => acc + r.summary.total, 0);

      return {
        fileCount: results.length,
        totalIssues,
        files: results,
      };
    },
  });

  ctx.commands.register(name, 'review', {
    description: 'Review current directory or specified path for code quality',
    parameters: z.object({
      path: z.string().optional().describe('Path to review'),
    }),
    execute: async (params: { path?: string }) => {
      const dir = params.path || '.';
      const files = walkDir(dir, '*');
      const results: ReviewResult[] = [];

      for (const file of files) {
        const result = reviewFile(file, config);
        if (result) results.push(result);
      }

      const totalIssues = results.reduce((acc, r) => acc + r.summary.total, 0);
      const avgScore = results.length > 0
        ? Math.round(results.reduce((acc, r) => acc + r.healthScore, 0) / results.length)
        : 0;

      const output = [
        `Code Review Results for: ${dir}`,
        `Files reviewed: ${results.length}`,
        `Total issues: ${totalIssues}`,
        `Average health score: ${avgScore}/100`,
        '',
      ];

      for (const r of results) {
        if (r.summary.total > 0) {
          output.push(`${r.file} (${r.language}) - Score: ${r.healthScore}/100`);
          if (r.issues.security.length) output.push(`  Security: ${r.issues.security.length}`);
          if (r.issues.performance.length) output.push(`  Performance: ${r.issues.performance.length}`);
          if (r.issues.style.length) output.push(`  Style: ${r.issues.style.length}`);
          if (r.issues.bestPractices.length) output.push(`  Best Practices: ${r.issues.bestPractices.length}`);
          output.push('');
        }
      }

      return output.join('\n');
    },
  });
}
