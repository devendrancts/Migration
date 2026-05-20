import type { TargetDependencyManager, GenerationContext } from '../target-platform.interface.js';
import type { GeneratedFile, PackageDependency } from '../../types/common.js';

export class JavaDependencyManager implements TargetDependencyManager {
  readonly packageManager = 'maven';
  readonly lockFileName = '';

  generateManifest(
    dependencies: PackageDependency[],
    projectName: string,
    _ctx: GenerationContext,
  ): GeneratedFile {
    const runtimeDeps = dependencies.filter((d) => d.scope === 'runtime');
    const devDeps = dependencies.filter((d) => d.scope === 'dev');

    const depXml = runtimeDeps.map((d) => depToXml(d)).join('\n');
    const devDepXml = devDeps.map((d) => depToXml(d, true)).join('\n');

    const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
        <relativePath/>
    </parent>

    <groupId>com.app</groupId>
    <artifactId>${projectName}</artifactId>
    <version>1.0.0</version>
    <name>${projectName}</name>
    <description>Migrated from .NET</description>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
${depXml}
${devDepXml}
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`;

    return {
      relativePath: 'pom.xml',
      content: pomXml,
      overwrite: true,
    };
  }

  getInstallCommand(): string {
    return 'mvn dependency:resolve';
  }

  getBuildCommand(): string {
    return 'mvn compile';
  }

  getTestCommand(): string {
    return 'mvn test';
  }
}

function depToXml(dep: PackageDependency, isTest = false): string {
  const groupArtifact = resolveGroupArtifact(dep.name);
  const scope = isTest ? '\n            <scope>test</scope>' : '';
  const version = dep.version ? `\n            <version>${dep.version}</version>` : '';

  return `        <dependency>
            <groupId>${groupArtifact.groupId}</groupId>
            <artifactId>${groupArtifact.artifactId}</artifactId>${version}${scope}
        </dependency>`;
}

function resolveGroupArtifact(name: string): { groupId: string; artifactId: string } {
  if (name.startsWith('spring-boot-starter')) {
    return { groupId: 'org.springframework.boot', artifactId: name };
  }
  if (name === 'lombok') {
    return { groupId: 'org.projectlombok', artifactId: 'lombok' };
  }
  if (name === 'postgresql') {
    return { groupId: 'org.postgresql', artifactId: 'postgresql' };
  }
  if (name.startsWith('jjwt-')) {
    return { groupId: 'io.jsonwebtoken', artifactId: name };
  }
  if (name === 'springdoc-openapi-starter-webmvc-ui') {
    return { groupId: 'org.springdoc', artifactId: name };
  }
  if (name === 'testng') {
    return { groupId: 'org.testng', artifactId: 'testng' };
  }
  if (name === 'hibernate-core') {
    return { groupId: 'org.hibernate.orm', artifactId: 'hibernate-core' };
  }
  if (name === 'mybatis-spring-boot-starter') {
    return { groupId: 'org.mybatis.spring.boot', artifactId: name };
  }
  return { groupId: 'com.app', artifactId: name };
}
