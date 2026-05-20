import type { TargetTestFramework, GenerationContext } from '../target-platform.interface.js';
import type { IRArtifact } from '../../ir/types.js';
import type { GeneratedFile } from '../../types/common.js';

export class JavaTestFramework implements TargetTestFramework {
  readonly name = 'junit5';

  generateUnitTest(_artifact: IRArtifact, _ctx: GenerationContext): GeneratedFile[] {
    // TODO: Generate JUnit 5 unit tests with Mockito
    return [];
  }

  generateIntegrationTest(_artifacts: IRArtifact[], _ctx: GenerationContext): GeneratedFile[] {
    // TODO: Generate @SpringBootTest integration tests with @WebMvcTest
    return [];
  }

  generatePerformanceTest(_artifacts: IRArtifact[], _ctx: GenerationContext): GeneratedFile[] {
    // TODO: Generate JMH benchmarks or Gatling load tests
    return [];
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
