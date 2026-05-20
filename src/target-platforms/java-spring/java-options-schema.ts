import type { TargetOptionsSchema, TargetOption } from '../target-platform.interface.js';
import type { ArchitectureType } from '../../types/migration.js';
import type { PackageDependency } from '../../types/common.js';

export class JavaOptionsSchema implements TargetOptionsSchema {
  readonly ormOptions: TargetOption[] = [
    {
      value: 'spring-data-jpa',
      label: 'Spring Data JPA',
      description: 'Repository abstraction over JPA with Hibernate',
      isDefault: true,
      additionalDependencies: [
        { name: 'spring-boot-starter-data-jpa', version: '', scope: 'runtime', packageManager: 'maven' },
        { name: 'postgresql', version: '', scope: 'runtime', packageManager: 'maven' },
      ],
    },
    {
      value: 'hibernate',
      label: 'Hibernate (direct)',
      description: 'Full Hibernate ORM without Spring Data abstraction',
      isDefault: false,
      additionalDependencies: [
        { name: 'hibernate-core', version: '6.4.0.Final', scope: 'runtime', packageManager: 'maven' },
      ],
    },
    {
      value: 'mybatis',
      label: 'MyBatis',
      description: 'SQL mapper framework with XML or annotation-based mapping',
      isDefault: false,
      additionalDependencies: [
        { name: 'mybatis-spring-boot-starter', version: '3.0.3', scope: 'runtime', packageManager: 'maven' },
      ],
    },
    {
      value: 'jooq',
      label: 'jOOQ',
      description: 'Type-safe SQL query builder with code generation',
      isDefault: false,
      additionalDependencies: [
        { name: 'spring-boot-starter-jooq', version: '', scope: 'runtime', packageManager: 'maven' },
      ],
    },
  ];

  readonly validationOptions: TargetOption[] = [
    {
      value: 'bean-validation',
      label: 'Bean Validation (Jakarta)',
      description: 'Standard Jakarta Bean Validation with Hibernate Validator',
      isDefault: true,
      additionalDependencies: [
        { name: 'spring-boot-starter-validation', version: '', scope: 'runtime', packageManager: 'maven' },
      ],
    },
    {
      value: 'custom',
      label: 'Custom',
      description: 'Custom validation logic without framework',
      isDefault: false,
      additionalDependencies: [],
    },
  ];

  readonly authOptions: TargetOption[] = [
    {
      value: 'spring-security-jwt',
      label: 'Spring Security + JWT',
      description: 'JWT-based authentication with Spring Security',
      isDefault: true,
      additionalDependencies: [
        { name: 'spring-boot-starter-security', version: '', scope: 'runtime', packageManager: 'maven' },
        { name: 'jjwt-api', version: '0.12.5', scope: 'runtime', packageManager: 'maven' },
        { name: 'jjwt-impl', version: '0.12.5', scope: 'runtime', packageManager: 'maven' },
        { name: 'jjwt-jackson', version: '0.12.5', scope: 'runtime', packageManager: 'maven' },
      ],
    },
    {
      value: 'spring-security-oauth2',
      label: 'Spring Security + OAuth2',
      description: 'OAuth2 / OpenID Connect resource server',
      isDefault: false,
      additionalDependencies: [
        { name: 'spring-boot-starter-security', version: '', scope: 'runtime', packageManager: 'maven' },
        { name: 'spring-boot-starter-oauth2-resource-server', version: '', scope: 'runtime', packageManager: 'maven' },
      ],
    },
    {
      value: 'custom',
      label: 'Custom',
      description: 'Custom security filter implementation',
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
      value: 'spring-di',
      label: 'Spring DI (built-in)',
      description: 'Spring Framework dependency injection via @Component/@Service/@Repository',
      isDefault: true,
      additionalDependencies: [],
    },
  ];

  readonly testFrameworkOptions: TargetOption[] = [
    {
      value: 'junit5',
      label: 'JUnit 5',
      description: 'Modern Java testing framework with @SpringBootTest support',
      isDefault: true,
      additionalDependencies: [
        { name: 'spring-boot-starter-test', version: '', scope: 'dev', packageManager: 'maven' },
      ],
    },
    {
      value: 'testng',
      label: 'TestNG',
      description: 'Testing framework inspired by JUnit with additional features',
      isDefault: false,
      additionalDependencies: [
        { name: 'testng', version: '7.9.0', scope: 'dev', packageManager: 'maven' },
      ],
    },
  ];

  readonly apiDocsOptions: TargetOption[] = [
    {
      value: 'springdoc',
      label: 'SpringDoc OpenAPI',
      description: 'OpenAPI 3.0 documentation with Swagger UI for Spring Boot',
      isDefault: true,
      additionalDependencies: [
        { name: 'springdoc-openapi-starter-webmvc-ui', version: '2.3.0', scope: 'runtime', packageManager: 'maven' },
      ],
    },
    {
      value: 'none',
      label: 'None',
      description: 'No API documentation',
      isDefault: false,
      additionalDependencies: [],
    },
  ];

  getBaseDependencies(_architecture: ArchitectureType): PackageDependency[] {
    return [
      { name: 'spring-boot-starter-web', version: '', scope: 'runtime', packageManager: 'maven' },
      { name: 'spring-boot-starter-actuator', version: '', scope: 'runtime', packageManager: 'maven' },
      { name: 'lombok', version: '', scope: 'dev', packageManager: 'maven' },
      { name: 'spring-boot-devtools', version: '', scope: 'dev', packageManager: 'maven' },
      { name: 'spring-boot-starter-test', version: '', scope: 'dev', packageManager: 'maven' },
    ];
  }

  validateOptions(options: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (options['platform'] !== 'java-spring') {
      errors.push(`Expected platform 'java-spring', got '${String(options['platform'])}'`);
    }
    return { valid: errors.length === 0, errors };
  }
}
