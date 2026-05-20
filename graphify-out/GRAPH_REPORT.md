# Graph Report - Migration  (2026-05-20)

## Corpus Check
- 44 files · ~23,749 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 268 nodes · 408 edges · 18 communities detected
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 18|Community 18]]

## God Nodes (most connected - your core abstractions)
1. `DddStrategy` - 23 edges
2. `CleanStrategy` - 22 edges
3. `MvcStrategy` - 22 edges
4. `NodeJsNamingConvention` - 11 edges
5. `NodeJsBuildSystem` - 10 edges
6. `detectPlatform()` - 9 edges
7. `NodeJsCodeGenerator` - 8 edges
8. `MigrationContext` - 7 edges
9. `TargetPlatformRegistry` - 7 edges
10. `NodeJsTypeMapper` - 7 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (3): NodeJsExpressPlatform, NodeJsOptionsSchema, NodeJsTestFramework

### Community 1 - "Community 1"
Cohesion: 0.15
Nodes (1): DddStrategy

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (1): CleanStrategy

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (1): MvcStrategy

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (4): ErrorDiagnoser, FixApplier, HealLoop, NodeJsBuildSystem

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (2): MigrationContext, WizardSession

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (6): NodeJsNamingConvention, splitWords(), toCamelCase(), toKebabCase(), toPascalCase(), toScreamingSnakeCase()

### Community 7 - "Community 7"
Cohesion: 0.21
Nodes (6): NodeJsCodeGenerator, splitWords(), toCamelCase(), toKebabCase(), toPascalCase(), SkillOrchestrator

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (3): createTargetPlatformRegistry(), SkillRegistry, TargetPlatformRegistry

### Community 9 - "Community 9"
Cohesion: 0.38
Nodes (9): createDefault(), detectConfigFormat(), detectDiContainer(), detectEfVersion(), detectPlatform(), extractTargetFramework(), findFiles(), isNet6OrLater() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.31
Nodes (4): findAllByType(), getAttributeArguments(), getAttributeNames(), walkTree()

### Community 11 - "Community 11"
Cohesion: 0.29
Nodes (2): CoverageAnalyzer, CoverageHealLoop

### Community 12 - "Community 12"
Cohesion: 0.57
Nodes (7): extractAppSettings(), extractConnectionStrings(), extractHttpHandlers(), extractHttpModules(), normalizeArray(), parseWebConfig(), parseXml()

### Community 13 - "Community 13"
Cohesion: 0.32
Nodes (3): computeRelativePath(), NodeJsArchitectureAdapter, toKebabCase()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (2): findCSharpWasm(), loadCSharpLanguage()

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (2): NodeJsDependencyManager, sortKeys()

### Community 16 - "Community 16"
Cohesion: 0.48
Nodes (1): NodeJsTypeMapper

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (2): flattenConfig(), parseAppSettings()

## Knowledge Gaps
- **1 isolated node(s):** `NodeJsExpressPlatform`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 1`** (23 nodes): `DddStrategy`, `.getRequiredScaffoldRoles()`, `.modulePath()`, `.resolveAuthPath()`, `.resolveCommandPath()`, `.resolveConfigPath()`, `.resolveControllerPath()`, `.resolveDiContainerPath()`, `.resolveDomainEventPath()`, `.resolveDomainServicePath()`, `.resolveDtoPath()`, `.resolveEntityPath()`, `.resolveEnumPath()`, `.resolveMapperPath()`, `.resolveMiddlewarePath()`, `.resolveQueryPath()`, `.resolveRepositoryImplPath()`, `.resolveRepositoryInterfacePath()`, `.resolveRoutePath()`, `.resolveServicePath()`, `.resolveUseCasePath()`, `.resolveValidationPath()`, `.resolveValueObjectPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 2`** (22 nodes): `CleanStrategy`, `.getRequiredScaffoldRoles()`, `.resolveAuthPath()`, `.resolveCommandPath()`, `.resolveConfigPath()`, `.resolveControllerPath()`, `.resolveDiContainerPath()`, `.resolveDomainEventPath()`, `.resolveDomainServicePath()`, `.resolveDtoPath()`, `.resolveEntityPath()`, `.resolveEnumPath()`, `.resolveMapperPath()`, `.resolveMiddlewarePath()`, `.resolveQueryPath()`, `.resolveRepositoryImplPath()`, `.resolveRepositoryInterfacePath()`, `.resolveRoutePath()`, `.resolveServicePath()`, `.resolveUseCasePath()`, `.resolveValidationPath()`, `.resolveValueObjectPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 3`** (22 nodes): `MvcStrategy`, `.getRequiredScaffoldRoles()`, `.resolveAuthPath()`, `.resolveCommandPath()`, `.resolveConfigPath()`, `.resolveControllerPath()`, `.resolveDiContainerPath()`, `.resolveDomainEventPath()`, `.resolveDomainServicePath()`, `.resolveDtoPath()`, `.resolveEntityPath()`, `.resolveEnumPath()`, `.resolveMapperPath()`, `.resolveMiddlewarePath()`, `.resolveQueryPath()`, `.resolveRepositoryImplPath()`, `.resolveRepositoryInterfacePath()`, `.resolveRoutePath()`, `.resolveServicePath()`, `.resolveUseCasePath()`, `.resolveValidationPath()`, `.resolveValueObjectPath()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 5`** (21 nodes): `main()`, `index.ts`, `tool-registry.ts`, `MigrationContext`, `.addArtifacts()`, `.addResult()`, `.allArtifacts()`, `.constructor()`, `.getArtifactsBySkill()`, `.getArtifactsOfKind()`, `registerAllTools()`, `WizardSession`, `.confirm()`, `.constructor()`, `.create()`, `.get()`, `.setChoice()`, `getStepDefinition()`, `wizard-session.ts`, `wizard-steps.ts`, `wizard-types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (8 nodes): `coverage-analyzer.ts`, `coverage-heal-loop.ts`, `CoverageAnalyzer`, `.findUncoveredCode()`, `.parseCoverageReport()`, `CoverageHealLoop`, `.constructor()`, `.run()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (7 nodes): `findCSharpWasm()`, `getLanguage()`, `getParser()`, `initParser()`, `loadCSharpLanguage()`, `parseCSharpSource()`, `csharp-parser.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (7 nodes): `NodeJsDependencyManager`, `.generateManifest()`, `.getBuildCommand()`, `.getInstallCommand()`, `.getTestCommand()`, `sortKeys()`, `nodejs-dependency-manager.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (7 nodes): `NodeJsTypeMapper`, `.mapAsyncReturnType()`, `.mapCollectionType()`, `.mapDictionaryType()`, `.mapNullableType()`, `.mapToOrmType()`, `.mapType()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (3 nodes): `flattenConfig()`, `parseAppSettings()`, `json-config-parser.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DddStrategy` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `CleanStrategy` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Why does `MvcStrategy` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **What connects `NodeJsExpressPlatform` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._