# Graph Report - Migration  (2026-05-20)

## Corpus Check
- 62 files · ~18,019 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 403 nodes · 643 edges · 24 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]

## God Nodes (most connected - your core abstractions)
1. `DddStrategy` - 23 edges
2. `CleanStrategy` - 22 edges
3. `MvcStrategy` - 22 edges
4. `JavaNamingConvention` - 11 edges
5. `NodeJsNamingConvention` - 11 edges
6. `PythonNamingConvention` - 11 edges
7. `JavaBuildSystem` - 10 edges
8. `NodeJsBuildSystem` - 10 edges
9. `PythonBuildSystem` - 10 edges
10. `detectPlatform()` - 9 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (13): JavaSpringPlatform, NodeJsExpressPlatform, PythonFastApiPlatform, JavaArchitectureAdapter, toPascalCase(), depToXml(), resolveGroupArtifact(), JavaOptionsSchema (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (7): CoverageAnalyzer, CoverageHealLoop, ErrorDiagnoser, FixApplier, HealLoop, NodeJsBuildSystem, PythonBuildSystem

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (9): NodeJsCodeGenerator, splitWords(), toCamelCase(), toKebabCase(), toPascalCase(), PythonCodeGenerator, MigrationContext, SkillOrchestrator (+1 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (3): JavaCodeGenerator, JavaTestFramework, PythonTestFramework

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (1): DddStrategy

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (1): CleanStrategy

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (1): MvcStrategy

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (9): createDefault(), detectConfigFormat(), detectDiContainer(), detectEfVersion(), detectPlatform(), extractTargetFramework(), findFiles(), isNet6OrLater() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.21
Nodes (6): NodeJsNamingConvention, splitWords(), toCamelCase(), toKebabCase(), toPascalCase(), toScreamingSnakeCase()

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (5): JavaNamingConvention, splitWords(), toCamelCase(), toPascalCase(), toScreamingSnakeCase()

### Community 10 - "Community 10"
Cohesion: 0.23
Nodes (5): PythonNamingConvention, splitWords(), toPascalCase(), toScreamingSnakeCase(), toSnakeCase()

### Community 11 - "Community 11"
Cohesion: 0.23
Nodes (3): createTargetPlatformRegistry(), SkillRegistry, TargetPlatformRegistry

### Community 12 - "Community 12"
Cohesion: 0.38
Nodes (1): JavaBuildSystem

### Community 13 - "Community 13"
Cohesion: 0.31
Nodes (4): findAllByType(), getAttributeArguments(), getAttributeNames(), walkTree()

### Community 14 - "Community 14"
Cohesion: 0.44
Nodes (2): JavaTypeMapper, toBoxedType()

### Community 15 - "Community 15"
Cohesion: 0.57
Nodes (7): extractAppSettings(), extractConnectionStrings(), extractHttpHandlers(), extractHttpModules(), normalizeArray(), parseWebConfig(), parseXml()

### Community 16 - "Community 16"
Cohesion: 0.32
Nodes (3): computeRelativePath(), NodeJsArchitectureAdapter, toKebabCase()

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (2): findCSharpWasm(), loadCSharpLanguage()

### Community 18 - "Community 18"
Cohesion: 0.48
Nodes (1): NodeJsTypeMapper

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (2): NodeJsDependencyManager, sortKeys()

### Community 20 - "Community 20"
Cohesion: 0.48
Nodes (1): PythonTypeMapper

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (1): JavaDependencyManager

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (1): PythonArchitectureAdapter

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (2): flattenConfig(), parseAppSettings()

## Knowledge Gaps
- **3 isolated node(s):** `JavaSpringPlatform`, `NodeJsExpressPlatform`, `PythonFastApiPlatform`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 4`** (23 nodes): `DddStrategy`, `.getRequiredScaffoldRoles()`, `.modulePath()`, `.resolveAuthPath()`, `.resolveCommandPath()`, `.resolveConfigPath()`, `.resolveControllerPath()`, `.resolveDiContainerPath()`, `.resolveDomainEventPath()`, `.resolveDomainServicePath()`, `.resolveDtoPath()`, `.resolveEntityPath()`, `.resolveEnumPath()`, `.resolveMapperPath()`, `.resolveMiddlewarePath()`, `.resolveQueryPath()`, `.resolveRepositoryImplPath()`, `.resolveRepositoryInterfacePath()`, `.resolveRoutePath()`, `.resolveServicePath()`, `.resolveUseCasePath()`, `.resolveValidationPath()`, `.resolveValueObjectPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 5`** (22 nodes): `CleanStrategy`, `.getRequiredScaffoldRoles()`, `.resolveAuthPath()`, `.resolveCommandPath()`, `.resolveConfigPath()`, `.resolveControllerPath()`, `.resolveDiContainerPath()`, `.resolveDomainEventPath()`, `.resolveDomainServicePath()`, `.resolveDtoPath()`, `.resolveEntityPath()`, `.resolveEnumPath()`, `.resolveMapperPath()`, `.resolveMiddlewarePath()`, `.resolveQueryPath()`, `.resolveRepositoryImplPath()`, `.resolveRepositoryInterfacePath()`, `.resolveRoutePath()`, `.resolveServicePath()`, `.resolveUseCasePath()`, `.resolveValidationPath()`, `.resolveValueObjectPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (22 nodes): `MvcStrategy`, `.getRequiredScaffoldRoles()`, `.resolveAuthPath()`, `.resolveCommandPath()`, `.resolveConfigPath()`, `.resolveControllerPath()`, `.resolveDiContainerPath()`, `.resolveDomainEventPath()`, `.resolveDomainServicePath()`, `.resolveDtoPath()`, `.resolveEntityPath()`, `.resolveEnumPath()`, `.resolveMapperPath()`, `.resolveMiddlewarePath()`, `.resolveQueryPath()`, `.resolveRepositoryImplPath()`, `.resolveRepositoryInterfacePath()`, `.resolveRoutePath()`, `.resolveServicePath()`, `.resolveUseCasePath()`, `.resolveValidationPath()`, `.resolveValueObjectPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (10 nodes): `JavaBuildSystem`, `.build()`, `.installDependencies()`, `.parseBuildErrors()`, `.parseTestFailures()`, `.runCommand()`, `.runCoverage()`, `.runLinter()`, `.runSecurityAudit()`, `.runTests()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (9 nodes): `JavaTypeMapper`, `.mapAsyncReturnType()`, `.mapCollectionType()`, `.mapDictionaryType()`, `.mapNullableType()`, `.mapToOrmType()`, `.mapType()`, `toBoxedType()`, `java-type-mapper.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (7 nodes): `findCSharpWasm()`, `getLanguage()`, `getParser()`, `initParser()`, `loadCSharpLanguage()`, `parseCSharpSource()`, `csharp-parser.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (7 nodes): `NodeJsTypeMapper`, `.mapAsyncReturnType()`, `.mapCollectionType()`, `.mapDictionaryType()`, `.mapNullableType()`, `.mapToOrmType()`, `.mapType()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (7 nodes): `NodeJsDependencyManager`, `.generateManifest()`, `.getBuildCommand()`, `.getInstallCommand()`, `.getTestCommand()`, `sortKeys()`, `nodejs-dependency-manager.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (7 nodes): `PythonTypeMapper`, `.mapAsyncReturnType()`, `.mapCollectionType()`, `.mapDictionaryType()`, `.mapNullableType()`, `.mapToOrmType()`, `.mapType()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (5 nodes): `JavaDependencyManager`, `.generateManifest()`, `.getBuildCommand()`, `.getInstallCommand()`, `.getTestCommand()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (5 nodes): `PythonArchitectureAdapter`, `.getEntryPointFiles()`, `.getScaffoldFiles()`, `.resolveFilePath()`, `.resolveImport()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (3 nodes): `flattenConfig()`, `parseAppSettings()`, `json-config-parser.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DddStrategy` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `CleanStrategy` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `MvcStrategy` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **What connects `JavaSpringPlatform`, `NodeJsExpressPlatform`, `PythonFastApiPlatform` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._