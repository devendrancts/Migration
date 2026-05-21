import type { TargetTestFramework, GenerationContext } from '../target-platform.interface.js';
import type { IRArtifact, IRController, IRService, IRModel, IRRepository, IRAction } from '../../ir/types.js';
import type { GeneratedFile } from '../../types/common.js';

export class JavaTestFramework implements TargetTestFramework {
  readonly name = 'junit5';

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
    return [generateIntegrationTestFile(controllers)];
  }

  generatePerformanceTest(artifacts: IRArtifact[], _ctx: GenerationContext): GeneratedFile[] {
    const controllers = artifacts.filter((a): a is IRController => a.kind === 'controller');
    return [generatePerformanceTestFile(controllers)];
  }

  generateTestConfig(_ctx: GenerationContext): GeneratedFile[] {
    const applicationTestYml = `spring:
  datasource:
    url: jdbc:h2:mem:testdb
    driver-class-name: org.h2.Driver
    username: sa
    password:
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
`;

    return [
      {
        relativePath: 'src/test/resources/application-test.yml',
        content: applicationTestYml,
        overwrite: true,
      },
    ];
  }
}

// ── Controller Unit Test ──

function generateControllerUnitTest(controller: IRController): GeneratedFile {
  const name = toPascalCase(controller.name.replace(/Controller$/i, ''));
  const className = `${name}Controller`;

  const testMethods = controller.actions.map((action) => {
    const methodName = toCamelCase(action.name);
    const httpMethod = mapHttpMethod(action.httpMethod);
    const fullPath = normalizePath(controller.basePath, action.path);
    return [
      `    @Test`,
      `    void ${methodName}_shouldRespond() throws Exception {`,
      `        mockMvc.perform(${httpMethod}("${fullPath}"))`,
      `            .andExpect(status().isOk());`,
      `    }`,
    ].join('\n');
  });

  const content = [
    `package com.app.controller;`,
    ``,
    `import org.junit.jupiter.api.Test;`,
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;`,
    `import org.springframework.test.web.servlet.MockMvc;`,
    `import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;`,
    `import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;`,
    ``,
    `@WebMvcTest(${className}.class)`,
    `class ${className}Test {`,
    `    @Autowired`,
    `    private MockMvc mockMvc;`,
    ``,
    testMethods.join('\n\n'),
    `}`,
    ``,
  ].join('\n');

  return {
    relativePath: `src/test/java/com/app/controller/${className}Test.java`,
    content,
    overwrite: true,
  };
}

// ── Service Unit Test ──

function generateServiceUnitTest(service: IRService): GeneratedFile {
  const name = toPascalCase(service.name.replace(/Service$/i, ''));
  const implClassName = `${name}ServiceImpl`;

  const mockFields = service.dependencies.map((dep) => {
    const depType = toPascalCase(dep.interfaceName.replace(/^I/, ''));
    const depName = toCamelCase(dep.interfaceName.replace(/^I/, ''));
    return `    @Mock\n    private ${depType} ${depName};`;
  });

  const testMethods = service.methods
    .filter((m) => m.accessModifier === 'public')
    .map((method) => {
      const methodName = toCamelCase(method.name);
      const dummyArgs = method.parameters
        .filter((p) => p.source !== 'injected')
        .map((p) => getDummyJavaValue(mapJavaType(p.type.name)))
        .join(', ');
      return [
        `    @Test`,
        `    void ${methodName}_shouldThrowNotImplemented() {`,
        `        assertThrows(UnsupportedOperationException.class, () -> service.${methodName}(${dummyArgs}));`,
        `    }`,
      ].join('\n');
    });

  const content = [
    `package com.app.service;`,
    ``,
    `import org.junit.jupiter.api.Test;`,
    `import org.junit.jupiter.api.extension.ExtendWith;`,
    `import org.mockito.InjectMocks;`,
    `import org.mockito.Mock;`,
    `import org.mockito.junit.jupiter.MockitoExtension;`,
    `import static org.junit.jupiter.api.Assertions.*;`,
    ``,
    `@ExtendWith(MockitoExtension.class)`,
    `class ${implClassName}Test {`,
    ...(mockFields.length > 0 ? [mockFields.join('\n'), ``] : []),
    `    @InjectMocks`,
    `    private ${implClassName} service;`,
    ``,
    testMethods.join('\n\n'),
    `}`,
    ``,
  ].join('\n');

  return {
    relativePath: `src/test/java/com/app/service/${implClassName}Test.java`,
    content,
    overwrite: true,
  };
}

// ── Model Unit Test ──

function generateModelUnitTest(model: IRModel): GeneratedFile {
  const name = toPascalCase(model.name);
  const firstThreeProps = model.properties.slice(0, 3);

  const setterGetterLines = firstThreeProps.flatMap((prop) => {
    const propName = toPascalCase(prop.name);
    const javaType = mapJavaType(prop.type.name);
    const dummy = getDummyJavaValue(javaType);
    return [
      `        entity.set${propName}(${dummy});`,
      `        assertEquals(${dummy}, entity.get${propName}());`,
    ];
  });

  const content = [
    `package com.app.model;`,
    ``,
    `import org.junit.jupiter.api.Test;`,
    `import static org.junit.jupiter.api.Assertions.*;`,
    ``,
    `class ${name}Test {`,
    `    @Test`,
    `    void shouldCreateInstance() {`,
    `        ${name} entity = new ${name}();`,
    `        assertNotNull(entity);`,
    `    }`,
    ``,
    `    @Test`,
    `    void shouldSetAndGetFields() {`,
    `        ${name} entity = new ${name}();`,
    ...setterGetterLines,
    `    }`,
    `}`,
    ``,
  ].join('\n');

  return {
    relativePath: `src/test/java/com/app/model/${name}Test.java`,
    content,
    overwrite: true,
  };
}

// ── Repository Unit Test ──

function generateRepositoryUnitTest(repository: IRRepository): GeneratedFile {
  const name = toPascalCase(repository.name.replace(/Repository$/i, ''));
  const repoClassName = `${name}Repository`;

  const content = [
    `package com.app.repository;`,
    ``,
    `import org.junit.jupiter.api.Test;`,
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;`,
    `import static org.junit.jupiter.api.Assertions.*;`,
    ``,
    `@DataJpaTest`,
    `class ${repoClassName}Test {`,
    `    @Autowired`,
    `    private ${repoClassName} repository;`,
    ``,
    `    @Test`,
    `    void shouldBeInjected() {`,
    `        assertNotNull(repository);`,
    `    }`,
    `}`,
    ``,
  ].join('\n');

  return {
    relativePath: `src/test/java/com/app/repository/${repoClassName}Test.java`,
    content,
    overwrite: true,
  };
}

// ── Integration Test ──

function generateIntegrationTestFile(controllers: IRController[]): GeneratedFile {
  const controllerTests = controllers.flatMap((controller) =>
    controller.actions.map((action) => {
      const controllerSnake = toSnakeCase(controller.name.replace(/Controller$/i, ''));
      const actionName = toCamelCase(action.name);
      const httpMethod = mapHttpMethod(action.httpMethod);
      const fullPath = normalizePath(controller.basePath, action.path);
      return [
        `    @Test`,
        `    void ${controllerSnake}_${actionName}_shouldRespond() throws Exception {`,
        `        mockMvc.perform(${httpMethod}("${fullPath}")`,
        `                .contentType("application/json"))`,
        `            .andReturn();`,
        `        // Endpoint exists and does not throw 500`,
        `    }`,
      ].join('\n');
    }),
  );

  const content = [
    `package com.app;`,
    ``,
    `import org.junit.jupiter.api.Test;`,
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;`,
    `import org.springframework.boot.test.context.SpringBootTest;`,
    `import org.springframework.test.context.ActiveProfiles;`,
    `import org.springframework.test.web.servlet.MockMvc;`,
    `import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;`,
    `import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;`,
    ``,
    `@SpringBootTest`,
    `@AutoConfigureMockMvc`,
    `@ActiveProfiles("test")`,
    `class IntegrationTest {`,
    `    @Autowired`,
    `    private MockMvc mockMvc;`,
    ``,
    `    @Test`,
    `    void contextLoads() {}`,
    ``,
    `    @Test`,
    `    void healthEndpoint_shouldReturnOk() throws Exception {`,
    `        mockMvc.perform(get("/actuator/health"))`,
    `            .andExpect(status().isOk());`,
    `    }`,
    ...(controllerTests.length > 0 ? [``, controllerTests.join('\n\n')] : []),
    `}`,
    ``,
  ].join('\n');

  return {
    relativePath: 'src/test/java/com/app/IntegrationTest.java',
    content,
    overwrite: true,
  };
}

// ── Performance Test ──

function generatePerformanceTestFile(controllers: IRController[]): GeneratedFile {
  const getActions: { controller: IRController; action: IRAction }[] = controllers.flatMap(
    (controller) =>
      controller.actions
        .filter((action) => action.httpMethod === 'GET')
        .map((action) => ({ controller, action })),
  );

  const performanceTests = getActions.map(({ controller, action }) => {
    const actionName = toCamelCase(action.name);
    const fullPath = normalizePath(controller.basePath, action.path);
    return [
      `    @Test`,
      `    void ${actionName}_performance() throws Exception {`,
      `        Instant start = Instant.now();`,
      `        for (int i = 0; i < 50; i++) {`,
      `            mockMvc.perform(get("${fullPath}"));`,
      `        }`,
      `        Duration elapsed = Duration.between(start, Instant.now());`,
      `        assertTrue(elapsed.toMillis() < 15_000, "50 requests should complete within 15s");`,
      `    }`,
    ].join('\n');
  });

  const content = [
    `package com.app;`,
    ``,
    `import org.junit.jupiter.api.Test;`,
    `import org.springframework.beans.factory.annotation.Autowired;`,
    `import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;`,
    `import org.springframework.boot.test.context.SpringBootTest;`,
    `import org.springframework.test.context.ActiveProfiles;`,
    `import org.springframework.test.web.servlet.MockMvc;`,
    `import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;`,
    `import java.time.Duration;`,
    `import java.time.Instant;`,
    `import static org.junit.jupiter.api.Assertions.*;`,
    ``,
    `@SpringBootTest`,
    `@AutoConfigureMockMvc`,
    `@ActiveProfiles("test")`,
    `class PerformanceTest {`,
    `    @Autowired`,
    `    private MockMvc mockMvc;`,
    ``,
    `    @Test`,
    `    void healthEndpoint_respondsWithin100ms() throws Exception {`,
    `        Instant start = Instant.now();`,
    `        for (int i = 0; i < 100; i++) {`,
    `            mockMvc.perform(get("/actuator/health"));`,
    `        }`,
    `        Duration elapsed = Duration.between(start, Instant.now());`,
    `        assertTrue(elapsed.toMillis() < 10_000, "100 health checks should complete within 10s");`,
    `    }`,
    ...(performanceTests.length > 0 ? [``, performanceTests.join('\n\n')] : []),
    `}`,
    ``,
  ].join('\n');

  return {
    relativePath: 'src/test/java/com/app/PerformanceTest.java',
    content,
    overwrite: true,
  };
}

// ── Helpers ──

function splitWords(name: string): string[] {
  // Handle PascalCase, camelCase, snake_case, kebab-case
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function toPascalCase(name: string): string {
  return splitWords(name)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toCamelCase(name: string): string {
  const words = splitWords(name);
  if (words.length === 0) return name;
  return (
    words[0].charAt(0).toLowerCase() +
    words[0].slice(1) +
    words
      .slice(1)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
  );
}

function toSnakeCase(name: string): string {
  return splitWords(name)
    .map((w) => w.toLowerCase())
    .join('_');
}

function mapHttpMethod(httpMethod: string): string {
  const map: Record<string, string> = {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    DELETE: 'delete',
    PATCH: 'patch',
  };
  return map[httpMethod.toUpperCase()] ?? 'get';
}

function normalizePath(basePath: string, actionPath: string): string {
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const path = actionPath.startsWith('/') ? actionPath : `/${actionPath}`;
  return path === '/' ? base || '/' : `${base}${path}`;
}

function mapJavaType(typeName: string): string {
  const map: Record<string, string> = {
    string: 'String',
    String: 'String',
    int: 'int',
    Int32: 'int',
    Integer: 'Integer',
    long: 'long',
    Int64: 'long',
    Long: 'Long',
    bool: 'boolean',
    Boolean: 'boolean',
    double: 'double',
    Double: 'Double',
    float: 'float',
    Float: 'Float',
    decimal: 'BigDecimal',
    Decimal: 'BigDecimal',
    DateTime: 'LocalDateTime',
    DateTimeOffset: 'LocalDateTime',
    Guid: 'UUID',
    object: 'Object',
    void: 'void',
  };
  return map[typeName] ?? typeName;
}

function getDummyJavaValue(javaType: string): string {
  const map: Record<string, string> = {
    String: '"test"',
    int: '0',
    Integer: '0',
    long: '0L',
    Long: '0L',
    boolean: 'false',
    Boolean: 'false',
    double: '0.0',
    Double: '0.0',
    float: '0.0f',
    Float: '0.0f',
    BigDecimal: 'BigDecimal.ZERO',
    LocalDateTime: 'LocalDateTime.now()',
    UUID: 'UUID.randomUUID()',
    Object: 'new Object()',
  };
  return map[javaType] ?? 'null';
}
