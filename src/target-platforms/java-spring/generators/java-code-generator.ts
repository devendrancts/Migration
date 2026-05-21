import type { TargetCodeGenerator, GenerationContext } from '../../target-platform.interface.js';
import type {
  IRArtifact,
  IRTypeRef,
  IRProperty,
  IRMethod,
  IRParameter,
  IRDependency,
  IRController,
  IRModel,
  IRService,
  IRRepository,
  IRMiddleware,
  IRConfig,
  IRAuth,
  IRRoute,
  IRValidationSchema,
  IRDiRegistration,
  IRDomainEvent,
  IRValueObject,
  IREnum,
  IRMapper,
  IRUseCaseOrHandler,
  IRSignalRHub,
  IRBackgroundJob,
  IRCacheUsage,
  IRLoggingConfig,
  IRHealthCheck,
  IRCorsConfig,
  IRApiVersioning,
  IRSwaggerConfig,
  IRRateLimiting,
  IRStoredProcedure,
  IRDbMigration,
  IRNuGetMapping,
  IRRazorView,
} from '../../../ir/types.js';
import type { GeneratedFile } from '../../../types/common.js';

const BASE_PACKAGE = 'com.app';
const SRC_ROOT = `src/main/java/com/app`;
const RES_ROOT = `src/main/resources`;

// ── Helper Functions ──────────────────────────────────────────────────────────

function splitWords(name: string): string[] {
  // Handle PascalCase, camelCase, snake_case, kebab-case
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter((w) => w.length > 0);
}

function toPascalCase(name: string): string {
  return splitWords(name)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(name: string): string {
  const words = splitWords(name);
  if (words.length === 0) return name;
  return (
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('')
  );
}

function toSnakeCase(name: string): string {
  return splitWords(name)
    .map((w) => w.toLowerCase())
    .join('_');
}

function toScreamingSnakeCase(name: string): string {
  return splitWords(name)
    .map((w) => w.toUpperCase())
    .join('_');
}

function toBoxedType(type: string): string {
  const map: Record<string, string> = {
    int: 'Integer',
    long: 'Long',
    double: 'Double',
    float: 'Float',
    boolean: 'Boolean',
    byte: 'Byte',
    short: 'Short',
    char: 'Character',
  };
  return map[type] ?? type;
}

function mapJavaType(typeRef: IRTypeRef): string {
  const primitiveMap: Record<string, string> = {
    string: 'String',
    String: 'String',
    int: 'int',
    Int32: 'int',
    long: 'long',
    Int64: 'long',
    double: 'double',
    Double: 'double',
    float: 'float',
    Single: 'float',
    decimal: 'BigDecimal',
    Decimal: 'BigDecimal',
    bool: 'boolean',
    Boolean: 'boolean',
    DateTime: 'LocalDateTime',
    DateTimeOffset: 'OffsetDateTime',
    DateOnly: 'LocalDate',
    TimeOnly: 'LocalTime',
    TimeSpan: 'Duration',
    Guid: 'UUID',
    byte: 'byte',
    Byte: 'byte',
    short: 'short',
    Int16: 'short',
    char: 'char',
    Char: 'char',
    object: 'Object',
    Object: 'Object',
    void: 'void',
    Void: 'void',
    dynamic: 'Object',
    Task: 'CompletableFuture',
  };

  let baseType = primitiveMap[typeRef.name] ?? toPascalCase(typeRef.name);

  // Handle Task<T> / ValueTask<T>
  if ((typeRef.name === 'Task' || typeRef.name === 'ValueTask') && typeRef.genericArgs?.length) {
    baseType = mapJavaType(typeRef.genericArgs[0]);
  }

  // Handle generics (List<T>, Dictionary<K,V>, etc.)
  if (
    typeRef.genericArgs?.length &&
    typeRef.name !== 'Task' &&
    typeRef.name !== 'ValueTask'
  ) {
    const genericName = typeRef.name;
    if (genericName === 'IEnumerable' || genericName === 'ICollection' || genericName === 'IList' || genericName === 'List') {
      return `List<${mapJavaType(typeRef.genericArgs[0])}>`;
    }
    if (genericName === 'IReadOnlyList' || genericName === 'IReadOnlyCollection') {
      return `List<${mapJavaType(typeRef.genericArgs[0])}>`;
    }
    if (genericName === 'HashSet' || genericName === 'ISet') {
      return `Set<${mapJavaType(typeRef.genericArgs[0])}>`;
    }
    if (genericName === 'Dictionary' || genericName === 'IDictionary') {
      return `Map<${mapJavaType(typeRef.genericArgs[0])}, ${mapJavaType(typeRef.genericArgs[1])}>`;
    }
    if (genericName === 'IQueryable') {
      return `List<${mapJavaType(typeRef.genericArgs[0])}>`;
    }
    const mappedArgs = typeRef.genericArgs.map(mapJavaType).join(', ');
    return `${baseType}<${mappedArgs}>`;
  }

  if (typeRef.isArray) {
    return `List<${toBoxedType(baseType)}>`;
  }

  // Nullable value types → boxed
  if (typeRef.isNullable || typeRef.isOptional) {
    return toBoxedType(baseType);
  }

  return baseType;
}

function mapJpaColumnType(typeName: string): string {
  const map: Record<string, string> = {
    string: 'VARCHAR(255)',
    String: 'VARCHAR(255)',
    int: 'INTEGER',
    Int32: 'INTEGER',
    long: 'BIGINT',
    Int64: 'BIGINT',
    decimal: 'DECIMAL(19,2)',
    Decimal: 'DECIMAL(19,2)',
    bool: 'BOOLEAN',
    Boolean: 'BOOLEAN',
    DateTime: 'TIMESTAMP',
    DateTimeOffset: 'TIMESTAMP WITH TIME ZONE',
    DateOnly: 'DATE',
    Guid: 'UUID',
    byte: 'TINYINT',
    short: 'SMALLINT',
    Int16: 'SMALLINT',
    double: 'DOUBLE PRECISION',
    float: 'REAL',
  };
  return map[typeName] ?? 'VARCHAR(255)';
}

function mapHttpMethod(method: string): string {
  const map: Record<string, string> = {
    GET: 'GetMapping',
    POST: 'PostMapping',
    PUT: 'PutMapping',
    DELETE: 'DeleteMapping',
    PATCH: 'PatchMapping',
  };
  return map[method.toUpperCase()] ?? 'GetMapping';
}

function mapParamAnnotation(source: IRParameter['source']): string {
  const map: Record<IRParameter['source'], string> = {
    path: '@PathVariable',
    query: '@RequestParam',
    body: '@RequestBody',
    header: '@RequestHeader',
    cookie: '@CookieValue',
    form: '@RequestParam',
    injected: '',
  };
  return map[source];
}

function renderParameters(params: IRParameter[], skipInjected = true): string {
  return params
    .filter((p) => !skipInjected || p.source !== 'injected')
    .map((p) => {
      const annotation = mapParamAnnotation(p.source);
      const javaType = mapJavaType(p.type);
      const paramName = toCamelCase(p.name);
      const optional =
        p.source === 'query' && (p.type.isOptional || p.defaultValue !== undefined)
          ? '(required = false)'
          : '';
      const annotationStr = annotation ? `${annotation}${optional} ` : '';
      return `${annotationStr}${javaType} ${paramName}`;
    })
    .join(', ');
}

function renderMethodParams(params: IRParameter[]): string {
  return params
    .map((p) => `${mapJavaType(p.type)} ${toCamelCase(p.name)}`)
    .join(', ');
}

function renderDependencyFields(deps: IRDependency[]): string {
  return deps
    .map((d) => {
      const type = toPascalCase(d.interfaceName.replace(/^I/, ''));
      const fieldName = toCamelCase(
        d.interfaceName.startsWith('I') ? d.interfaceName.slice(1) : d.interfaceName,
      );
      return `    private final ${type} ${fieldName};`;
    })
    .join('\n');
}

function depFieldName(dep: IRDependency): string {
  const name = dep.interfaceName.startsWith('I') ? dep.interfaceName.slice(1) : dep.interfaceName;
  return toCamelCase(name);
}

function depTypeName(dep: IRDependency): string {
  return toPascalCase(dep.interfaceName.replace(/^I/, ''));
}

// ── Controller ────────────────────────────────────────────────────────────────

function generateController(artifact: IRController): GeneratedFile[] {
  const className = `${toPascalCase(artifact.name)}Controller`;
  const imports = new Set<string>([
    'org.springframework.web.bind.annotation.*',
    'org.springframework.http.ResponseEntity',
    'lombok.RequiredArgsConstructor',
  ]);

  if (artifact.actions.some((a) => a.authRequired)) {
    imports.add('org.springframework.security.access.prepost.PreAuthorize');
  }
  if (artifact.actions.some((a) => a.parameters.some((p) => p.validationRules.length > 0))) {
    imports.add('jakarta.validation.Valid');
  }

  const methodsCode = artifact.actions.map((action) => {
    const mapping = mapHttpMethod(action.httpMethod);
    const pathStr = action.path ? `("${action.path}")` : '';
    const returnType = mapJavaType(action.returnType);
    const params = renderParameters(action.parameters);
    const methodName = toCamelCase(action.name);
    const authAnnotation =
      action.authRequired && action.authRoles?.length
        ? `    @PreAuthorize("hasAnyRole(${action.authRoles.map((r) => `'${r}'`).join(', ')})")\n`
        : action.authRequired
          ? `    @PreAuthorize("isAuthenticated()")\n`
          : '';
    const responseType =
      returnType === 'void' ? 'ResponseEntity<Void>' : `ResponseEntity<${returnType}>`;

    return `${authAnnotation}    @${mapping}${pathStr}
    public ${responseType} ${methodName}(${params}) {
        throw new UnsupportedOperationException("${methodName} not yet implemented");
    }`;
  });

  const depFields = renderDependencyFields(artifact.dependencies);

  const content = `package ${BASE_PACKAGE}.controller;

${[...imports]
  .map((i) => `import ${i};`)
  .join('\n')}

@RestController
@RequestMapping("${artifact.basePath}")
@RequiredArgsConstructor
public class ${className} {
${depFields ? depFields + '\n' : ''}
${methodsCode.join('\n\n')}
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/controller/${className}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Model ─────────────────────────────────────────────────────────────────────

function renderPropertyField(prop: IRProperty, forRecord = false): string {
  const javaType = mapJavaType(prop.type);
  const fieldName = toCamelCase(prop.name);
  if (forRecord) {
    return `${javaType} ${fieldName}`;
  }
  return `    private ${javaType} ${fieldName};`;
}

function renderJpaProperty(prop: IRProperty): string {
  const javaType = mapJavaType(prop.type);
  const fieldName = toCamelCase(prop.name);
  const colName = toSnakeCase(prop.name);
  const lines: string[] = [];

  const isId =
    prop.name.toLowerCase() === 'id' ||
    prop.annotations.some((a) => a.name === 'Key' || a.name === 'PrimaryKey');
  if (isId) {
    lines.push('    @Id');
    lines.push('    @GeneratedValue(strategy = GenerationType.IDENTITY)');
  } else {
    lines.push(`    @Column(name = "${colName}")`);
  }
  lines.push(`    private ${javaType} ${fieldName};`);
  return lines.join('\n');
}

function generateModel(artifact: IRModel): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const className = toPascalCase(artifact.name);

  if (artifact.role === 'entity' || artifact.role === 'aggregate-root') {
    const tableName = artifact.tableMapping?.tableName ?? toSnakeCase(artifact.name);

    const propertyFields = artifact.properties.map(renderJpaProperty).join('\n\n');

    const relationshipFields = artifact.relationships
      .map((rel) => {
        const targetClass = toPascalCase(rel.targetEntity);
        const fieldName = toCamelCase(rel.navigationProperty);
        const cascadeStr = rel.cascadeDelete ? ', cascade = CascadeType.ALL' : '';
        if (rel.type === 'one-to-many') {
          return `    @OneToMany(mappedBy = "${toCamelCase(artifact.name)}"${cascadeStr})\n    private List<${targetClass}> ${fieldName};`;
        }
        if (rel.type === 'many-to-one') {
          const fkName = rel.foreignKey ? toSnakeCase(rel.foreignKey) : `${toSnakeCase(rel.targetEntity)}_id`;
          return `    @ManyToOne(fetch = FetchType.LAZY${cascadeStr})\n    @JoinColumn(name = "${fkName}"${rel.isRequired ? ', nullable = false' : ''})\n    private ${targetClass} ${fieldName};`;
        }
        if (rel.type === 'one-to-one') {
          return `    @OneToOne(fetch = FetchType.LAZY${cascadeStr})\n    @JoinColumn(name = "${toSnakeCase(rel.navigationProperty)}_id")\n    private ${targetClass} ${fieldName};`;
        }
        if (rel.type === 'many-to-many') {
          return `    @ManyToMany\n    @JoinTable(name = "${toSnakeCase(artifact.name)}_${toSnakeCase(rel.targetEntity)}")\n    private List<${targetClass}> ${fieldName};`;
        }
        return '';
      })
      .filter((s) => s.length > 0)
      .join('\n\n');

    const hasRelationships = artifact.relationships.length > 0;
    const importList = [
      'jakarta.persistence.*',
      'lombok.*',
      'java.time.LocalDateTime',
      'java.util.UUID',
    ];
    if (hasRelationships) importList.push('java.util.List');

    const entityContent = `package ${BASE_PACKAGE}.model;

${importList.map((i) => `import ${i};`).join('\n')}

@Entity
@Table(name = "${tableName}")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ${className} {

${propertyFields}
${relationshipFields ? '\n' + relationshipFields : ''}
}
`;

    files.push({
      relativePath: `${SRC_ROOT}/model/${className}.java`,
      content: entityContent,
      overwrite: true,
    });

    // DTO record
    const dtoFields = artifact.properties
      .map((p) => renderPropertyField(p, true))
      .join(',\n    ');
    const dtoContent = `package ${BASE_PACKAGE}.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import java.math.BigDecimal;
import java.util.List;

public record ${className}Dto(
    ${dtoFields}
) {}
`;

    files.push({
      relativePath: `${SRC_ROOT}/dto/${className}Dto.java`,
      content: dtoContent,
      overwrite: true,
    });
  } else {
    // dto / view-model → plain record
    const recordFields = artifact.properties
      .map((p) => renderPropertyField(p, true))
      .join(',\n    ');

    const dtoContent = `package ${BASE_PACKAGE}.dto;

import java.time.LocalDateTime;
import java.util.UUID;
import java.math.BigDecimal;
import java.util.List;

public record ${className}(
    ${recordFields}
) {}
`;

    files.push({
      relativePath: `${SRC_ROOT}/dto/${className}.java`,
      content: dtoContent,
      overwrite: true,
    });
  }

  return files;
}

// ── Service ───────────────────────────────────────────────────────────────────

function renderInterfaceMethod(method: IRMethod): string {
  const returnType = mapJavaType(method.returnType);
  const params = renderMethodParams(method.parameters);
  return `    ${returnType} ${toCamelCase(method.name)}(${params});`;
}

function renderImplMethod(method: IRMethod): string {
  const returnType = mapJavaType(method.returnType);
  const params = renderMethodParams(method.parameters);
  const methodName = toCamelCase(method.name);
  return `    @Override
    public ${returnType} ${methodName}(${params}) {
        throw new UnsupportedOperationException("${methodName} not yet implemented");
    }`;
}

function generateService(artifact: IRService): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const className = toPascalCase(artifact.name);
  const interfaceName = artifact.interfaceName
    ? toPascalCase(artifact.interfaceName.replace(/^I/, ''))
    : `${className}Service`;
  const interfaceSimpleName = artifact.interfaceName
    ? toPascalCase(artifact.interfaceName)
    : `I${interfaceName}`;

  const methodSignatures = artifact.methods.map(renderInterfaceMethod).join('\n\n');

  const interfaceContent = `package ${BASE_PACKAGE}.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.math.BigDecimal;

public interface ${interfaceSimpleName} {

${methodSignatures}
}
`;

  files.push({
    relativePath: `${SRC_ROOT}/service/${interfaceSimpleName}.java`,
    content: interfaceContent,
    overwrite: true,
  });

  const depFields = artifact.dependencies
    .map((d) => `    private final ${depTypeName(d)} ${depFieldName(d)};`)
    .join('\n');

  const implMethods = artifact.methods.map(renderImplMethod).join('\n\n');

  const implContent = `package ${BASE_PACKAGE}.service.impl;

import ${BASE_PACKAGE}.service.${interfaceSimpleName};
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ${className}Impl implements ${interfaceSimpleName} {

${depFields ? depFields + '\n' : ''}
${implMethods}
}
`;

  files.push({
    relativePath: `${SRC_ROOT}/service/impl/${className}Impl.java`,
    content: implContent,
    overwrite: true,
  });

  return files;
}

// ── Repository ────────────────────────────────────────────────────────────────

function generateRepository(artifact: IRRepository): GeneratedFile[] {
  const repoName = `${toPascalCase(artifact.entity)}Repository`;
  const entityClass = toPascalCase(artifact.entity);

  const customMethods = artifact.methods
    .filter((m) => {
      const lower = m.name.toLowerCase();
      return (
        !['save', 'findbyid', 'findall', 'deletebyid', 'delete', 'existsbyid', 'count'].includes(
          lower,
        )
      );
    })
    .map((m) => {
      const returnType = mapJavaType(m.returnType);
      const params = renderMethodParams(m.parameters);
      const methodName = toCamelCase(m.name);
      if (m.body?.rawSourceLines.some((l) => l.includes('SELECT') || l.includes('select'))) {
        const rawSql = m.body.rawSourceLines.join(' ');
        return `    @Query(value = "${rawSql.replace(/"/g, '\\"')}", nativeQuery = true)
    ${returnType} ${methodName}(${params});`;
      }
      return `    ${returnType} ${methodName}(${params});`;
    })
    .join('\n\n');

  const content = `package ${BASE_PACKAGE}.repository;

import ${BASE_PACKAGE}.model.${entityClass};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ${repoName} extends JpaRepository<${entityClass}, Long> {

${customMethods}
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/repository/${repoName}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Middleware ────────────────────────────────────────────────────────────────

function generateMiddleware(artifact: IRMiddleware): GeneratedFile[] {
  const className = `${toPascalCase(artifact.name)}Filter`;

  const isExceptionFilter = artifact.type === 'exception-filter';
  const isAuthFilter = artifact.type === 'authorization-filter';

  let filterBody = `        // Pre-processing for ${artifact.name}
        filterChain.doFilter(request, response);
        // Post-processing for ${artifact.name}`;

  if (isExceptionFilter) {
    filterBody = `        try {
            filterChain.doFilter(request, response);
        } catch (Exception ex) {
            log.error("Unhandled exception: {}", ex.getMessage(), ex);
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().write("Internal Server Error");
        }`;
  } else if (isAuthFilter) {
    filterBody = `        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        // TODO: Validate token and set SecurityContext
        filterChain.doFilter(request, response);`;
  }

  const orderAnnotation =
    artifact.order !== 0 ? `@Order(${artifact.order})\n` : '';

  const content = `package ${BASE_PACKAGE}.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
${orderAnnotation}public class ${className} extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, java.io.IOException {
        ${filterBody}
    }
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/filter/${className}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Config ────────────────────────────────────────────────────────────────────

function generateConfig(artifact: IRConfig): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Group entries by section
  const sections = new Map<string, { key: string; value: string; isSecret: boolean }[]>();
  for (const entry of artifact.entries) {
    const section = entry.section ?? 'app';
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push(entry);
  }

  // ConfigurationProperties record
  const appEntries = sections.get('app') ?? artifact.entries.slice(0, 10);
  const recordFields = appEntries
    .map((e) => {
      const fieldName = toCamelCase(e.key.replace(/[:.]/g, '_'));
      return `    String ${fieldName}`;
    })
    .join(',\n');

  const configContent = `package ${BASE_PACKAGE}.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppConfig(
${recordFields}
) {}
`;

  files.push({
    relativePath: `${SRC_ROOT}/config/AppConfig.java`,
    content: configContent,
    overwrite: true,
  });

  // application.yml extra entries
  const ymlLines: string[] = ['# Application configuration (merged from .NET config)'];
  for (const [section, entries] of sections.entries()) {
    ymlLines.push(`${section}:`);
    for (const e of entries) {
      if (e.isSecret) {
        ymlLines.push(`  ${toCamelCase(e.key)}: \${${e.key.toUpperCase().replace(/[.:]/g, '_')}:${e.value}}`);
      } else {
        ymlLines.push(`  ${toCamelCase(e.key)}: ${e.value}`);
      }
    }
  }

  for (const cs of artifact.connectionStrings) {
    ymlLines.push(`# Connection string: ${cs.name}`);
    ymlLines.push(`# Provider: ${cs.provider}`);
    ymlLines.push(`# ${cs.connectionString}`);
  }

  files.push({
    relativePath: `${RES_ROOT}/application-extra.yml`,
    content: ymlLines.join('\n') + '\n',
    overwrite: true,
  });

  return files;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function generateAuth(artifact: IRAuth): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const hasJwt = artifact.schemes.some((s) => s.type === 'jwt');
  const hasOAuth2 = artifact.schemes.some((s) => s.type === 'oauth2');

  const policyMatchers = artifact.policies
    .map((p) => {
      const roles = p.roles?.map((r) => `"${r}"`).join(', ') ?? '"USER"';
      return `                .requestMatchers("/${toCamelCase(p.name)}/**").hasAnyRole(${roles})`;
    })
    .join('\n');

  const jwtImports = hasJwt
    ? `import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
`
    : '';

  const jwtConfig = hasJwt
    ? `            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
            )`
    : '';

  const oauth2Config = hasOAuth2
    ? `            .oauth2Login(oauth2 -> oauth2.defaultSuccessUrl("/", true))`
    : '';

  const jwtDecoderBean = hasJwt
    ? `
    @Bean
    public JwtDecoder jwtDecoder() {
        // Configure with your issuer URI or public key
        // Example: return NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
        throw new UnsupportedOperationException("Configure JwtDecoder with issuer URI");
    }
`
    : '';

  const securityContent = `package ${BASE_PACKAGE}.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
${jwtImports}
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
${policyMatchers ? policyMatchers + '\n' : ''}                .anyRequest().authenticated()
            )${jwtConfig ? '\n            ' + jwtConfig : ''}${oauth2Config ? '\n            ' + oauth2Config : ''};
        return http.build();
    }
${jwtDecoderBean}}
`;

  files.push({
    relativePath: `${SRC_ROOT}/config/SecurityConfig.java`,
    content: securityContent,
    overwrite: true,
  });

  if (hasJwt) {
    const jwtServiceContent = `package ${BASE_PACKAGE}.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    @Value("\${app.jwt.secret:change-me-in-production-must-be-at-least-256-bits}")
    private String secret;

    @Value("\${app.jwt.expiration-ms:3600000}")
    private long expirationMs;

    private Key signingKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(String subject) {
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(signingKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractSubject(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            extractSubject(token);
            return true;
        } catch (JwtException e) {
            return false;
        }
    }
}
`;

    files.push({
      relativePath: `${SRC_ROOT}/security/JwtService.java`,
      content: jwtServiceContent,
      overwrite: true,
    });
  }

  return files;
}

// ── Route ─────────────────────────────────────────────────────────────────────

function generateRoute(artifact: IRRoute): GeneratedFile[] {
  const className = toPascalCase(artifact.controllerName);
  const content = `// Route mapping for ${className}Controller
// In Spring Boot, routes are defined via annotations on controller methods.
// Controller: ${BASE_PACKAGE}.controller.${className}Controller
// Base path:  ${artifact.basePath}
//
// Actions:
${artifact.actions
  .map(
    (a) =>
      `//   ${a.httpMethod.padEnd(7)} ${artifact.basePath}${a.path} → ${toCamelCase(a.handlerName)}()${a.authRequired ? ' [Auth required]' : ''}`,
  )
  .join('\n')}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/controller/${className}RoutesInfo.java.txt`,
      content,
      overwrite: true,
    },
  ];
}

// ── Validation Schema ─────────────────────────────────────────────────────────

function renderValidationAnnotations(rules: import('../../../ir/types.js').IRValidationRule[]): string[] {
  return rules.map((rule) => {
    switch (rule.kind) {
      case 'required':
        return `@NotNull${rule.errorMessage ? `(message = "${rule.errorMessage}")` : ''}`;
      case 'min-length': {
        const min = rule.params['min'] ?? rule.params['value'] ?? 1;
        return `@Size(min = ${min}${rule.errorMessage ? `, message = "${rule.errorMessage}"` : ''})`;
      }
      case 'max-length': {
        const max = rule.params['max'] ?? rule.params['value'] ?? 255;
        return `@Size(max = ${max}${rule.errorMessage ? `, message = "${rule.errorMessage}"` : ''})`;
      }
      case 'range': {
        const min = rule.params['min'] ?? 0;
        const max = rule.params['max'];
        const annotations = [`@Min(${min})`];
        if (max !== undefined) annotations.push(`@Max(${max})`);
        return annotations.join(' ');
      }
      case 'email':
        return `@Email${rule.errorMessage ? `(message = "${rule.errorMessage}")` : ''}`;
      case 'regex': {
        const pattern = rule.params['pattern'] ?? '.*';
        return `@Pattern(regexp = "${String(pattern).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"${rule.errorMessage ? `, message = "${rule.errorMessage}"` : ''})`;
      }
      case 'url':
        return `@org.hibernate.validator.constraints.URL`;
      case 'phone':
        return `@Pattern(regexp = "^[+]?[(]?[0-9]{3}[)]?[-\\\\s.]?[0-9]{3}[-\\\\s.]?[0-9]{4,6}$"${rule.errorMessage ? `, message = "${rule.errorMessage}"` : ''})`;
      case 'custom':
        return `// Custom validation: ${rule.errorMessage ?? JSON.stringify(rule.params)}`;
      default:
        return `// Validation: ${rule.kind}`;
    }
  });
}

function generateValidationSchema(artifact: IRValidationSchema): GeneratedFile[] {
  const className = `${toPascalCase(artifact.name)}Request`;

  const fieldLines = artifact.fields.map((field) => {
    const annotations = renderValidationAnnotations(field.rules);
    const javaType = mapJavaType(field.type);
    const fieldName = toCamelCase(field.name);
    const annotationStr = annotations.length
      ? annotations.map((a) => `    ${a}`).join('\n') + '\n'
      : '';
    return `${annotationStr}    ${javaType} ${fieldName}`;
  });

  const content = `package ${BASE_PACKAGE}.dto;

import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ${className}(
${fieldLines.join(',\n\n')}
) {}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/dto/${className}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── DI Registration ───────────────────────────────────────────────────────────

function generateDiRegistration(artifact: IRDiRegistration): GeneratedFile[] {
  const beans = artifact.registrations.map((reg) => {
    const implClass = toPascalCase(reg.implementationName);
    const interfaceClass = toPascalCase(reg.interfaceName.replace(/^I/, ''));
    const beanName = toCamelCase(interfaceClass);
    const scopeAnnotation =
      reg.lifetime === 'singleton'
        ? ''
        : reg.lifetime === 'scoped'
          ? '\n    @Scope("request")'
          : '\n    @Scope("prototype")';

    return `    @Bean${scopeAnnotation}
    public ${interfaceClass} ${beanName}() {
        return new ${implClass}();
    }`;
  });

  const content = `package ${BASE_PACKAGE}.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

@Configuration
public class BeanConfig {

${beans.join('\n\n')}
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/config/BeanConfig.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Domain Event ──────────────────────────────────────────────────────────────

function generateDomainEvent(artifact: IRDomainEvent): GeneratedFile[] {
  const className = `${toPascalCase(artifact.name)}Event`;

  const fields = artifact.properties
    .map((p) => `    private final ${mapJavaType(p.type)} ${toCamelCase(p.name)};`)
    .join('\n');

  const ctorParams = artifact.properties
    .map((p) => `${mapJavaType(p.type)} ${toCamelCase(p.name)}`)
    .join(', ');

  const ctorAssignments = artifact.properties
    .map((p) => `        this.${toCamelCase(p.name)} = ${toCamelCase(p.name)};`)
    .join('\n');

  const getters = artifact.properties
    .map((p) => {
      const fieldName = toCamelCase(p.name);
      const getterName = `get${toPascalCase(p.name)}`;
      return `    public ${mapJavaType(p.type)} ${getterName}() { return ${fieldName}; }`;
    })
    .join('\n');

  const content = `package ${BASE_PACKAGE}.event;

import org.springframework.context.ApplicationEvent;
import java.time.LocalDateTime;
import java.util.UUID;

public class ${className} extends ApplicationEvent {

${fields}

    public ${className}(Object source${ctorParams ? ', ' + ctorParams : ''}) {
        super(source);
${ctorAssignments}
    }

${getters}
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/event/${className}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Value Object ──────────────────────────────────────────────────────────────

function generateValueObject(artifact: IRValueObject): GeneratedFile[] {
  const className = toPascalCase(artifact.name);

  const recordComponents = artifact.properties
    .map((p) => `${mapJavaType(p.type)} ${toCamelCase(p.name)}`)
    .join(',\n    ');

  const validations = artifact.validationRules
    .map((rule) => {
      if (rule.kind === 'required') {
        // Generate null checks for first property
        const firstProp = artifact.properties[0];
        if (firstProp) {
          const name = toCamelCase(firstProp.name);
          return `        if (${name} == null) throw new IllegalArgumentException("${name} must not be null");`;
        }
      }
      if (rule.kind === 'min-length') {
        const firstProp = artifact.properties.find((p) => mapJavaType(p.type) === 'String');
        if (firstProp) {
          const name = toCamelCase(firstProp.name);
          const min = rule.params['min'] ?? rule.params['value'] ?? 1;
          return `        if (${name} == null || ${name}.length() < ${min}) throw new IllegalArgumentException("${name} must be at least ${min} characters");`;
        }
      }
      return `        // Validate: ${rule.kind} — ${JSON.stringify(rule.params)}`;
    })
    .join('\n');

  const content = `package ${BASE_PACKAGE}.domain;

import java.util.Objects;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.UUID;

public record ${className}(
    ${recordComponents}
) {
    // Compact constructor for validation
    public ${className} {
${validations}
    }
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/domain/${className}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Enum ──────────────────────────────────────────────────────────────────────

function generateEnum(artifact: IREnum): GeneratedFile[] {
  const className = toPascalCase(artifact.name);

  const hasValues = artifact.members.some((m) => m.value !== undefined);

  let enumBody: string;
  if (hasValues) {
    const memberLines = artifact.members
      .map((m) => {
        const constName = toScreamingSnakeCase(m.name);
        const val = m.value !== undefined ? `(${JSON.stringify(m.value)})` : '(0)';
        return `    ${constName}${val}`;
      })
      .join(',\n');

    const valueType =
      typeof artifact.members.find((m) => m.value !== undefined)?.value === 'string'
        ? 'String'
        : 'int';

    enumBody = `${memberLines};

    private final ${valueType} value;

    ${className}(${valueType} value) {
        this.value = value;
    }

    public ${valueType} getValue() {
        return value;
    }`;
  } else {
    enumBody = artifact.members
      .map((m) => `    ${toScreamingSnakeCase(m.name)}`)
      .join(',\n');
  }

  const content = `package ${BASE_PACKAGE}.model.enums;

public enum ${className} {

${enumBody}
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/model/enums/${className}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function generateMapper(artifact: IRMapper): GeneratedFile[] {
  const className = `${toPascalCase(artifact.name)}Mapper`;
  const sourceClass = toPascalCase(artifact.sourceType);
  const targetClass = toPascalCase(artifact.targetType);

  const mappingAnnotations = artifact.mappings
    .map((m) => `    @Mapping(source = "${m.from}", target = "${m.to}"${m.transform ? `, qualifiedByName = "${m.transform}"` : ''})`)
    .join('\n');

  const reverseMappings = artifact.mappings
    .map((m) => `    @Mapping(source = "${m.to}", target = "${m.from}")`)
    .join('\n');

  const content = `package ${BASE_PACKAGE}.mapper;

import ${BASE_PACKAGE}.model.${sourceClass};
import ${BASE_PACKAGE}.dto.${targetClass};
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import java.util.List;

@Mapper(componentModel = "spring")
public interface ${className} {

${mappingAnnotations}
    ${targetClass} toDto(${sourceClass} source);

${reverseMappings}
    ${sourceClass} toEntity(${targetClass} dto);

    List<${targetClass}> toDtoList(List<${sourceClass}> sources);

    List<${sourceClass}> toEntityList(List<${targetClass}> dtos);
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/mapper/${className}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Use Case / Handler ────────────────────────────────────────────────────────

function generateUseCaseOrHandler(artifact: IRUseCaseOrHandler): GeneratedFile[] {
  const className = toPascalCase(artifact.name);
  const inputType = mapJavaType(artifact.inputType);
  const outputType = mapJavaType(artifact.outputType);
  const isCommand = artifact.cqrsType === 'command';

  const depFields = artifact.dependencies
    .map((d) => `    private final ${depTypeName(d)} ${depFieldName(d)};`)
    .join('\n');

  const content = `package ${BASE_PACKAGE}.usecase;

import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * ${isCommand ? 'Command' : 'Query'} handler for ${className}.
 * CQRS type: ${artifact.cqrsType}
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ${className} {

${depFields ? depFields + '\n' : ''}
    public ${outputType} execute(${inputType} input) {
        log.debug("Executing ${className} with input: {}", input);
        throw new UnsupportedOperationException("${className}.execute not yet implemented");
    }
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/usecase/${className}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── SignalR Hub → Spring WebSocket ────────────────────────────────────────────

function generateSignalRHub(artifact: IRSignalRHub): GeneratedFile[] {
  const className = `${toPascalCase(artifact.name)}Handler`;
  const hubPath = artifact.hubPath.startsWith('/') ? artifact.hubPath : `/${artifact.hubPath}`;

  const messageMethods = artifact.methods.map((m) => {
    const returnType = mapJavaType(m.returnType);
    const methodName = toCamelCase(m.name);
    const params = renderMethodParams(m.parameters);
    const actualReturn = returnType === 'void' ? 'void' : returnType;
    return `    @MessageMapping("${hubPath}/${m.name}")
    @SendTo("/topic${hubPath}")
    public ${actualReturn} ${methodName}(${params || 'Object payload'}) {
        throw new UnsupportedOperationException("${methodName} not yet implemented");
    }`;
  });

  const eventConsts = artifact.events.map((e) => {
    const payloadType = mapJavaType(e.payloadType);
    return `    // Event: ${e.name} — payload type: ${payloadType}`;
  });

  const content = `package ${BASE_PACKAGE}.websocket;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * WebSocket handler migrated from SignalR hub: ${artifact.name}
 * Hub path: ${artifact.hubPath}
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ${className} {

    private final SimpMessagingTemplate messagingTemplate;

${eventConsts.join('\n')}

${messageMethods.join('\n\n')}
}
`;

  // WebSocket config
  const wsConfigContent = `package ${BASE_PACKAGE}.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("${hubPath}").withSockJS();
    }
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/websocket/${className}.java`,
      content,
      overwrite: true,
    },
    {
      relativePath: `${SRC_ROOT}/config/WebSocketConfig.java`,
      content: wsConfigContent,
      overwrite: false,
    },
  ];
}

// ── Background Job ────────────────────────────────────────────────────────────

function generateBackgroundJob(artifact: IRBackgroundJob): GeneratedFile[] {
  const className = `${toPascalCase(artifact.name)}Job`;

  const depFields = artifact.dependencies
    .map((d) => `    private final ${depTypeName(d)} ${depFieldName(d)};`)
    .join('\n');

  let scheduleAnnotation: string;
  if (artifact.schedule) {
    // If it looks like a cron expression (contains spaces or *), use cron
    if (artifact.schedule.includes(' ') || artifact.schedule.includes('*')) {
      scheduleAnnotation = `@Scheduled(cron = "${artifact.schedule}")`;
    } else {
      // Try to parse as ISO duration or milliseconds
      scheduleAnnotation = `@Scheduled(fixedRateString = "\${job.${toCamelCase(artifact.name)}.rate:${artifact.schedule}}")`;
    }
  } else {
    scheduleAnnotation = `@Scheduled(fixedRate = 60000) // Every 60 seconds — configure as needed`;
  }

  const content = `package ${BASE_PACKAGE}.job;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Background job migrated from .NET ${artifact.type}: ${artifact.name}
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ${className} {

${depFields ? depFields + '\n' : ''}
    ${scheduleAnnotation}
    public void execute() {
        log.info("${className} started");
        try {
            throw new UnsupportedOperationException("${className}.execute not yet implemented");
        } catch (UnsupportedOperationException e) {
            throw e;
        } catch (Exception e) {
            log.error("${className} failed: {}", e.getMessage(), e);
        }
    }
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/job/${className}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Cache Usage ───────────────────────────────────────────────────────────────

function generateCacheUsage(artifact: IRCacheUsage): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  const isRedis = artifact.type === 'redis';
  const isDistributed = artifact.type === 'distributed' || isRedis;

  const redisImports = isRedis
    ? `import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import java.time.Duration;
`
    : '';

  const cacheManagerBean = isRedis
    ? `
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .disableCachingNullValues();
        return RedisCacheManager.builder(redisConnectionFactory)
                .cacheDefaults(config)
                .build();
    }
`
    : isDistributed
      ? `
    @Bean
    public org.springframework.cache.CacheManager cacheManager() {
        return new org.springframework.cache.concurrent.ConcurrentMapCacheManager();
    }
`
      : '';

  const cacheConfigContent = `package ${BASE_PACKAGE}.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
${redisImports}
@Configuration
@EnableCaching
public class CacheConfig {
${cacheManagerBean}}
`;

  files.push({
    relativePath: `${SRC_ROOT}/config/CacheConfig.java`,
    content: cacheConfigContent,
    overwrite: true,
  });

  // Generate example cached service demonstrating the operations
  if (artifact.operations.length > 0) {
    const cacheExampleMethods = artifact.operations
      .slice(0, 5)
      .map((op) => {
        const methodName = toCamelCase(op.method);
        const ttlComment = op.ttl ? ` // TTL: ${op.ttl}s` : '';
        return `    @Cacheable(value = "${op.key}", key = "#id")${ttlComment}
    public Object ${methodName}(Long id) {
        throw new UnsupportedOperationException("${methodName} not yet implemented");
    }

    @CacheEvict(value = "${op.key}", key = "#id")
    public void evict${toPascalCase(op.method)}(Long id) {
        // Cache eviction for ${op.key}
    }`;
      })
      .join('\n\n');

    const cacheExampleContent = `package ${BASE_PACKAGE}.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.stereotype.Service;

/**
 * Example demonstrating cache usage patterns migrated from .NET (${artifact.type}).
 * Merge relevant methods into your actual service classes.
 */
@Service
public class CacheExampleService {

${cacheExampleMethods}
}
`;

    files.push({
      relativePath: `${SRC_ROOT}/service/CacheExampleService.java`,
      content: cacheExampleContent,
      overwrite: true,
    });
  }

  return files;
}

// ── Logging Config ────────────────────────────────────────────────────────────

function generateLoggingConfig(artifact: IRLoggingConfig): GeneratedFile[] {
  const level = artifact.logLevel?.toUpperCase() ?? 'INFO';

  let encoderXml: string;
  if (artifact.structuredLogging) {
    encoderXml = `        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>traceId</includeMdcKeyName>
            <includeMdcKeyName>spanId</includeMdcKeyName>
        </encoder>`;
  } else {
    encoderXml = `        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>`;
  }

  const sinkAppenders = artifact.sinks.map((sink) => {
    const sinkName = sink.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    if (sink.toLowerCase().includes('file')) {
      return `
    <appender name="${sinkName}" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>logs/application.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>logs/application.%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
            <maxHistory>30</maxHistory>
            <totalSizeCap>1GB</totalSizeCap>
        </rollingPolicy>
        ${encoderXml}
    </appender>`;
    }
    if (sink.toLowerCase().includes('seq') || sink.toLowerCase().includes('elk')) {
      return `
    <!-- ${sink} sink — configure endpoint via logback-spring properties -->
    <!-- <appender name="${sinkName}" class="..."> ... </appender> -->`;
    }
    return ``;
  });

  const appenderRefs = ['CONSOLE', ...artifact.sinks.map((s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '_'))];

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<configuration>

    <springProperty scope="context" name="APP_NAME" source="spring.application.name" defaultValue="app"/>

    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
${encoderXml}
    </appender>
${sinkAppenders.join('\n')}

    <logger name="${BASE_PACKAGE}" level="DEBUG" additivity="false">
${appenderRefs.map((r) => `        <appender-ref ref="${r}"/>`).join('\n')}
    </logger>

    <root level="${level}">
        <appender-ref ref="CONSOLE"/>
    </root>

</configuration>
`;

  return [
    {
      relativePath: `${RES_ROOT}/logback-spring.xml`,
      content,
      overwrite: true,
    },
  ];
}

// ── Health Check ──────────────────────────────────────────────────────────────

function generateHealthCheck(artifact: IRHealthCheck): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  for (const check of artifact.checks) {
    const className = `${toPascalCase(check.name)}HealthIndicator`;

    let checkBody: string;
    if (check.type === 'db') {
      checkBody = `        // Verify database connectivity
        try {
            dataSource.getConnection().close();
            return Health.up().withDetail("database", "reachable").build();
        } catch (Exception e) {
            return Health.down(e).withDetail("database", "unreachable").build();
        }`;
    } else if (check.type === 'redis') {
      checkBody = `        try {
            redisTemplate.opsForValue().get("health:ping");
            return Health.up().withDetail("redis", "reachable").build();
        } catch (Exception e) {
            return Health.down(e).withDetail("redis", "unreachable").build();
        }`;
    } else if (check.type === 'external') {
      checkBody = `        try {
            // TODO: Implement external service health check for ${check.name}
            return Health.up().withDetail("${check.name}", "reachable").build();
        } catch (Exception e) {
            return Health.down(e).withDetail("${check.name}", "unreachable").build();
        }`;
    } else {
      checkBody = `        // Custom health check: ${check.name}
        return Health.up().withDetail("${check.name}", "ok").build();`;
    }

    const imports = check.type === 'db'
      ? 'import javax.sql.DataSource;\n'
      : check.type === 'redis'
        ? 'import org.springframework.data.redis.core.RedisTemplate;\n'
        : '';

    const fields = check.type === 'db'
      ? '    private final DataSource dataSource;\n'
      : check.type === 'redis'
        ? '    private final RedisTemplate<String, Object> redisTemplate;\n'
        : '';

    const content = `package ${BASE_PACKAGE}.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import lombok.RequiredArgsConstructor;
${imports}
@Component
@RequiredArgsConstructor
public class ${className} implements HealthIndicator {

${fields}
    @Override
    public Health health() {
${checkBody}
    }
}
`;

    files.push({
      relativePath: `${SRC_ROOT}/health/${className}.java`,
      content,
      overwrite: true,
    });
  }

  // Actuator configuration in application.yml addition
  const actuatorYml = `# Actuator config — merge into application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when_authorized
      probes:
        enabled: true
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
`;

  files.push({
    relativePath: `${RES_ROOT}/actuator.yml`,
    content: actuatorYml,
    overwrite: true,
  });

  return files;
}

// ── CORS Config ───────────────────────────────────────────────────────────────

function generateCorsConfig(artifact: IRCorsConfig): GeneratedFile[] {
  const origins = artifact.origins.map((o) => `"${o}"`).join(', ');
  const methods = artifact.methods.map((m) => `"${m}"`).join(', ');
  const headers = artifact.headers.length
    ? artifact.headers.map((h) => `"${h}"`).join(', ')
    : '"*"';

  const content = `package ${BASE_PACKAGE}.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(${origins})
                .allowedMethods(${methods})
                .allowedHeaders(${headers})
                .allowCredentials(${artifact.allowCredentials})
                .maxAge(3600);
    }
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/config/CorsConfig.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── API Versioning ────────────────────────────────────────────────────────────

function generateApiVersioning(artifact: IRApiVersioning): GeneratedFile[] {
  const versionConstants = artifact.versions
    .map((v) => `    public static final String V${v.replace(/\./g, '_')} = "${v}";`)
    .join('\n');

  let strategyNote: string;
  if (artifact.strategy === 'url') {
    strategyNote = `// URL-based versioning: prefix controllers with @RequestMapping("/api/v{N}/...")
// Example: @RequestMapping("/api/${artifact.defaultVersion}/users")`;
  } else if (artifact.strategy === 'header') {
    strategyNote = `// Header-based versioning: use @RequestMapping with headers condition
// Example: @GetMapping(value = "/users", headers = "X-API-Version=${artifact.defaultVersion}")`;
  } else {
    strategyNote = `// Query-param versioning: use @RequestMapping with params condition
// Example: @GetMapping(value = "/users", params = "version=${artifact.defaultVersion}")`;
  }

  const content = `package ${BASE_PACKAGE}.config;

import org.springframework.context.annotation.Configuration;

/**
 * API versioning configuration.
 * Strategy: ${artifact.strategy}
 * Default version: ${artifact.defaultVersion}
 *
 * ${strategyNote}
 */
@Configuration
public class ApiVersionConfig {

    /** Available API versions */
${versionConstants}

    /** Default version applied when no version is specified */
    public static final String DEFAULT = "${artifact.defaultVersion}";
}
`;

  // Generate a versioned base annotation
  const annotationContent = `package ${BASE_PACKAGE}.config;

import org.springframework.web.bind.annotation.RequestMapping;
import java.lang.annotation.*;

/**
 * Convenience annotation for versioned API controllers.
 * Usage: @ApiV${artifact.defaultVersion.replace(/\./g, '')} on controller class, then @RequestMapping on methods.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@RequestMapping("/api/${artifact.defaultVersion}")
public @interface ApiV${artifact.defaultVersion.replace(/\./g, '')} {
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/config/ApiVersionConfig.java`,
      content,
      overwrite: true,
    },
    {
      relativePath: `${SRC_ROOT}/config/ApiV${artifact.defaultVersion.replace(/\./g, '')}.java`,
      content: annotationContent,
      overwrite: true,
    },
  ];
}

// ── Swagger / OpenAPI Config ──────────────────────────────────────────────────

function generateSwaggerConfig(artifact: IRSwaggerConfig): GeneratedFile[] {
  const descriptionStr = artifact.description ? `\n                .description("${artifact.description}")` : '';

  const content = `package ${BASE_PACKAGE}.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("${artifact.title}")
                        .version("${artifact.version}")${descriptionStr}
                        .contact(new Contact().name("API Team")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/config/OpenApiConfig.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Rate Limiting ─────────────────────────────────────────────────────────────

function generateRateLimiting(artifact: IRRateLimiting): GeneratedFile[] {
  const primaryPolicy = artifact.policies[0] ?? { name: 'default', limit: 100, window: 'PT1M' };

  const policyComments = artifact.policies
    .map(
      (p) =>
        `    // Policy: ${p.name} — ${p.limit} requests per ${p.window}${p.appliesTo?.length ? ` — applies to: ${p.appliesTo.join(', ')}` : ''}`,
    )
    .join('\n');

  const content = `package ${BASE_PACKAGE}.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import lombok.extern.slf4j.Slf4j;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limiting filter using Bucket4j.
 * Migrated from .NET rate limiting policies.
 *
${policyComments}
 */
@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private Bucket createBucket() {
        Bandwidth limit = Bandwidth.classic(
                ${primaryPolicy.limit},
                Refill.intervally(${primaryPolicy.limit}, Duration.parse("${primaryPolicy.window}"))
        );
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket getBucket(String key) {
        return buckets.computeIfAbsent(key, k -> createBucket());
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String key = request.getRemoteAddr();
        Bucket bucket = getBucket(key);

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            log.warn("Rate limit exceeded for client: {}", key);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\\"error\\":\\"Too Many Requests\\",\\"message\\":\\"Rate limit exceeded. Please retry later.\\"}");
        }
    }
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/filter/RateLimitFilter.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── Stored Procedure ──────────────────────────────────────────────────────────

function generateStoredProcedure(artifact: IRStoredProcedure): GeneratedFile[] {
  const repoName = `${toPascalCase(artifact.name)}StoredProcRepository`;
  const returnType = mapJavaType(artifact.returnType);

  const params = artifact.parameters
    .map((p) => `@Param("${p.name}") ${mapJavaType(p.type)} ${toCamelCase(p.name)}`)
    .join(', ');

  const methodName = `call${toPascalCase(artifact.name)}`;

  const rawSql = artifact.rawSql
    ? artifact.rawSql.replace(/"/g, '\\"')
    : `CALL ${artifact.name}(${artifact.parameters.map((p) => ':' + p.name).join(', ')})`;

  const content = `package ${BASE_PACKAGE}.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * Repository for stored procedure: ${artifact.name}
 * Migrated from .NET stored procedure call.
 */
@Repository
public interface ${repoName} extends JpaRepository<Object, Long> {

    @Query(value = "${rawSql}", nativeQuery = true)
    ${returnType.includes('List') ? returnType : `List<Object[]>`} ${methodName}(${params});
}
`;

  return [
    {
      relativePath: `${SRC_ROOT}/repository/${repoName}.java`,
      content,
      overwrite: true,
    },
  ];
}

// ── DB Migration ──────────────────────────────────────────────────────────────

function generateDbMigration(artifact: IRDbMigration): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Format timestamp for Flyway: V{yyyyMMddHHmmss}__{Name}.sql
  const rawTs = artifact.timestamp.replace(/[-T:.Z]/g, '').slice(0, 14).padEnd(14, '0');
  const migrationName = toSnakeCase(artifact.name).replace(/\s/g, '_');
  const fileName = `V${rawTs}__${migrationName}.sql`;

  const upSql = artifact.upOperations.join('\n\n');
  const downSql = artifact.downOperations.join('\n\n');

  const content = `-- Flyway migration: ${artifact.name}
-- Generated from .NET EF Core migration
-- Timestamp: ${artifact.timestamp}

${upSql}
`;

  files.push({
    relativePath: `${RES_ROOT}/db/migration/${fileName}`,
    content,
    overwrite: true,
  });

  if (downSql.trim()) {
    files.push({
      relativePath: `${RES_ROOT}/db/migration/undo/${fileName}`,
      content: `-- Undo migration: ${artifact.name}\n\n${downSql}\n`,
      overwrite: true,
    });
  }

  return files;
}

// ── NuGet Mapping ─────────────────────────────────────────────────────────────

function generateNuGetMapping(artifact: IRNuGetMapping): GeneratedFile[] {
  const mavenEquiv = artifact.targetEquivalent ?? '(no direct equivalent — manual review required)';
  const mavenVersion = artifact.targetVersion ?? 'latest';

  const content = `| ${artifact.nugetPackage} | ${artifact.nugetVersion} | ${mavenEquiv} | ${mavenVersion} | ${artifact.notes ?? ''} |
`;

  // Append to a shared dependency-mapping file
  return [
    {
      relativePath: `dependency-mapping.md`,
      content: `| NuGet Package | NuGet Version | Maven Equivalent | Maven Version | Notes |
|---|---|---|---|---|
${content}`,
      overwrite: false,
    },
  ];
}

// ── Razor View ────────────────────────────────────────────────────────────────

function generateRazorView(artifact: IRRazorView): GeneratedFile[] {
  const content = `UNMIGRATED RAZOR VIEW
=====================
Original path: ${artifact.path}
View name:     ${artifact.name}
${artifact.model ? `Model type:    ${artifact.model}` : ''}
${artifact.layout ? `Layout:        ${artifact.layout}` : ''}

This Razor view was not migrated because the target is an API-only Spring Boot application.
Options:
  1. Build a separate frontend (React, Angular, Vue) that calls the REST API.
  2. Use Thymeleaf templates (add spring-boot-starter-thymeleaf to pom.xml).
  3. Use server-side rendering with a separate Node.js frontend service.

Manual action required.
`;

  return [
    {
      relativePath: `${RES_ROOT}/unmigrated/${artifact.name}.txt`,
      content,
      overwrite: true,
    },
  ];
}

// ── Scaffold Files ────────────────────────────────────────────────────────────

function generateGlobalExceptionHandler(): GeneratedFile {
  const content = `package ${BASE_PACKAGE}.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import lombok.extern.slf4j.Slf4j;
import java.net.URI;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        detail.setType(URI.create("about:blank"));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(detail);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ProblemDetail> handleBadRequest(BadRequestException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(detail);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value",
                        (a, b) -> a
                ));
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        detail.setProperty("errors", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(detail);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(detail);
    }
}
`;
  return { relativePath: `${SRC_ROOT}/exception/GlobalExceptionHandler.java`, content, overwrite: true };
}

function generateResourceNotFoundException(): GeneratedFile {
  const content = `package ${BASE_PACKAGE}.exception;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " not found with id: " + id);
    }
}
`;
  return { relativePath: `${SRC_ROOT}/exception/ResourceNotFoundException.java`, content, overwrite: true };
}

function generateBadRequestException(): GeneratedFile {
  const content = `package ${BASE_PACKAGE}.exception;

public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }

    public BadRequestException(String field, String detail) {
        super("Invalid value for '" + field + "': " + detail);
    }
}
`;
  return { relativePath: `${SRC_ROOT}/exception/BadRequestException.java`, content, overwrite: true };
}

function generateUseCaseInterface(): GeneratedFile {
  const content = `package ${BASE_PACKAGE}.usecase;

/**
 * Marker interface for use cases (CQRS commands and queries).
 *
 * @param <I> Input type (command/query)
 * @param <O> Output type (result)
 */
@FunctionalInterface
public interface UseCase<I, O> {
    O execute(I input);
}
`;
  return { relativePath: `${SRC_ROOT}/usecase/UseCase.java`, content, overwrite: true };
}

function generateResultMonad(): GeneratedFile {
  const content = `package ${BASE_PACKAGE}.common;

import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Function;

/**
 * Result monad for explicit success/failure without exceptions in use cases.
 */
public sealed interface Result<T> permits Result.Success, Result.Failure {

    record Success<T>(T value) implements Result<T> {}
    record Failure<T>(String error, Exception cause) implements Result<T> {
        public Failure(String error) {
            this(error, null);
        }
    }

    static <T> Result<T> success(T value) {
        return new Success<>(value);
    }

    static <T> Result<T> failure(String error) {
        return new Failure<>(error);
    }

    static <T> Result<T> failure(String error, Exception cause) {
        return new Failure<>(error, cause);
    }

    default boolean isSuccess() {
        return this instanceof Success;
    }

    default boolean isFailure() {
        return this instanceof Failure;
    }

    default Optional<T> toOptional() {
        return this instanceof Success<T> s ? Optional.of(s.value()) : Optional.empty();
    }

    default <U> Result<U> map(Function<T, U> mapper) {
        return this instanceof Success<T> s ? success(mapper.apply(s.value())) : failure(((Failure<T>) this).error(), ((Failure<T>) this).cause());
    }

    default void ifSuccess(Consumer<T> consumer) {
        if (this instanceof Success<T> s) consumer.accept(s.value());
    }

    default void ifFailure(Consumer<String> consumer) {
        if (this instanceof Failure<T> f) consumer.accept(f.error());
    }
}
`;
  return { relativePath: `${SRC_ROOT}/common/Result.java`, content, overwrite: true };
}

function generateBaseEntity(): GeneratedFile {
  const content = `package ${BASE_PACKAGE}.domain.base;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.LocalDateTime;

@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Long version;
}
`;
  return { relativePath: `${SRC_ROOT}/domain/base/BaseEntity.java`, content, overwrite: true };
}

function generateAggregateRoot(): GeneratedFile {
  const content = `package ${BASE_PACKAGE}.domain.base;

import org.springframework.data.domain.AfterDomainEventPublication;
import org.springframework.data.domain.DomainEvents;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

public abstract class AggregateRoot extends BaseEntity {

    private final transient List<Object> domainEvents = new ArrayList<>();

    protected void registerEvent(Object event) {
        domainEvents.add(event);
    }

    @DomainEvents
    public Collection<Object> domainEvents() {
        return Collections.unmodifiableList(domainEvents);
    }

    @AfterDomainEventPublication
    public void clearDomainEvents() {
        domainEvents.clear();
    }
}
`;
  return { relativePath: `${SRC_ROOT}/domain/base/AggregateRoot.java`, content, overwrite: true };
}

function generateValueObjectBase(): GeneratedFile {
  const content = `package ${BASE_PACKAGE}.domain.base;

import java.util.Objects;

/**
 * Base class for value objects.
 * Prefer Java records for simple value objects — use this base class only
 * when the value object needs behaviour that records cannot provide.
 */
public abstract class ValueObject {

    protected abstract Object[] getEqualityComponents();

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        ValueObject other = (ValueObject) obj;
        return Objects.deepEquals(getEqualityComponents(), other.getEqualityComponents());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getEqualityComponents());
    }
}
`;
  return { relativePath: `${SRC_ROOT}/domain/base/ValueObject.java`, content, overwrite: true };
}

function generateDomainEventInterface(): GeneratedFile {
  const content = `package ${BASE_PACKAGE}.event;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Marker interface for domain events.
 * Extend ApplicationEvent for Spring's event bus, or implement this interface
 * for custom event dispatching.
 */
public interface DomainEvent {

    UUID eventId();

    LocalDateTime occurredAt();

    String aggregateType();

    String aggregateId();
}
`;
  return { relativePath: `${SRC_ROOT}/event/DomainEvent.java`, content, overwrite: true };
}

// ── Main Class ────────────────────────────────────────────────────────────────

export class JavaCodeGenerator implements TargetCodeGenerator {
  generateFromArtifact(artifact: IRArtifact, _ctx: GenerationContext): GeneratedFile[] {
    switch (artifact.kind) {
      case 'controller':
        return generateController(artifact as IRController);
      case 'model':
        return generateModel(artifact as IRModel);
      case 'service':
        return generateService(artifact as IRService);
      case 'repository':
        return generateRepository(artifact as IRRepository);
      case 'middleware':
        return generateMiddleware(artifact as IRMiddleware);
      case 'config':
        return generateConfig(artifact as IRConfig);
      case 'auth':
        return generateAuth(artifact as IRAuth);
      case 'route':
        return generateRoute(artifact as IRRoute);
      case 'validation-schema':
        return generateValidationSchema(artifact as IRValidationSchema);
      case 'di-registration':
        return generateDiRegistration(artifact as IRDiRegistration);
      case 'domain-event':
        return generateDomainEvent(artifact as IRDomainEvent);
      case 'value-object':
        return generateValueObject(artifact as IRValueObject);
      case 'enum':
        return generateEnum(artifact as IREnum);
      case 'mapper':
        return generateMapper(artifact as IRMapper);
      case 'use-case-or-handler':
        return generateUseCaseOrHandler(artifact as IRUseCaseOrHandler);
      case 'signalr-hub':
        return generateSignalRHub(artifact as IRSignalRHub);
      case 'background-job':
        return generateBackgroundJob(artifact as IRBackgroundJob);
      case 'cache-usage':
        return generateCacheUsage(artifact as IRCacheUsage);
      case 'logging-config':
        return generateLoggingConfig(artifact as IRLoggingConfig);
      case 'health-check':
        return generateHealthCheck(artifact as IRHealthCheck);
      case 'cors-config':
        return generateCorsConfig(artifact as IRCorsConfig);
      case 'api-versioning':
        return generateApiVersioning(artifact as IRApiVersioning);
      case 'swagger-config':
        return generateSwaggerConfig(artifact as IRSwaggerConfig);
      case 'rate-limiting':
        return generateRateLimiting(artifact as IRRateLimiting);
      case 'stored-procedure':
        return generateStoredProcedure(artifact as IRStoredProcedure);
      case 'db-migration':
        return generateDbMigration(artifact as IRDbMigration);
      case 'nuget-mapping':
        return generateNuGetMapping(artifact as IRNuGetMapping);
      case 'razor-view':
        return generateRazorView(artifact as IRRazorView);
      default:
        return [];
    }
  }

  generateEntryPoint(ctx: GenerationContext): GeneratedFile[] {
    const hasJobs = ctx.allArtifacts.some((a) => a.kind === 'background-job');
    const hasCache = ctx.allArtifacts.some((a) => a.kind === 'cache-usage');
    const hasWebSocket = ctx.allArtifacts.some((a) => a.kind === 'signalr-hub');

    const extraImports: string[] = [];
    const extraAnnotations: string[] = [];

    if (hasJobs) {
      extraImports.push('import org.springframework.scheduling.annotation.EnableScheduling;');
      extraAnnotations.push('@EnableScheduling');
    }
    if (hasCache) {
      extraImports.push('import org.springframework.cache.annotation.EnableCaching;');
      extraAnnotations.push('@EnableCaching');
    }
    if (hasWebSocket) {
      extraImports.push('import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;');
    }

    const importsBlock = extraImports.length ? '\n' + extraImports.join('\n') : '';
    const annotationsBlock = extraAnnotations.length ? extraAnnotations.join('\n') + '\n' : '';

    const appClass = `package ${BASE_PACKAGE};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;${importsBlock}

@SpringBootApplication
@EnableJpaAuditing
@ConfigurationPropertiesScan
${annotationsBlock}public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
`;

    return [
      {
        relativePath: `${SRC_ROOT}/Application.java`,
        content: appClass,
        overwrite: true,
      },
    ];
  }

  generateProjectConfig(ctx: GenerationContext): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Collect config entries from IR
    const configArtifacts = ctx.allArtifacts.filter((a) => a.kind === 'config') as IRConfig[];
    const extraEntries = configArtifacts.flatMap((c) => c.entries);

    // Determine datasource config from connection strings
    const connStrings = configArtifacts.flatMap((c) => c.connectionStrings);
    const primaryConn = connStrings[0];
    const dsUrl = primaryConn
      ? `\${DATABASE_URL:${primaryConn.connectionString}}`
      : '${DATABASE_URL:jdbc:postgresql://localhost:5432/app}';

    const hasRedis = ctx.allArtifacts.some((a) => a.kind === 'cache-usage' && (a as IRCacheUsage).type === 'redis');
    const hasActuator = ctx.allArtifacts.some((a) => a.kind === 'health-check');
    const hasSecurity = ctx.allArtifacts.some((a) => a.kind === 'auth');

    const redisSection = hasRedis
      ? `  redis:
    host: \${REDIS_HOST:localhost}
    port: \${REDIS_PORT:6379}
    password: \${REDIS_PASSWORD:}
`
      : '';

    const actuatorSection = hasActuator
      ? `
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when_authorized
`
      : '';

    const jwtSection = hasSecurity
      ? `
app:
  jwt:
    secret: \${JWT_SECRET:change-me-in-production-minimum-256-bits}
    expiration-ms: \${JWT_EXPIRATION_MS:3600000}
`
      : '';

    const extraEntriesYml = extraEntries.length
      ? '\n# Migrated configuration entries\n' +
        extraEntries
          .map((e) => {
            const key = e.key.replace(/[.:]/g, '-').toLowerCase();
            if (e.isSecret) {
              return `${key}: \${${e.key.toUpperCase().replace(/[.:-]/g, '_')}:}`;
            }
            return `${key}: ${e.value}`;
          })
          .join('\n')
      : '';

    const applicationYml = `server:
  port: \${PORT:8080}
  error:
    include-message: always
    include-binding-errors: always

spring:
  application:
    name: migrated-app
  datasource:
    url: ${dsUrl}
    username: \${DB_USERNAME:postgres}
    password: \${DB_PASSWORD:postgres}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    open-in-view: false
    properties:
      hibernate:
        format_sql: true
        jdbc:
          time_zone: UTC
  flyway:
    enabled: true
    locations: classpath:db/migration
${redisSection}
logging:
  level:
    root: INFO
    ${BASE_PACKAGE}: DEBUG
    org.springframework.security: WARN
    org.hibernate.SQL: WARN
${actuatorSection}${jwtSection}${extraEntriesYml}
`;

    files.push({
      relativePath: `${RES_ROOT}/application.yml`,
      content: applicationYml,
      overwrite: true,
    });

    const testYml = `# Test configuration — overrides application.yml during testing
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: create-drop
    database-platform: org.hibernate.dialect.H2Dialect
  flyway:
    enabled: false

logging:
  level:
    root: WARN
    ${BASE_PACKAGE}: DEBUG
`;

    files.push({
      relativePath: `${RES_ROOT}/application-test.yml`,
      content: testYml,
      overwrite: true,
    });

    return files;
  }

  generateScaffold(ctx: GenerationContext): GeneratedFile[] {
    const files: GeneratedFile[] = [
      generateGlobalExceptionHandler(),
      generateResourceNotFoundException(),
      generateBadRequestException(),
    ];

    const isClean = ctx.architecture === 'clean' || ctx.architecture === 'ddd';
    const isDdd = ctx.architecture === 'ddd';

    if (isClean) {
      files.push(generateUseCaseInterface());
      files.push(generateResultMonad());
    }

    if (isDdd) {
      files.push(generateBaseEntity());
      files.push(generateAggregateRoot());
      files.push(generateValueObjectBase());
      files.push(generateDomainEventInterface());
    }

    return files;
  }
}
