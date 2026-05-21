import type { TargetTestFramework, GenerationContext } from '../target-platform.interface.js';
import type { IRArtifact, IRController, IRService, IRModel, IRRepository } from '../../ir/types.js';
import type { GeneratedFile } from '../../types/common.js';

export class PythonTestFramework implements TargetTestFramework {
  readonly name = 'pytest';

  generateUnitTest(artifact: IRArtifact, _ctx: GenerationContext): GeneratedFile[] {
    switch (artifact.kind) {
      case 'controller':
        return generateControllerUnitTest(artifact);
      case 'service':
        return generateServiceUnitTest(artifact);
      case 'model':
        return generateModelUnitTest(artifact);
      case 'repository':
        return generateRepositoryUnitTest(artifact);
      default:
        return [];
    }
  }

  generateIntegrationTest(artifacts: IRArtifact[], _ctx: GenerationContext): GeneratedFile[] {
    const controllers = artifacts.filter((a): a is IRController => a.kind === 'controller');

    const controllerBlocks = controllers
      .map((ctrl) => {
        const snakeName = toSnakeCase(ctrl.name.replace(/Controller$/, ''));
        const actionAssertions = ctrl.actions
          .map((action) => {
            const method = action.httpMethod.toLowerCase();
            const fullPath = normalizePath(ctrl.basePath, action.path);
            return `    response = await client.${method}("${fullPath}")\n    assert response.status_code in [200, 201, 404, 422, 501]`;
          })
          .join('\n\n');

        return `@pytest.mark.asyncio\nasync def test_${snakeName}_endpoints(client: AsyncClient) -> None:\n${actionAssertions}`;
      })
      .join('\n\n\n');

    const content = `import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


${controllerBlocks}
`;

    return [
      {
        relativePath: 'tests/integration/test_api.py',
        content,
        overwrite: true,
      },
    ];
  }

  generatePerformanceTest(artifacts: IRArtifact[], _ctx: GenerationContext): GeneratedFile[] {
    const controllers = artifacts.filter((a): a is IRController => a.kind === 'controller');

    const getTaskBlocks = controllers.flatMap((ctrl) =>
      ctrl.actions
        .filter((a) => a.httpMethod === 'GET')
        .map((action) => {
          const snakeName = toSnakeCase(action.name);
          const fullPath = normalizePath(ctrl.basePath, action.path);
          return `    @task\n    def test_${snakeName}(self) -> None:\n        self.client.get("${fullPath}")`;
        }),
    );

    const taskSection =
      getTaskBlocks.length > 0
        ? getTaskBlocks.join('\n\n')
        : '    @task\n    def placeholder(self) -> None:\n        pass';

    const content = `from locust import HttpUser, task, between


class APIUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def health_check(self) -> None:
        self.client.get("/health")

${taskSection}
`;

    return [
      {
        relativePath: 'tests/performance/locustfile.py',
        content,
        overwrite: true,
      },
    ];
  }

  generateTestConfig(_ctx: GenerationContext): GeneratedFile[] {
    const conftest = `import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
`;

    const pyprojectTest = `[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
python_files = "test_*.py"
python_functions = "test_*"
`;

    return [
      {
        relativePath: 'tests/conftest.py',
        content: conftest,
        overwrite: true,
      },
      {
        relativePath: 'pytest.ini',
        content: pyprojectTest,
        overwrite: true,
      },
    ];
  }
}

// ── Per-kind unit test generators ──

function generateControllerUnitTest(ctrl: IRController): GeneratedFile[] {
  const snakeControllerName = toSnakeCase(ctrl.name.replace(/Controller$/, ''));

  const testFunctions = ctrl.actions
    .map((action) => {
      const snakeActionName = toSnakeCase(action.name);
      const method = action.httpMethod.toLowerCase();
      const fullPath = normalizePath(ctrl.basePath, action.path);
      const expectedStatus = resolveExpectedStatus(action.httpMethod);

      return `@pytest.mark.asyncio\nasync def test_${snakeActionName}_${expectedStatus}(client: AsyncClient) -> None:\n    response = await client.${method}("${fullPath}")\n    assert response.status_code == ${expectedStatus}`;
    })
    .join('\n\n\n');

  const content = `import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# Tests for ${ctrl.name}
${testFunctions}
`;

  return [
    {
      relativePath: `tests/test_${snakeControllerName}_router.py`,
      content,
      overwrite: true,
    },
  ];
}

function generateServiceUnitTest(svc: IRService): GeneratedFile[] {
  const snakeName = toSnakeCase(svc.name.replace(/Service$/, ''));
  const className = `${stripServiceSuffix(svc.name)}Service`;

  const mockSetup = svc.dependencies
    .map((dep) => {
      const mockName = `mock_${toSnakeCase(dep.interfaceName.replace(/^I/, ''))}`;
      return `    ${mockName} = AsyncMock()`;
    })
    .join('\n');

  const depArgs = svc.dependencies
    .map((dep) => `mock_${toSnakeCase(dep.interfaceName.replace(/^I/, ''))}`)
    .join(', ');

  const testFunctions = svc.methods
    .filter((m) => m.accessModifier === 'public')
    .map((method) => {
      const snakeMethodName = toSnakeCase(method.name);
      const dummyArgs = method.parameters
        .filter((p) => p.source !== 'injected')
        .map((p) => getDummyValue(p.type.name))
        .join(', ');

      return `@pytest.mark.asyncio\nasync def test_${snakeMethodName}() -> None:\n    # Arrange\n${mockSetup || '    pass'}\n    service = ${className}(${depArgs})\n\n    # Act & Assert\n    with pytest.raises(NotImplementedError):\n        await service.${toSnakeCase(method.name)}(${dummyArgs})`;
    })
    .join('\n\n\n');

  const content = `import pytest
from unittest.mock import AsyncMock
from app.services.${snakeName}_service import ${className}


${testFunctions || `def test_${snakeName}_service_placeholder() -> None:\n    pass`}
`;

  return [
    {
      relativePath: `tests/test_${snakeName}_service.py`,
      content,
      overwrite: true,
    },
  ];
}

function generateModelUnitTest(model: IRModel): GeneratedFile[] {
  const snakeName = toSnakeCase(model.name);
  const className = `${model.name}Schema`;

  const requiredProps = model.properties.filter((p) => !p.type.isOptional && !p.type.isNullable);
  const firstProp = requiredProps[0];

  const dataLines = requiredProps
    .map((p) => `        "${toSnakeCase(p.name)}": ${getDummyValue(p.type.name)}`)
    .join(',\n');

  const assertLine =
    firstProp != null
      ? `    assert schema.${toSnakeCase(firstProp.name)} == ${getDummyValue(firstProp.type.name)}`
      : '    assert schema is not None';

  const content = `import pytest
from app.schemas.${snakeName}_schema import ${className}


def test_${snakeName}_schema_creation() -> None:
    data = {
${dataLines}
    }
    schema = ${className}(**data)
${assertLine}


def test_${snakeName}_schema_validation() -> None:
    with pytest.raises(Exception):
        ${className}()  # Missing required fields
`;

  return [
    {
      relativePath: `tests/test_${snakeName}_schema.py`,
      content,
      overwrite: true,
    },
  ];
}

function generateRepositoryUnitTest(repo: IRRepository): GeneratedFile[] {
  const snakeName = toSnakeCase(repo.name.replace(/Repository$/, ''));
  const className = `${stripRepositorySuffix(repo.name)}Repository`;

  const methodTests = repo.methods
    .filter((m) => m.accessModifier === 'public')
    .slice(0, 3)
    .map((method) => {
      const snakeMethodName = toSnakeCase(method.name);
      return `@pytest.mark.asyncio\nasync def test_${snakeName}_${snakeMethodName}() -> None:\n    session = AsyncMock()\n    repo = ${className}(session)\n    assert hasattr(repo, "${toSnakeCase(method.name)}")`;
    })
    .join('\n\n\n');

  const content = `import pytest
from unittest.mock import AsyncMock


${methodTests || `@pytest.mark.asyncio\nasync def test_${snakeName}_find_by_id() -> None:\n    session = AsyncMock()\n    assert session is not None`}
`;

  return [
    {
      relativePath: `tests/test_${snakeName}_repository.py`,
      content,
      overwrite: true,
    },
  ];
}

// ── Helpers ──

function toSnakeCase(name: string): string {
  if (name.includes('_') || name.includes('-')) {
    return name
      .split(/[_\-]+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase())
      .join('_');
  }
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function getDummyValue(typeName: string): string {
  const dummies: Record<string, string> = {
    str: '"test"',
    int: '1',
    float: '1.0',
    bool: 'True',
    datetime: 'datetime.utcnow()',
    UUID: 'uuid4()',
    Decimal: 'Decimal("0")',
    list: '[]',
    dict: '{}',
    // Common C#-sourced names that may appear in IRTypeRef
    string: '"test"',
    int32: '1',
    int64: '1',
    double: '1.0',
    boolean: 'True',
  };
  return dummies[typeName] ?? '"test"';
}

function normalizePath(basePath: string, actionPath: string): string {
  const base = basePath.startsWith('/') ? basePath : `/${basePath}`;
  if (!actionPath || actionPath === '/') return base;
  const action = actionPath.startsWith('/') ? actionPath : `/${actionPath}`;
  return `${base}${action}`;
}

function resolveExpectedStatus(httpMethod: string): number {
  if (httpMethod === 'POST') return 201;
  if (httpMethod === 'DELETE') return 204;
  return 200;
}

function stripServiceSuffix(name: string): string {
  return name.endsWith('Service') ? name.slice(0, -'Service'.length) : name;
}

function stripRepositorySuffix(name: string): string {
  return name.endsWith('Repository') ? name.slice(0, -'Repository'.length) : name;
}
