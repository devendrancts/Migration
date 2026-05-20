import type { TargetOptionsSchema, TargetOption } from '../target-platform.interface.js';
import type { ArchitectureType } from '../../types/migration.js';
import type { PackageDependency } from '../../types/common.js';

export class PythonOptionsSchema implements TargetOptionsSchema {
  readonly ormOptions: TargetOption[] = [
    {
      value: 'sqlalchemy',
      label: 'SQLAlchemy',
      description: 'Full-featured ORM with both ORM and Core expression language',
      isDefault: true,
      additionalDependencies: [
        { name: 'sqlalchemy[asyncio]', version: '>=2.0', scope: 'runtime', packageManager: 'pip' },
        { name: 'asyncpg', version: '>=0.29', scope: 'runtime', packageManager: 'pip' },
        { name: 'alembic', version: '>=1.13', scope: 'runtime', packageManager: 'pip' },
      ],
    },
    {
      value: 'sqlmodel',
      label: 'SQLModel',
      description: 'SQLAlchemy + Pydantic combined — models are both ORM and API schemas',
      isDefault: false,
      additionalDependencies: [
        { name: 'sqlmodel', version: '>=0.0.16', scope: 'runtime', packageManager: 'pip' },
        { name: 'asyncpg', version: '>=0.29', scope: 'runtime', packageManager: 'pip' },
      ],
    },
    {
      value: 'tortoise-orm',
      label: 'Tortoise ORM',
      description: 'Async-native ORM inspired by Django ORM',
      isDefault: false,
      additionalDependencies: [
        { name: 'tortoise-orm[asyncpg]', version: '>=0.21', scope: 'runtime', packageManager: 'pip' },
        { name: 'aerich', version: '>=0.7', scope: 'runtime', packageManager: 'pip' },
      ],
    },
  ];

  readonly validationOptions: TargetOption[] = [
    {
      value: 'pydantic',
      label: 'Pydantic v2',
      description: 'Data validation using Python type annotations (built into FastAPI)',
      isDefault: true,
      additionalDependencies: [],
    },
  ];

  readonly authOptions: TargetOption[] = [
    {
      value: 'fastapi-security-jwt',
      label: 'FastAPI + JWT',
      description: 'JWT authentication using python-jose and passlib',
      isDefault: true,
      additionalDependencies: [
        { name: 'python-jose[cryptography]', version: '>=3.3', scope: 'runtime', packageManager: 'pip' },
        { name: 'passlib[bcrypt]', version: '>=1.7', scope: 'runtime', packageManager: 'pip' },
      ],
    },
    {
      value: 'fastapi-oauth2',
      label: 'FastAPI + OAuth2',
      description: 'OAuth2 with OpenID Connect via authlib',
      isDefault: false,
      additionalDependencies: [
        { name: 'authlib', version: '>=1.3', scope: 'runtime', packageManager: 'pip' },
        { name: 'httpx', version: '>=0.27', scope: 'runtime', packageManager: 'pip' },
      ],
    },
    {
      value: 'custom',
      label: 'Custom',
      description: 'Custom authentication dependency',
      isDefault: false,
      additionalDependencies: [],
    },
    {
      value: 'none',
      label: 'None',
      description: 'No authentication (public API)',
      isDefault: false,
      additionalDependencies: [],
    },
  ];

  readonly diOptions: TargetOption[] = [
    {
      value: 'fastapi-depends',
      label: 'FastAPI Depends (built-in)',
      description: 'FastAPI built-in dependency injection system',
      isDefault: true,
      additionalDependencies: [],
    },
    {
      value: 'dependency-injector',
      label: 'Dependency Injector',
      description: 'Full IoC container with providers and wiring',
      isDefault: false,
      additionalDependencies: [
        { name: 'dependency-injector', version: '>=4.41', scope: 'runtime', packageManager: 'pip' },
      ],
    },
  ];

  readonly testFrameworkOptions: TargetOption[] = [
    {
      value: 'pytest',
      label: 'pytest',
      description: 'Python testing framework with async support via pytest-asyncio',
      isDefault: true,
      additionalDependencies: [
        { name: 'pytest', version: '>=8.0', scope: 'dev', packageManager: 'pip' },
        { name: 'pytest-asyncio', version: '>=0.23', scope: 'dev', packageManager: 'pip' },
        { name: 'httpx', version: '>=0.27', scope: 'dev', packageManager: 'pip' },
      ],
    },
  ];

  readonly apiDocsOptions: TargetOption[] = [
    {
      value: 'swagger',
      label: 'Swagger UI (built-in)',
      description: 'FastAPI auto-generates Swagger UI at /docs',
      isDefault: true,
      additionalDependencies: [],
    },
    {
      value: 'none',
      label: 'None',
      description: 'Disable auto-generated docs',
      isDefault: false,
      additionalDependencies: [],
    },
  ];

  getBaseDependencies(_architecture: ArchitectureType): PackageDependency[] {
    return [
      { name: 'fastapi', version: '>=0.111', scope: 'runtime', packageManager: 'pip' },
      { name: 'uvicorn[standard]', version: '>=0.30', scope: 'runtime', packageManager: 'pip' },
      { name: 'pydantic', version: '>=2.7', scope: 'runtime', packageManager: 'pip' },
      { name: 'pydantic-settings', version: '>=2.2', scope: 'runtime', packageManager: 'pip' },
      { name: 'python-dotenv', version: '>=1.0', scope: 'runtime', packageManager: 'pip' },
      { name: 'pytest', version: '>=8.0', scope: 'dev', packageManager: 'pip' },
      { name: 'pytest-asyncio', version: '>=0.23', scope: 'dev', packageManager: 'pip' },
      { name: 'ruff', version: '>=0.4', scope: 'dev', packageManager: 'pip' },
      { name: 'mypy', version: '>=1.10', scope: 'dev', packageManager: 'pip' },
    ];
  }

  validateOptions(options: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (options['platform'] !== 'python-fastapi') {
      errors.push(`Expected platform 'python-fastapi', got '${String(options['platform'])}'`);
    }
    return { valid: errors.length === 0, errors };
  }
}
