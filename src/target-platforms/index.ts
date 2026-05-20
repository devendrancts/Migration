import { TargetPlatformRegistry } from './target-platform-registry.js';
import { NodeJsExpressPlatform } from './nodejs-express/index.js';
import { JavaSpringPlatform } from './java-spring/index.js';
import { PythonFastApiPlatform } from './python-fastapi/index.js';

export function createTargetPlatformRegistry(): TargetPlatformRegistry {
  const registry = new TargetPlatformRegistry();
  registry.register(new NodeJsExpressPlatform());
  registry.register(new JavaSpringPlatform());
  registry.register(new PythonFastApiPlatform());
  return registry;
}
