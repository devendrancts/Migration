# Graph Report - Migration  (2026-05-21)

## Corpus Check
- 67 files · ~38,498 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 547 nodes · 1037 edges · 25 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 24|Community 24]]

## God Nodes (most connected - your core abstractions)
1. `NodeJsCodeGenerator` - 34 edges
2. `PythonCodeGenerator` - 33 edges
3. `toSnakeCase()` - 24 edges
4. `DddStrategy` - 23 edges
5. `CleanStrategy` - 22 edges
6. `MvcStrategy` - 22 edges
7. `toKebabCase()` - 19 edges
8. `toPascalCase()` - 14 edges
9. `toCamelCase()` - 13 edges
10. `buildProjectGraph()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `buildProjectGraph()` --calls--> `createEmptyGraph()`  [INFERRED]
  src\analyzer\graph-builder.ts → src\analyzer\project-graph.ts
- `buildProjectGraph()` --calls--> `initParser()`  [INFERRED]
  src\analyzer\graph-builder.ts → src\parser\csharp-parser.ts
- `buildProjectGraph()` --calls--> `parseCSharpSource()`  [INFERRED]
  src\analyzer\graph-builder.ts → src\parser\csharp-parser.ts
- `buildProjectGraph()` --calls--> `runUnifiedWizard()`  [INFERRED]
  src\analyzer\graph-builder.ts → src\wizard\unified-wizard.ts
- `parseTypeNode()` --calls--> `getClassBaseTypes()`  [INFERRED]
  src\analyzer\graph-builder.ts → src\parser\ast-utils.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (13): JavaSpringPlatform, NodeJsExpressPlatform, PythonFastApiPlatform, JavaArchitectureAdapter, toPascalCase(), JavaCodeGenerator, depToXml(), resolveGroupArtifact() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (33): findAllByType(), findFirstByType(), getAttributeArguments(), getAttributeNames(), getClassBaseTypes(), getModifiers(), walkTree(), findCSharpWasm() (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (12): buildZodType(), mapTypeRef(), mapZodBaseType(), NodeJsCodeGenerator, parseCronToMs(), renderMethod(), renderPropertyAsReadonly(), splitWords() (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (12): buildFieldArgs(), buildParamDefault(), buildValidatorBody(), formatPythonDefault(), mapPythonType(), mapPythonTypeByName(), mapSqlAlchemyColumn(), PythonCodeGenerator (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (7): CoverageAnalyzer, CoverageHealLoop, ErrorDiagnoser, FixApplier, HealLoop, NodeJsBuildSystem, PythonBuildSystem

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (20): findImplementors(), findSubclasses(), generateGraphSummary(), getBoundedContextCandidates(), getCallers(), getCallTargets(), getDependencies(), getDependents() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (1): DddStrategy

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (16): createDefault(), detectConfigFormat(), detectDiContainer(), detectEfVersion(), detectPlatform(), extractTargetFramework(), findFiles(), isNet6OrLater() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (1): CleanStrategy

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (1): MvcStrategy

### Community 10 - "Community 10"
Cohesion: 0.21
Nodes (6): NodeJsNamingConvention, splitWords(), toCamelCase(), toKebabCase(), toPascalCase(), toScreamingSnakeCase()

### Community 11 - "Community 11"
Cohesion: 0.21
Nodes (5): JavaNamingConvention, splitWords(), toCamelCase(), toPascalCase(), toScreamingSnakeCase()

### Community 12 - "Community 12"
Cohesion: 0.23
Nodes (9): generateControllerUnitTest(), generateModelUnitTest(), generateRepositoryUnitTest(), generateServiceUnitTest(), NodeJsTestFramework, normalizePath(), splitWords(), toCamelCase() (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (5): PythonNamingConvention, splitWords(), toPascalCase(), toScreamingSnakeCase(), toSnakeCase()

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (9): generateControllerUnitTest(), generateModelUnitTest(), generateRepositoryUnitTest(), generateServiceUnitTest(), getDummyValue(), PythonTestFramework, stripRepositorySuffix(), stripServiceSuffix() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (2): MigrationContext, SkillOrchestrator

### Community 16 - "Community 16"
Cohesion: 0.38
Nodes (1): JavaBuildSystem

### Community 17 - "Community 17"
Cohesion: 0.27
Nodes (4): buildScaffoldFiles(), collectDirs(), PythonArchitectureAdapter, toSnakeCase()

### Community 18 - "Community 18"
Cohesion: 0.44
Nodes (2): JavaTypeMapper, toBoxedType()

### Community 19 - "Community 19"
Cohesion: 0.31
Nodes (4): computeRelativePath(), gitkeep(), NodeJsArchitectureAdapter, toKebabCase()

### Community 20 - "Community 20"
Cohesion: 0.48
Nodes (1): NodeJsTypeMapper

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (2): NodeJsDependencyManager, sortKeys()

### Community 22 - "Community 22"
Cohesion: 0.48
Nodes (1): PythonTypeMapper

### Community 23 - "Community 23"
Cohesion: 0.4
Nodes (1): JavaDependencyManager

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): flattenConfig(), parseAppSettings()

## Knowledge Gaps
- **3 isolated node(s):** `JavaSpringPlatform`, `NodeJsExpressPlatform`, `PythonFastApiPlatform`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 6`** (23 nodes): `DddStrategy`, `.getRequiredScaffoldRoles()`, `.modulePath()`, `.resolveAuthPath()`, `.resolveCommandPath()`, `.resolveConfigPath()`, `.resolveControllerPath()`, `.resolveDiContainerPath()`, `.resolveDomainEventPath()`, `.resolveDomainServicePath()`, `.resolveDtoPath()`, `.resolveEntityPath()`, `.resolveEnumPath()`, `.resolveMapperPath()`, `.resolveMiddlewarePath()`, `.resolveQueryPath()`, `.resolveRepositoryImplPath()`, `.resolveRepositoryInterfacePath()`, `.resolveRoutePath()`, `.resolveServicePath()`, `.resolveUseCasePath()`, `.resolveValidationPath()`, `.resolveValueObjectPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 8`** (22 nodes): `CleanStrategy`, `.getRequiredScaffoldRoles()`, `.resolveAuthPath()`, `.resolveCommandPath()`, `.resolveConfigPath()`, `.resolveControllerPath()`, `.resolveDiContainerPath()`, `.resolveDomainEventPath()`, `.resolveDomainServicePath()`, `.resolveDtoPath()`, `.resolveEntityPath()`, `.resolveEnumPath()`, `.resolveMapperPath()`, `.resolveMiddlewarePath()`, `.resolveQueryPath()`, `.resolveRepositoryImplPath()`, `.resolveRepositoryInterfacePath()`, `.resolveRoutePath()`, `.resolveServicePath()`, `.resolveUseCasePath()`, `.resolveValidationPath()`, `.resolveValueObjectPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (22 nodes): `MvcStrategy`, `.getRequiredScaffoldRoles()`, `.resolveAuthPath()`, `.resolveCommandPath()`, `.resolveConfigPath()`, `.resolveControllerPath()`, `.resolveDiContainerPath()`, `.resolveDomainEventPath()`, `.resolveDomainServicePath()`, `.resolveDtoPath()`, `.resolveEntityPath()`, `.resolveEnumPath()`, `.resolveMapperPath()`, `.resolveMiddlewarePath()`, `.resolveQueryPath()`, `.resolveRepositoryImplPath()`, `.resolveRepositoryInterfacePath()`, `.resolveRoutePath()`, `.resolveServicePath()`, `.resolveUseCasePath()`, `.resolveValidationPath()`, `.resolveValueObjectPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (14 nodes): `.generateEntryPoint()`, `.generateScaffold()`, `.generateEntryPoint()`, `.generateProjectConfig()`, `.generateScaffold()`, `MigrationContext`, `.addArtifacts()`, `.addResult()`, `.allArtifacts()`, `.constructor()`, `.getArtifactsOfKind()`, `SkillOrchestrator`, `.constructor()`, `.execute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (10 nodes): `JavaBuildSystem`, `.build()`, `.installDependencies()`, `.parseBuildErrors()`, `.parseTestFailures()`, `.runCommand()`, `.runCoverage()`, `.runLinter()`, `.runSecurityAudit()`, `.runTests()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (9 nodes): `JavaTypeMapper`, `.mapAsyncReturnType()`, `.mapCollectionType()`, `.mapDictionaryType()`, `.mapNullableType()`, `.mapToOrmType()`, `.mapType()`, `toBoxedType()`, `java-type-mapper.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (7 nodes): `NodeJsTypeMapper`, `.mapAsyncReturnType()`, `.mapCollectionType()`, `.mapDictionaryType()`, `.mapNullableType()`, `.mapToOrmType()`, `.mapType()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (7 nodes): `NodeJsDependencyManager`, `.generateManifest()`, `.getBuildCommand()`, `.getInstallCommand()`, `.getTestCommand()`, `sortKeys()`, `nodejs-dependency-manager.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (7 nodes): `PythonTypeMapper`, `.mapAsyncReturnType()`, `.mapCollectionType()`, `.mapDictionaryType()`, `.mapNullableType()`, `.mapToOrmType()`, `.mapType()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (5 nodes): `JavaDependencyManager`, `.generateManifest()`, `.getBuildCommand()`, `.getInstallCommand()`, `.getTestCommand()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `flattenConfig()`, `parseAppSettings()`, `json-config-parser.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DddStrategy` connect `Community 6` to `Community 0`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `CleanStrategy` connect `Community 8` to `Community 0`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `MvcStrategy` connect `Community 9` to `Community 0`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **What connects `JavaSpringPlatform`, `NodeJsExpressPlatform`, `PythonFastApiPlatform` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._