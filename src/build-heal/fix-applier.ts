import { readFileSync, writeFileSync } from 'fs';
import { join, isAbsolute } from 'path';

export interface FixApplication {
  file: string;
  oldCode: string;
  newCode: string;
}

export interface FixResult {
  success: boolean;
  fileModified: string;
  error?: string;
}

export class FixApplier {
  apply(projectPath: string, fix: FixApplication): FixResult {
    const filePath = isAbsolute(fix.file)
      ? fix.file
      : join(projectPath, fix.file);

    try {
      const content = readFileSync(filePath, 'utf-8');

      if (!content.includes(fix.oldCode)) {
        return {
          success: false,
          fileModified: filePath,
          error: `Could not find the old code snippet in ${filePath}`,
        };
      }

      const updated = content.replace(fix.oldCode, fix.newCode);
      writeFileSync(filePath, updated, 'utf-8');

      return {
        success: true,
        fileModified: filePath,
      };
    } catch (err: any) {
      return {
        success: false,
        fileModified: filePath,
        error: err.message ?? String(err),
      };
    }
  }
}
