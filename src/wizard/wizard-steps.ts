import type { WizardStep, WizardStepDefinition } from './wizard-types.js';
import type { WizardSession } from './wizard-session.js';

export function getStepDefinition(
  step: WizardStep,
  session?: WizardSession,
): WizardStepDefinition {
  switch (step) {
    case 'source_analysis':
      return {
        step: 'source_analysis',
        title: 'Source Analysis',
        description:
          'Analyze the source .NET project to detect framework version, patterns, and dependencies.',
        nextStep: 'choose_target_platform',
        previousStep: null,
      };

    case 'choose_target_platform':
      return {
        step: 'choose_target_platform',
        title: 'Choose Target Platform',
        description: 'Select the target platform to migrate to.',
        choices: [
          {
            value: 'nodejs-express',
            label: 'Node.js + Express (TypeScript)',
            description:
              'Modern TypeScript backend with Express, Prisma ORM, and Vitest.',
            isRecommended: true,
          },
          {
            value: 'java-spring',
            label: 'Java Spring Boot',
            description:
              'Enterprise Java with Spring Boot, Spring Data JPA, and JUnit 5.',
            isRecommended: false,
          },
          {
            value: 'python-fastapi',
            label: 'Python FastAPI',
            description:
              'High-performance Python API with FastAPI, SQLAlchemy, and Pytest.',
            isRecommended: false,
          },
          {
            value: 'rust-actix',
            label: 'Rust Actix Web',
            description:
              'Blazing-fast Rust backend with Actix Web and Diesel ORM.',
            isRecommended: false,
          },
        ],
        nextStep: 'choose_architecture',
        previousStep: 'source_analysis',
      };

    case 'choose_architecture':
      return {
        step: 'choose_architecture',
        title: 'Choose Architecture',
        description: 'Select the architecture pattern for the migrated project.',
        choices: [
          {
            value: 'mvc',
            label: 'MVC (Model-View-Controller)',
            description:
              'Simple layered architecture. Best for small to medium projects.',
            isRecommended: false,
          },
          {
            value: 'clean',
            label: 'Clean Architecture',
            description:
              'Onion/hexagonal style with use cases. Good for medium-large projects.',
            isRecommended: false,
          },
          {
            value: 'ddd',
            label: 'Domain-Driven Design',
            description:
              'Full DDD with bounded contexts, aggregates, and CQRS. Best for complex domains.',
            isRecommended: false,
          },
        ],
        nextStep: 'choose_target_options',
        previousStep: 'choose_target_platform',
      };

    case 'choose_target_options':
      return {
        step: 'choose_target_options',
        title: 'Target Platform Options',
        description:
          'Configure target-specific options such as ORM, validation, auth, and DI. Options are dynamic based on the selected target platform plugin.',
        nextStep: 'architecture_options',
        previousStep: 'choose_architecture',
      };

    case 'architecture_options':
      return {
        step: 'architecture_options',
        title: 'Architecture Options',
        description:
          'Configure architecture-specific options (e.g., CQRS, domain events for DDD).',
        nextStep: 'choose_testing',
        previousStep: 'choose_target_options',
      };

    case 'choose_testing':
      return {
        step: 'choose_testing',
        title: 'Choose Testing Options',
        description: 'Configure test generation and coverage settings.',
        choices: [
          {
            value: 'unit_yes',
            label: 'Unit Tests: Enabled',
            description: 'Generate unit tests for all migrated services and controllers.',
            isRecommended: true,
          },
          {
            value: 'unit_no',
            label: 'Unit Tests: Disabled',
            description: 'Skip unit test generation.',
            isRecommended: false,
          },
          {
            value: 'coverage_80',
            label: 'Coverage Target: 80%',
            description: 'Aim for 80% code coverage with the build-heal loop.',
            isRecommended: true,
          },
          {
            value: 'integration_yes',
            label: 'Integration Tests: Enabled',
            description: 'Generate integration tests for API endpoints and database access.',
            isRecommended: true,
          },
          {
            value: 'integration_no',
            label: 'Integration Tests: Disabled',
            description: 'Skip integration test generation.',
            isRecommended: false,
          },
          {
            value: 'perf_no',
            label: 'Performance Tests: Disabled',
            description: 'Skip performance test generation.',
            isRecommended: true,
          },
        ],
        nextStep: 'choose_output',
        previousStep: 'architecture_options',
      };

    case 'choose_output':
      return {
        step: 'choose_output',
        title: 'Choose Output Directory',
        description:
          'Specify the output directory where the migrated project will be written.',
        nextStep: 'review_config',
        previousStep: 'choose_testing',
      };

    case 'review_config':
      return {
        step: 'review_config',
        title: 'Review Configuration',
        description:
          'Review all selected options before starting the migration.',
        nextStep: null,
        previousStep: 'choose_output',
      };
  }
}
