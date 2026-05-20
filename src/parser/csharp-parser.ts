import Parser from 'web-tree-sitter';

let parserInstance: Parser | null = null;
let csharpLanguage: Parser.Language | null = null;

export async function initParser(): Promise<void> {
  if (parserInstance) return;
  await Parser.init();
  parserInstance = new Parser();

  // web-tree-sitter loads grammar via .wasm files
  // The C# grammar WASM must be bundled or downloaded at runtime
  // For now, we'll lazy-load it when parseCSharpSource is first called
}

export async function loadCSharpLanguage(wasmPath?: string): Promise<void> {
  if (csharpLanguage) return;
  const path = wasmPath ?? findCSharpWasm();
  csharpLanguage = await Parser.Language.load(path);
  if (parserInstance) {
    parserInstance.setLanguage(csharpLanguage);
  }
}

export function parseCSharpSource(source: string): Parser.Tree {
  if (!parserInstance || !csharpLanguage) {
    throw new Error('Parser not initialized. Call initParser() and loadCSharpLanguage() first.');
  }
  return parserInstance.parse(source);
}

export function getParser(): Parser {
  if (!parserInstance) {
    throw new Error('Parser not initialized. Call initParser() first.');
  }
  return parserInstance;
}

export function getLanguage(): Parser.Language {
  if (!csharpLanguage) {
    throw new Error('C# language not loaded. Call loadCSharpLanguage() first.');
  }
  return csharpLanguage;
}

function findCSharpWasm(): string {
  // Look for the C# grammar WASM in common locations
  const { existsSync } = require('fs') as typeof import('fs');
  const { join } = require('path') as typeof import('path');

  const candidates = [
    join(process.cwd(), 'grammars', 'tree-sitter-c_sharp.wasm'),
    join(process.cwd(), 'node_modules', 'tree-sitter-c-sharp', 'tree-sitter-c_sharp.wasm'),
    join(__dirname, '..', '..', 'grammars', 'tree-sitter-c_sharp.wasm'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(
    'C# grammar WASM not found. Place tree-sitter-c_sharp.wasm in ./grammars/ or provide path via loadCSharpLanguage(path).',
  );
}

export { Parser };
