export type SourcePlatform =
  | 'framework-4x'
  | 'core-2x'
  | 'core-3x'
  | 'net5'
  | 'net6'
  | 'net7'
  | 'net8'
  | 'net9';

export interface SourcePlatformInfo {
  platform: SourcePlatform;
  targetFramework: string;
  hasMinimalApis: boolean;
  hasMinimalHosting: boolean;
  hasStartupCs: boolean;
  hasGlobalAsax: boolean;
  efVersion: 'ef6' | 'efcore' | 'none';
  diContainer: 'builtin' | 'unity' | 'autofac' | 'ninject' | 'none';
  configFormat: 'webconfig' | 'appsettings' | 'both';
}

export interface CSharpProjectInfo {
  name: string;
  rootPath: string;
  solutionPath?: string;
  projects: CSharpProject[];
  sourcePlatform: SourcePlatformInfo;
}

export interface CSharpProject {
  name: string;
  path: string;
  targetFramework: string;
  projectType: 'web' | 'library' | 'console' | 'test' | 'unknown';
  packages: NuGetPackageRef[];
  projectReferences: string[];
  sourceFiles: string[];
  configFiles: string[];
}

export interface NuGetPackageRef {
  name: string;
  version: string;
}

export interface CSharpFileInfo {
  filePath: string;
  usings: string[];
  namespace: string;
  classes: CSharpClassInfo[];
}

export interface CSharpClassInfo {
  name: string;
  namespace: string;
  kind: 'class' | 'interface' | 'enum' | 'struct' | 'record';
  attributes: CSharpAttributeInfo[];
  baseClass: string | null;
  interfaces: string[];
  properties: CSharpPropertyInfo[];
  methods: CSharpMethodInfo[];
  constructorParams: CSharpParameterInfo[];
  genericParams: string[];
  accessModifier: 'public' | 'internal' | 'private' | 'protected';
  isAbstract: boolean;
  isStatic: boolean;
  isPartial: boolean;
  filePath: string;
  startLine: number;
  endLine: number;
}

export type ClassClassification =
  | 'controller'
  | 'api-controller'
  | 'minimal-api'
  | 'model'
  | 'entity'
  | 'dto'
  | 'service'
  | 'repository'
  | 'dbcontext'
  | 'filter'
  | 'middleware'
  | 'startup'
  | 'hub'
  | 'background-job'
  | 'health-check'
  | 'unknown';

export interface CSharpAttributeInfo {
  name: string;
  arguments: CSharpAttributeArgument[];
}

export interface CSharpAttributeArgument {
  name: string | null;
  value: string;
}

export interface CSharpParameterInfo {
  name: string;
  type: string;
  attributes: CSharpAttributeInfo[];
  defaultValue: string | null;
  isOptional: boolean;
}

export interface CSharpPropertyInfo {
  name: string;
  type: string;
  attributes: CSharpAttributeInfo[];
  hasGetter: boolean;
  hasSetter: boolean;
  isVirtual: boolean;
  isStatic: boolean;
  isNullable: boolean;
  defaultValue: string | null;
}

export interface CSharpMethodInfo {
  name: string;
  returnType: string;
  parameters: CSharpParameterInfo[];
  attributes: CSharpAttributeInfo[];
  accessModifier: 'public' | 'private' | 'protected' | 'internal';
  isStatic: boolean;
  isAsync: boolean;
  isVirtual: boolean;
  isOverride: boolean;
  bodyText: string | null;
  startLine: number;
  endLine: number;
}
