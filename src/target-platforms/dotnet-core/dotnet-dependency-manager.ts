import type { TargetDependencyManager, GenerationContext } from '../target-platform.interface.js';
import type { GeneratedFile, PackageDependency } from '../../types/common.js';

export class DotNetDependencyManager implements TargetDependencyManager {
  readonly packageManager = 'nuget';
  readonly lockFileName = '';

  generateManifest(
    dependencies: PackageDependency[],
    projectName: string,
    ctx: GenerationContext,
  ): GeneratedFile {
    const dotnetVersion = (ctx.targetOptions as Record<string, unknown>)['dotnetVersion'] ?? 8;
    const tfm = `net${dotnetVersion}.0`;

    const runtimeDeps: PackageDependency[] = [];
    const devDeps: PackageDependency[] = [];

    for (const dep of dependencies) {
      if (dep.scope === 'runtime') {
        runtimeDeps.push(dep);
      } else {
        devDeps.push(dep);
      }
    }

    // Deduplicate by name, keeping the first occurrence
    const seen = new Set<string>();
    const dedup = (deps: PackageDependency[]): PackageDependency[] =>
      deps.filter((d) => {
        if (seen.has(d.name)) return false;
        seen.add(d.name);
        return true;
      });

    const uniqueRuntime = dedup(runtimeDeps);
    const uniqueDev = dedup(devDeps);

    const runtimeRefs = uniqueRuntime
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((d) => `    <PackageReference Include="${d.name}" Version="${d.version}" />`)
      .join('\n');

    const devRefs = uniqueDev
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (d) =>
          `    <PackageReference Include="${d.name}" Version="${d.version}">\n      <PrivateAssets>all</PrivateAssets>\n      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>\n    </PackageReference>`,
      )
      .join('\n');

    const content = `<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>${tfm}</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <RootNamespace>${sanitizeNamespace(projectName)}</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
${runtimeRefs}
  </ItemGroup>

  <ItemGroup>
${devRefs}
  </ItemGroup>

</Project>
`;

    return {
      relativePath: `${sanitizeNamespace(projectName)}.csproj`,
      content,
      overwrite: true,
    };
  }

  getInstallCommand(): string {
    return 'dotnet restore';
  }

  getBuildCommand(): string {
    return 'dotnet build --no-restore';
  }

  getTestCommand(): string {
    return 'dotnet test --no-build';
  }
}

function sanitizeNamespace(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_.]/g, '')
    .replace(/^[0-9]/, '_$&');
}
