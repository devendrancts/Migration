export interface AppSettingsData {
  entries: { key: string; value: string; section: string }[];
  connectionStrings: { name: string; connectionString: string }[];
  logging: { logLevel: Record<string, string> } | null;
}

export function parseAppSettings(jsonContent: string): AppSettingsData {
  const parsed = JSON.parse(jsonContent) as Record<string, unknown>;
  const entries: { key: string; value: string; section: string }[] = [];
  const connectionStrings: { name: string; connectionString: string }[] = [];

  flattenConfig(parsed, '', entries);

  const connStrSection = parsed.ConnectionStrings as Record<string, string> | undefined;
  if (connStrSection) {
    for (const [name, value] of Object.entries(connStrSection)) {
      connectionStrings.push({ name, connectionString: value });
    }
  }

  const logging = parsed.Logging as { LogLevel?: Record<string, string> } | undefined;

  return {
    entries: entries.filter(
      (e) => !e.key.startsWith('ConnectionStrings.') && !e.key.startsWith('Logging.'),
    ),
    connectionStrings,
    logging: logging?.LogLevel ? { logLevel: logging.LogLevel } : null,
  };
}

function flattenConfig(
  obj: Record<string, unknown>,
  prefix: string,
  result: { key: string; value: string; section: string }[],
): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const section = prefix || key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenConfig(value as Record<string, unknown>, fullKey, result);
    } else {
      result.push({ key: fullKey, value: String(value), section });
    }
  }
}
