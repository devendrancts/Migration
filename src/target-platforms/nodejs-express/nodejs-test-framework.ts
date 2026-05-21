import type { TargetTestFramework, GenerationContext } from '../target-platform.interface.js';
import type { IRArtifact, IRController, IRService, IRModel, IRRepository } from '../../ir/types.js';
import type { GeneratedFile } from '../../types/common.js';

export class NodeJsTestFramework implements TargetTestFramework {
  readonly name = 'vitest';

  generateUnitTest(artifact: IRArtifact, _ctx: GenerationContext): GeneratedFile[] {
    switch (artifact.kind) {
      case 'controller':
        return [generateControllerUnitTest(artifact)];
      case 'service':
        return [generateServiceUnitTest(artifact)];
      case 'model':
        return [generateModelUnitTest(artifact)];
      case 'repository':
        return [generateRepositoryUnitTest(artifact)];
      default:
        return [];
    }
  }

  generateIntegrationTest(artifacts: IRArtifact[], _ctx: GenerationContext): GeneratedFile[] {
    const controllers = artifacts.filter((a): a is IRController => a.kind === 'controller');

    const controllerBlocks = controllers
      .map((ctrl) => {
        const actionLines = ctrl.actions
          .map((action) => {
            const method = action.httpMethod.toLowerCase();
            const fullPath = normalizePath(`${ctrl.basePath}${action.path}`);
            return `    it('${action.httpMethod} ${fullPath} should respond', async () => {
      const res = await request(app).${method}('${fullPath}');
      expect([200, 201, 204, 404, 422, 501]).toContain(res.status);
    });`;
          })
          .join('\n\n');

        return `  describe('${ctrl.name}', () => {
${actionLines}
  });`;
      })
      .join('\n\n');

    const content = `import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('API Integration Tests', () => {
  it('GET /health should return ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

${controllerBlocks}
});
`;

    return [
      {
        relativePath: 'tests/integration/api.test.ts',
        content,
        overwrite: true,
      },
    ];
  }

  generatePerformanceTest(artifacts: IRArtifact[], _ctx: GenerationContext): GeneratedFile[] {
    const controllers = artifacts.filter((a): a is IRController => a.kind === 'controller');

    const getChecks = controllers
      .flatMap((ctrl) =>
        ctrl.actions
          .filter((action) => action.httpMethod === 'GET')
          .map((action) => {
            const fullPath = normalizePath(`${ctrl.basePath}${action.path}`);
            const varName = toCamelCase(`${ctrl.name}_${action.name}`);
            return `  const ${varName}Res = http.get(\`\${baseUrl}${fullPath}\`);
  check(${varName}Res, { '${varName} responds': (r) => r.status < 500 });`;
          }),
      )
      .join('\n\n');

    const content = `// k6 load test script
// Run: k6 run tests/performance/load-test.ts
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

  // Health check
  const healthRes = http.get(\`\${baseUrl}/health\`);
  check(healthRes, { 'health is 200': (r) => r.status === 200 });

${getChecks}

  sleep(1);
}
`;

    return [
      {
        relativePath: 'tests/performance/load-test.ts',
        content,
        overwrite: true,
      },
    ];
  }

  generateTestConfig(_ctx: GenerationContext): GeneratedFile[] {
    const content = `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/**/index.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
`;

    return [
      {
        relativePath: 'vitest.config.ts',
        content,
        overwrite: true,
      },
    ];
  }
}

// ── Unit test generators ──

function generateControllerUnitTest(ctrl: IRController): GeneratedFile {
  const kebab = toKebabCase(ctrl.name.replace(/Controller$/i, ''));
  const routerName = `${toCamelCase(ctrl.name.replace(/Controller$/i, ''))}Router`;
  const basePath = normalizePath(ctrl.basePath);

  const itBlocks = ctrl.actions
    .map((action) => {
      const method = action.httpMethod.toLowerCase();
      const fullPath = normalizePath(`${basePath}${action.path}`);
      return `  it('${action.httpMethod} ${fullPath} should respond', async () => {
    const res = await request(app).${method}('${fullPath}');
    expect(res.status).toBeDefined();
  });`;
    })
    .join('\n\n');

  const content = `import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ${routerName} } from '../src/routes/${kebab}.js';

const app = express();
app.use(express.json());
app.use('${basePath}', ${routerName});

describe('${ctrl.name}', () => {
${itBlocks}
});
`;

  return {
    relativePath: `tests/${kebab}.routes.test.ts`,
    content,
    overwrite: true,
  };
}

function generateServiceUnitTest(svc: IRService): GeneratedFile {
  const kebab = toKebabCase(svc.name.replace(/Service$/i, ''));
  const className = `${svc.name.replace(/Service$/i, '')}Service`;
  const fileName = `${kebab}.service`;

  const mockedDepsArgs = svc.dependencies
    .map((dep) => {
      const varName = toCamelCase(dep.interfaceName.replace(/^I/, ''));
      return `mock${capitalize(varName)}`;
    })
    .join(', ');

  const mockDeclarations = svc.dependencies
    .map((dep) => {
      const varName = toCamelCase(dep.interfaceName.replace(/^I/, ''));
      return `    const mock${capitalize(varName)} = { } as any; // ${dep.interfaceName}`;
    })
    .join('\n');

  const methodBlocks = svc.methods
    .map((method) => {
      const dummyArgs = method.parameters
        .filter((p) => p.source !== 'injected')
        .map((p) => getDummyValue(p.type.name))
        .join(', ');

      const constructorArgs = svc.dependencies.length > 0 ? mockedDepsArgs : '';

      return `  it('should have ${method.name} method', () => {
${mockDeclarations}
    const service = new ${className}(${constructorArgs});
    expect(service.${method.name}).toBeDefined();
  });

  it('${method.name} should be callable', async () => {
${mockDeclarations}
    const service = new ${className}(${constructorArgs});
    await expect(service.${method.name}(${dummyArgs})).rejects.toThrow();
  });`;
    })
    .join('\n\n');

  const content = `import { describe, it, expect, vi } from 'vitest';
import { ${className} } from '../src/services/${fileName}.js';

describe('${className}', () => {
${methodBlocks}
});
`;

  return {
    relativePath: `tests/${kebab}.service.test.ts`,
    content,
    overwrite: true,
  };
}

function generateModelUnitTest(model: IRModel): GeneratedFile {
  const kebab = toKebabCase(model.name);
  const firstProp = model.properties[0];

  const propLines = model.properties
    .map((prop) => `      ${prop.name}: ${getDummyValue(prop.type.name)},`)
    .join('\n');

  const firstFieldCheck = firstProp
    ? `\n    expect(model.${firstProp.name}).toBeDefined();`
    : '';

  const content = `import { describe, it, expect } from 'vitest';

describe('${model.name} model', () => {
  it('should have correct shape', () => {
    const model: Record<string, unknown> = {
${propLines}
    };
${firstFieldCheck}
  });
});
`;

  return {
    relativePath: `tests/${kebab}.model.test.ts`,
    content,
    overwrite: true,
  };
}

function generateRepositoryUnitTest(repo: IRRepository): GeneratedFile {
  const kebab = toKebabCase(repo.name.replace(/Repository$/i, ''));
  const className = `${repo.name.replace(/Repository$/i, '')}Repository`;
  const fileName = `${kebab}.repository`;

  const content = `import { describe, it, expect, vi } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock db client does not have a typed interface
import { ${className} } from '../src/repositories/${fileName}.js';

describe('${className}', () => {
  it('should accept a db client', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- intentional test stub
    const mockDb = {} as any;
    const repo = new ${className}(mockDb);
    expect(repo).toBeDefined();
  });
});
`;

  return {
    relativePath: `tests/${kebab}.repository.test.ts`,
    content,
    overwrite: true,
  };
}

// ── Helpers ──

function splitWords(name: string): string[] {
  if (name.includes('_') || name.includes('-')) {
    return name.split(/[_\-]+/).filter(Boolean);
  }
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean);
}

function toKebabCase(name: string): string {
  return splitWords(name).map((w) => w.toLowerCase()).join('-');
}

function toCamelCase(name: string): string {
  const words = splitWords(name);
  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : capitalize(w.toLowerCase())))
    .join('');
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+/g, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function getDummyValue(tsType: string): string {
  const lower = tsType.toLowerCase();
  if (lower === 'string') return '"test"';
  if (lower === 'number' || lower === 'int' || lower === 'integer' || lower === 'float' || lower === 'double') return '1';
  if (lower === 'boolean' || lower === 'bool') return 'true';
  if (lower === 'date' || lower === 'datetime') return 'new Date()';
  if (lower === 'bigint') return '1n';
  if (lower.includes('[]') || lower.startsWith('array')) return '[]';
  if (lower.startsWith('record') || lower.startsWith('map') || lower === 'object') return '{}';
  return 'undefined';
}
