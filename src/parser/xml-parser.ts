import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
});

export function parseXml(xmlContent: string): Record<string, unknown> {
  return parser.parse(xmlContent) as Record<string, unknown>;
}

export interface WebConfigData {
  appSettings: { key: string; value: string }[];
  connectionStrings: { name: string; connectionString: string; providerName: string }[];
  httpModules: string[];
  httpHandlers: string[];
}

export function parseWebConfig(xmlContent: string): WebConfigData {
  const parsed = parseXml(xmlContent);
  const config = (parsed as Record<string, unknown>).configuration as Record<string, unknown> | undefined;
  if (!config) return { appSettings: [], connectionStrings: [], httpModules: [], httpHandlers: [] };

  const appSettings = extractAppSettings(config);
  const connectionStrings = extractConnectionStrings(config);
  const httpModules = extractHttpModules(config);
  const httpHandlers = extractHttpHandlers(config);

  return { appSettings, connectionStrings, httpModules, httpHandlers };
}

function extractAppSettings(config: Record<string, unknown>): { key: string; value: string }[] {
  const section = config.appSettings as Record<string, unknown> | undefined;
  if (!section) return [];
  const adds = normalizeArray(section.add);
  return adds.map((a: Record<string, unknown>) => ({
    key: String(a['@_key'] ?? ''),
    value: String(a['@_value'] ?? ''),
  }));
}

function extractConnectionStrings(
  config: Record<string, unknown>,
): { name: string; connectionString: string; providerName: string }[] {
  const section = config.connectionStrings as Record<string, unknown> | undefined;
  if (!section) return [];
  const adds = normalizeArray(section.add);
  return adds.map((a: Record<string, unknown>) => ({
    name: String(a['@_name'] ?? ''),
    connectionString: String(a['@_connectionString'] ?? ''),
    providerName: String(a['@_providerName'] ?? ''),
  }));
}

function extractHttpModules(config: Record<string, unknown>): string[] {
  const webServer = config['system.webServer'] as Record<string, unknown> | undefined;
  if (!webServer) return [];
  const modules = webServer.modules as Record<string, unknown> | undefined;
  if (!modules) return [];
  const adds = normalizeArray(modules.add);
  return adds.map((a: Record<string, unknown>) => String(a['@_name'] ?? a['@_type'] ?? ''));
}

function extractHttpHandlers(config: Record<string, unknown>): string[] {
  const webServer = config['system.webServer'] as Record<string, unknown> | undefined;
  if (!webServer) return [];
  const handlers = webServer.handlers as Record<string, unknown> | undefined;
  if (!handlers) return [];
  const adds = normalizeArray(handlers.add);
  return adds.map((a: Record<string, unknown>) => String(a['@_name'] ?? a['@_type'] ?? ''));
}

function normalizeArray(val: unknown): Record<string, unknown>[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as Record<string, unknown>[];
  return [val as Record<string, unknown>];
}
