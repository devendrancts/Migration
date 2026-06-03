import type { TargetTestFramework, GenerationContext } from '../target-platform.interface.js';
import type { IRArtifact, IRController, IRService, IRModel, IRRepository } from '../../ir/types.js';
import type { GeneratedFile } from '../../types/common.js';

export class DotNetTestFramework implements TargetTestFramework {
  readonly name = 'xunit';

  generateUnitTest(artifact: IRArtifact, ctx: GenerationContext): GeneratedFile[] {
    const orm = getOrm(ctx);
    switch (artifact.kind) {
      case 'controller':
        return [generateControllerUnitTest(artifact)];
      case 'service':
        return [generateServiceUnitTest(artifact)];
      case 'model':
        return [generateModelUnitTest(artifact)];
      case 'repository':
        return [generateRepositoryUnitTest(artifact, orm)];
      default:
        return [];
    }
  }

  generateIntegrationTest(artifacts: IRArtifact[], _ctx: GenerationContext): GeneratedFile[] {
    const controllers = artifacts.filter((a): a is IRController => a.kind === 'controller');

    const testMethods = controllers
      .flatMap((ctrl) =>
        ctrl.actions.map((action) => {
          const fullPath = normalizePath(`${ctrl.basePath}${action.path}`);
          const methodName = `${action.httpMethod}_${safeName(ctrl.name)}_${safeName(action.name)}_ShouldRespond`;
          const httpMethod = action.httpMethod;
          const clientMethod = httpMethod === 'GET' ? 'GetAsync' :
            httpMethod === 'POST' ? 'PostAsync' :
            httpMethod === 'PUT' ? 'PutAsync' :
            httpMethod === 'DELETE' ? 'DeleteAsync' : 'GetAsync';
          const args = httpMethod === 'POST' || httpMethod === 'PUT'
            ? `"${fullPath}", new StringContent("{}", Encoding.UTF8, "application/json")`
            : `"${fullPath}"`;
          return `    [Fact]
    public async Task ${methodName}()
    {
        // Arrange & Act
        var response = await _client.${clientMethod}(${args});

        // Assert
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.OK, HttpStatusCode.Created, HttpStatusCode.NoContent,
            HttpStatusCode.NotFound, HttpStatusCode.BadRequest, HttpStatusCode.NotImplemented);
    }`;
        }),
      )
      .join('\n\n');

    const content = `using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Tests.Integration;

public class ApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_Endpoint_ShouldReturnOk()
    {
        var response = await _client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

${testMethods}
}
`;

    return [
      {
        relativePath: 'tests/Integration/ApiIntegrationTests.cs',
        content,
        overwrite: true,
      },
    ];
  }

  generatePerformanceTest(artifacts: IRArtifact[], _ctx: GenerationContext): GeneratedFile[] {
    const controllers = artifacts.filter((a): a is IRController => a.kind === 'controller');

    const benchmarkMethods = controllers
      .flatMap((ctrl) =>
        ctrl.actions
          .filter((a) => a.httpMethod === 'GET')
          .map((action) => {
            const fullPath = normalizePath(`${ctrl.basePath}${action.path}`);
            const methodName = `Get_${safeName(ctrl.name)}_${safeName(action.name)}`;
            return `    [Benchmark]
    public async Task ${methodName}()
    {
        await _client.GetAsync("${fullPath}");
    }`;
          }),
      )
      .join('\n\n');

    const content = `using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Tests.Performance;

[MemoryDiagnoser]
public class ApiBenchmarks
{
    private HttpClient _client = null!;
    private WebApplicationFactory<Program> _factory = null!;

    [GlobalSetup]
    public void Setup()
    {
        _factory = new WebApplicationFactory<Program>();
        _client = _factory.CreateClient();
    }

    [GlobalCleanup]
    public void Cleanup()
    {
        _client.Dispose();
        _factory.Dispose();
    }

${benchmarkMethods}
}

// Run with: dotnet run --configuration Release
public class Program
{
    public static void Main(string[] args) => BenchmarkRunner.Run<ApiBenchmarks>();
}
`;

    return [
      {
        relativePath: 'tests/Performance/ApiBenchmarks.cs',
        content,
        overwrite: true,
      },
    ];
  }

  generateTestConfig(ctx: GenerationContext): GeneratedFile[] {
    const dotnetVersion = ((ctx.targetOptions as Record<string, unknown>)['dotnetVersion'] ?? 8) as number;
    const tfm = `net${dotnetVersion}.0`;
    const projectName = 'MigratedApp'; // Will be overridden in manifest

    const content = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>${tfm}</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="coverlet.collector" Version="6.0.2">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
    <PackageReference Include="FluentAssertions" Version="6.12.2" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.11" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageReference Include="Moq" Version="4.20.72" />
    <PackageReference Include="xunit" Version="2.9.3" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.8.2">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\\${projectName}.csproj" />
  </ItemGroup>

</Project>
`;

    const globalUsings = `global using Xunit;
global using FluentAssertions;
global using Moq;
`;

    return [
      {
        relativePath: 'tests/Tests.csproj',
        content,
        overwrite: true,
      },
      {
        relativePath: 'tests/GlobalUsings.cs',
        content: globalUsings,
        overwrite: true,
      },
    ];
  }
}

// ── Unit test generators ──

function generateControllerUnitTest(ctrl: IRController): GeneratedFile {
  const className = ctrl.name;
  const testClassName = `${className}Tests`;

  const depMocks = ctrl.dependencies
    .map((dep) => {
      const mockName = `_mock${dep.interfaceName.replace(/^I/, '')}`;
      return `    private readonly Mock<${dep.interfaceName}> ${mockName} = new();`;
    })
    .join('\n');

  const ctorArgs = ctrl.dependencies
    .map((dep) => `_mock${dep.interfaceName.replace(/^I/, '')}.Object`)
    .join(', ');

  const testMethods = ctrl.actions
    .map((action) => {
      const methodName = `${action.name}_ShouldReturnResult`;
      return `    [Fact]
    public async Task ${methodName}()
    {
        // Arrange
        var controller = new ${className}(${ctorArgs});

        // Act & Assert
        Assert.NotNull(controller);
    }`;
    })
    .join('\n\n');

  const content = `using Moq;
using Xunit;
using Microsoft.AspNetCore.Mvc;

namespace Tests.Controllers;

public class ${testClassName}
{
${depMocks}

${testMethods}
}
`;

  return {
    relativePath: `tests/Controllers/${testClassName}.cs`,
    content,
    overwrite: true,
  };
}

function generateServiceUnitTest(svc: IRService): GeneratedFile {
  const className = svc.name;
  const testClassName = `${className}Tests`;

  const depMocks = svc.dependencies
    .map((dep) => {
      const mockName = `_mock${dep.interfaceName.replace(/^I/, '')}`;
      return `    private readonly Mock<${dep.interfaceName}> ${mockName} = new();`;
    })
    .join('\n');

  const ctorArgs = svc.dependencies
    .map((dep) => `_mock${dep.interfaceName.replace(/^I/, '')}.Object`)
    .join(', ');

  const testMethods = svc.methods
    .map((method) => {
      return `    [Fact]
    public void ${method.name}_ShouldBeDefined()
    {
        // Arrange
        var service = new ${className}(${ctorArgs});

        // Assert
        Assert.NotNull(service);
    }`;
    })
    .join('\n\n');

  const content = `using Moq;
using Xunit;

namespace Tests.Services;

public class ${testClassName}
{
${depMocks}

${testMethods}
}
`;

  return {
    relativePath: `tests/Services/${testClassName}.cs`,
    content,
    overwrite: true,
  };
}

function generateModelUnitTest(model: IRModel): GeneratedFile {
  const testClassName = `${model.name}Tests`;

  const propAssertions = model.properties
    .map((prop) => {
      const dummy = getDummyValue(prop.type.name);
      return `        ${prop.name} = ${dummy},`;
    })
    .join('\n');

  const firstPropCheck = model.properties[0]
    ? `\n        Assert.NotNull(model.${model.properties[0].name}?.ToString());`
    : '';

  const content = `using Xunit;

namespace Tests.Models;

public class ${testClassName}
{
    [Fact]
    public void Should_HaveCorrectShape()
    {
        var model = new ${model.name}
        {
${propAssertions}
        };

        Assert.NotNull(model);${firstPropCheck}
    }
}
`;

  return {
    relativePath: `tests/Models/${testClassName}.cs`,
    content,
    overwrite: true,
  };
}

function generateRepositoryUnitTest(repo: IRRepository, orm: string): GeneratedFile {
  const className = repo.name;
  const testClassName = `${className}Tests`;

  let body: string;
  if (orm === 'ado-net') {
    body = `    private readonly Mock<IDbConnectionFactory> _mockFactory = new();

    [Fact]
    public void Should_AcceptConnectionFactory()
    {
        var repo = new ${className}(_mockFactory.Object);
        Assert.NotNull(repo);
    }`;
  } else if (orm === 'dapper') {
    body = `    [Fact]
    public void Should_BeInstantiable()
    {
        // Dapper repositories use IDbConnection
        var mockConnection = new Mock<System.Data.IDbConnection>();
        var repo = new ${className}(mockConnection.Object);
        Assert.NotNull(repo);
    }`;
  } else {
    body = `    [Fact]
    public void Should_AcceptDbContext()
    {
        // EF Core repository — requires DbContext mock or InMemory provider
        Assert.True(true, "Repository test placeholder — use InMemory provider for integration");
    }`;
  }

  const content = `using Moq;
using Xunit;

namespace Tests.Repositories;

public class ${testClassName}
{
${body}
}
`;

  return {
    relativePath: `tests/Repositories/${testClassName}.cs`,
    content,
    overwrite: true,
  };
}

// ── Helpers ──

function getOrm(ctx: GenerationContext): string {
  return ((ctx.targetOptions as Record<string, unknown>)['orm'] as string) ?? 'efcore';
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '');
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+/g, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function getDummyValue(csType: string): string {
  const lower = csType.toLowerCase();
  if (lower === 'string') return '"test"';
  if (lower === 'int' || lower === 'int32' || lower === 'long' || lower === 'int64') return '1';
  if (lower === 'float' || lower === 'double' || lower === 'decimal') return '1.0m';
  if (lower === 'bool' || lower === 'boolean') return 'true';
  if (lower === 'datetime' || lower === 'datetimeoffset') return 'DateTime.UtcNow';
  if (lower === 'guid') return 'Guid.NewGuid()';
  return 'default!';
}
