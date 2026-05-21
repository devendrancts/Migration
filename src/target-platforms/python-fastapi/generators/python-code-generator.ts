import type { TargetCodeGenerator, GenerationContext } from '../../target-platform.interface.js';
import type {
  IRArtifact,
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
  IRTypeRef,
  IRProperty,
  IRParameter,
  IRMethod,
  IRValidationRule,
} from '../../../ir/types.js';
import type { GeneratedFile } from '../../../types/common.js';

export class PythonCodeGenerator implements TargetCodeGenerator {
  generateFromArtifact(artifact: IRArtifact, ctx: GenerationContext): GeneratedFile[] {
    switch (artifact.kind) {
      case 'controller':
        return this.generateController(artifact, ctx);
      case 'model':
        return this.generateModel(artifact, ctx);
      case 'service':
        return this.generateService(artifact, ctx);
      case 'repository':
        return this.generateRepository(artifact, ctx);
      case 'middleware':
        return this.generateMiddleware(artifact, ctx);
      case 'config':
        return this.generateConfig(artifact, ctx);
      case 'auth':
        return this.generateAuth(artifact, ctx);
      case 'route':
        return this.generateRoute(artifact, ctx);
      case 'validation-schema':
        return this.generateValidationSchema(artifact, ctx);
      case 'di-registration':
        return this.generateDiRegistration(artifact, ctx);
      case 'domain-event':
        return this.generateDomainEvent(artifact, ctx);
      case 'value-object':
        return this.generateValueObject(artifact, ctx);
      case 'enum':
        return this.generateEnum(artifact, ctx);
      case 'mapper':
        return this.generateMapper(artifact, ctx);
      case 'use-case-or-handler':
        return this.generateUseCaseOrHandler(artifact, ctx);
      case 'signalr-hub':
        return this.generateSignalRHub(artifact, ctx);
      case 'background-job':
        return this.generateBackgroundJob(artifact, ctx);
      case 'cache-usage':
        return this.generateCacheUsage(artifact, ctx);
      case 'logging-config':
        return this.generateLoggingConfig(artifact, ctx);
      case 'health-check':
        return this.generateHealthCheck(artifact, ctx);
      case 'cors-config':
        return this.generateCorsConfig(artifact, ctx);
      case 'api-versioning':
        return this.generateApiVersioning(artifact, ctx);
      case 'swagger-config':
        return this.generateSwaggerConfig(artifact, ctx);
      case 'rate-limiting':
        return this.generateRateLimiting(artifact, ctx);
      case 'stored-procedure':
        return this.generateStoredProcedure(artifact, ctx);
      case 'db-migration':
        return this.generateDbMigration(artifact, ctx);
      case 'nuget-mapping':
        return this.generateNuGetMapping(artifact, ctx);
      case 'razor-view':
        return this.generateRazorView(artifact, ctx);
      default:
        return [];
    }
  }

  // ── Controller ──

  private generateController(artifact: IRController, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const routerVarName = `${snakeName}_router`;

    const hasAuth = artifact.actions.some((a) => a.authRequired);

    const imports: string[] = [
      'from fastapi import APIRouter, Depends, Query, Path, Body, Header, HTTPException, status',
    ];
    if (hasAuth) {
      imports.push('from app.core.security import get_current_user');
    }

    const actionLines: string[] = [];

    for (const action of artifact.actions) {
      const methodDecorator = action.httpMethod.toLowerCase();
      const actionPath = action.path === '' ? '/' : action.path;

      const paramParts: string[] = [];

      for (const param of action.parameters) {
        if (param.source === 'injected') continue;
        const pyType = mapPythonType(param.type);
        const defaultExpr = buildParamDefault(param);
        paramParts.push(`${toSnakeCase(param.name)}: ${pyType} = ${defaultExpr}`);
      }

      if (action.authRequired) {
        paramParts.push('current_user: str = Depends(get_current_user)');
      }

      const paramSignature = paramParts.length > 0 ? paramParts.join(', ') : '';
      const asyncKeyword = action.isAsync ? 'async ' : '';
      const funcName = toSnakeCase(action.name);
      const returnPyType = mapPythonType(action.returnType);

      actionLines.push(`@${routerVarName}.${methodDecorator}("${actionPath}")`);
      if (returnPyType !== 'None') {
        actionLines.push(
          `${asyncKeyword}def ${funcName}(${paramSignature}) -> ${returnPyType}:`,
        );
      } else {
        actionLines.push(
          `${asyncKeyword}def ${funcName}(${paramSignature}):`,
        );
      }
      if (action.description) {
        actionLines.push(`    """${action.description}"""`);
      }
      actionLines.push(
        `    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="${funcName} not yet implemented")`,
      );
      actionLines.push('');
    }

    const basePath = artifact.basePath.startsWith('/') ? artifact.basePath : `/${artifact.basePath}`;

    const content = `${imports.join('\n')}

${routerVarName} = APIRouter(prefix="${basePath}", tags=["${artifact.name}"])


${actionLines.join('\n')}`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/routers/${snakeName}_router.py`,
        content,
        overwrite: true,
      },
      {
        relativePath: `app/routers/__init__.py`,
        content: '',
        overwrite: false,
      },
    ];
  }

  // ── Model ──

  private generateModel(artifact: IRModel, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const files: GeneratedFile[] = [];
    const isEntity = artifact.role === 'entity' || artifact.role === 'aggregate-root';

    if (isEntity) {
      const tableName =
        artifact.tableMapping?.tableName ?? `${snakeName}s`;

      const columnLines: string[] = [];
      const columnImportTypes = new Set<string>(['Column', 'Integer', 'String']);

      for (const prop of artifact.properties) {
        if (prop.isStatic) continue;
        const colDef = mapSqlAlchemyColumn(prop, artifact.tableMapping);
        if (colDef.importTypes) colDef.importTypes.forEach((t) => columnImportTypes.add(t));
        columnLines.push(`    ${toSnakeCase(prop.name)} = ${colDef.definition}`);
      }

      const relationshipLines: string[] = [];
      for (const rel of artifact.relationships) {
        const targetSnake = toSnakeCase(rel.targetEntity);
        const propSnake = toSnakeCase(rel.navigationProperty);
        if (rel.type === 'one-to-many') {
          relationshipLines.push(
            `    ${propSnake} = relationship("${rel.targetEntity}", back_populates="${toSnakeCase(artifact.name)}s", cascade="all, delete-orphan")`,
          );
        } else if (rel.type === 'many-to-one') {
          if (rel.foreignKey) {
            columnLines.push(
              `    ${toSnakeCase(rel.foreignKey)} = Column(Integer, ForeignKey("${targetSnake}s.id"))`,
            );
            columnImportTypes.add('ForeignKey');
          }
          relationshipLines.push(
            `    ${propSnake} = relationship("${rel.targetEntity}", back_populates="${toSnakeCase(artifact.name)}s")`,
          );
        } else if (rel.type === 'one-to-one') {
          if (rel.foreignKey) {
            columnLines.push(
              `    ${toSnakeCase(rel.foreignKey)} = Column(Integer, ForeignKey("${targetSnake}s.id"), unique=True)`,
            );
            columnImportTypes.add('ForeignKey');
          }
          relationshipLines.push(
            `    ${propSnake} = relationship("${rel.targetEntity}", uselist=False, back_populates="${toSnakeCase(artifact.name)}")`,
          );
        } else if (rel.type === 'many-to-many') {
          relationshipLines.push(
            `    ${propSnake} = relationship("${rel.targetEntity}", secondary="${toSnakeCase(artifact.name)}_${targetSnake}", back_populates="${toSnakeCase(artifact.name)}s")`,
          );
        }
      }

      const saImports = Array.from(columnImportTypes).join(', ');

      const sqlalchemyContent = `from sqlalchemy import ${saImports}
from sqlalchemy.orm import relationship, DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class ${artifact.name}(Base):
    __tablename__ = "${tableName}"

    id = Column(Integer, primary_key=True, autoincrement=True)
${columnLines.join('\n')}
${relationshipLines.length > 0 ? '\n' + relationshipLines.join('\n') : ''}
`.trimEnd() + '\n';

      files.push({
        relativePath: `app/models/${snakeName}.py`,
        content: sqlalchemyContent,
        overwrite: true,
      });
    }

    // Pydantic schema (for all model roles)
    const schemaFields: string[] = [];
    const schemaImports = new Set<string>(['from pydantic import BaseModel, ConfigDict']);

    for (const prop of artifact.properties) {
      if (prop.isStatic) continue;
      const pyType = mapPythonType(prop.type);
      if (pyType === 'datetime') schemaImports.add('from datetime import datetime');
      if (pyType === 'UUID') schemaImports.add('from uuid import UUID');
      if (pyType === 'Decimal') schemaImports.add('from decimal import Decimal');

      const fieldName = toSnakeCase(prop.name);
      if (prop.defaultValue !== undefined) {
        schemaFields.push(`    ${fieldName}: ${pyType} = ${formatPythonDefault(prop.defaultValue, pyType)}`);
      } else if (prop.type.isOptional || prop.type.isNullable) {
        schemaFields.push(`    ${fieldName}: ${pyType} = None`);
      } else {
        schemaFields.push(`    ${fieldName}: ${pyType}`);
      }
    }

    const schemaClassName = isEntity ? `${artifact.name}Schema` : artifact.name;
    const configLine = isEntity ? '\n    model_config = ConfigDict(from_attributes=True)\n' : '';

    const schemaContent = `${Array.from(schemaImports).join('\n')}


class ${schemaClassName}(BaseModel):
${configLine}${schemaFields.length > 0 ? schemaFields.join('\n') : '    pass'}
`.trimEnd() + '\n';

    const schemaPath = isEntity
      ? `app/schemas/${snakeName}_schema.py`
      : `app/schemas/${snakeName}_schema.py`;

    files.push({
      relativePath: schemaPath,
      content: schemaContent,
      overwrite: true,
    });

    files.push({ relativePath: 'app/models/__init__.py', content: '', overwrite: false });
    files.push({ relativePath: 'app/schemas/__init__.py', content: '', overwrite: false });

    return files;
  }

  // ── Service ──

  private generateService(artifact: IRService, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);

    const constructorParams: string[] = ['self'];
    const constructorBody: string[] = [];
    const importLines: string[] = [];

    for (const dep of artifact.dependencies) {
      const depName = dep.interfaceName.startsWith('I')
        ? dep.interfaceName.slice(1)
        : dep.interfaceName;
      const depSnake = toSnakeCase(depName);
      constructorParams.push(`${depSnake}: "${depName}"`);
      constructorBody.push(`        self._${depSnake} = ${depSnake}`);
    }

    const methodLines: string[] = [];
    for (const method of artifact.methods) {
      const lines = renderMethod(method);
      methodLines.push(...lines);
      methodLines.push('');
    }

    const constructorBodyStr =
      constructorBody.length > 0 ? constructorBody.join('\n') : '        pass';

    const content = `${importLines.length > 0 ? importLines.join('\n') + '\n\n' : ''}

class ${artifact.name}Service:
    def __init__(${constructorParams.join(', ')}):
${constructorBodyStr}

${methodLines.join('\n')}`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/services/${snakeName}_service.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/services/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Repository ──

  private generateRepository(artifact: IRRepository, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const entitySnake = toSnakeCase(artifact.entity);
    const entityName = artifact.entity;

    const customMethodLines: string[] = [];
    for (const method of artifact.methods) {
      const lines = renderMethod(method);
      customMethodLines.push(...lines);
      customMethodLines.push('');
    }

    const content = `from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from app.models.${entitySnake} import ${entityName}


class ${artifact.name}Repository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def find_by_id(self, id: int) -> ${entityName} | None:
        result = await self._session.execute(select(${entityName}).where(${entityName}.id == id))
        return result.scalar_one_or_none()

    async def find_all(self) -> list[${entityName}]:
        result = await self._session.execute(select(${entityName}))
        return list(result.scalars().all())

    async def create(self, entity: ${entityName}) -> ${entityName}:
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def update(self, entity: ${entityName}) -> ${entityName}:
        merged = await self._session.merge(entity)
        await self._session.flush()
        return merged

    async def delete(self, id: int) -> None:
        await self._session.execute(delete(${entityName}).where(${entityName}.id == id))

${customMethodLines.join('\n')}`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/repositories/${snakeName}_repository.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/repositories/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Middleware ──

  private generateMiddleware(artifact: IRMiddleware, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const className = `${toPascalCase(artifact.name)}Middleware`;

    const configEntries = Object.entries(artifact.configuration)
      .map(([k, v]) => `        self.${toSnakeCase(k)} = ${JSON.stringify(v)}`)
      .join('\n');

    const configInit =
      configEntries.length > 0 ? `\n${configEntries}` : '';

    const typeComment = `# Middleware type: ${artifact.type}, scope: ${artifact.scope}, order: ${artifact.order}`;

    const content = `from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

${typeComment}


class ${className}(BaseHTTPMiddleware):
    def __init__(self, app, **kwargs):
        super().__init__(app)${configInit}

    async def dispatch(self, request: Request, call_next) -> Response:
        # Pre-processing: add custom logic before passing to next handler
        response = await call_next(request)
        # Post-processing: add custom logic before returning response
        return response
`;

    return [
      {
        relativePath: `app/middleware/${snakeName}_middleware.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/middleware/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Config ──

  private generateConfig(artifact: IRConfig, _ctx: GenerationContext): GeneratedFile[] {
    const settingsFields: string[] = [];
    const envLines: string[] = ['# Auto-generated from .NET configuration'];

    for (const entry of artifact.entries) {
      const fieldName = toSnakeCase(entry.key.replace(/[:.]/g, '_'));
      const envKey = entry.key.replace(/[:.]/g, '_').toUpperCase();
      const isSecret = entry.isSecret;

      if (entry.value === 'true' || entry.value === 'false') {
        settingsFields.push(`    ${fieldName}: bool = ${entry.value === 'true' ? 'True' : 'False'}`);
      } else if (/^\d+$/.test(entry.value)) {
        settingsFields.push(`    ${fieldName}: int = ${entry.value}`);
      } else {
        settingsFields.push(`    ${fieldName}: str = "${isSecret ? '' : entry.value}"`);
      }

      envLines.push(`${envKey}=${isSecret ? '' : entry.value}`);
    }

    for (const cs of artifact.connectionStrings) {
      const fieldName = `${toSnakeCase(cs.name)}_connection_string`;
      const envKey = `${cs.name.toUpperCase()}_CONNECTION_STRING`;
      settingsFields.push(`    ${fieldName}: str = ""`);
      envLines.push(`${envKey}=${cs.connectionString}`);
    }

    const content = `from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app"
    secret_key: str = "change-me-in-production"
    debug: bool = True
${settingsFields.join('\n')}

    model_config = ConfigDict(env_file=".env", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
`;

    return [
      {
        relativePath: 'app/core/config.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── Auth ──

  private generateAuth(artifact: IRAuth, _ctx: GenerationContext): GeneratedFile[] {
    const hasJwt = artifact.schemes.some((s) => s.type === 'jwt');
    const hasApiKey = artifact.schemes.some((s) => s.type === 'api-key');
    const hasCookie = artifact.schemes.some((s) => s.type === 'cookie');
    const hasOAuth2 = artifact.schemes.some((s) => s.type === 'oauth2');

    const policyFunctions: string[] = [];
    for (const policy of artifact.policies) {
      const funcName = `require_${toSnakeCase(policy.name)}`;
      const roles = policy.roles ?? [];
      policyFunctions.push(`
async def ${funcName}(current_user: str = Depends(get_current_user)) -> str:
    """Policy: ${policy.name}${roles.length > 0 ? ` — requires roles: ${roles.join(', ')}` : ''}"""
    # TODO: Validate user has required roles/claims
    return current_user`);
    }

    let schemeBlock = '';
    if (hasJwt || hasOAuth2) {
      schemeBlock += `
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = get_settings().secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username
`;
    }

    if (hasApiKey) {
      schemeBlock += `
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)


async def get_api_key_user(api_key: str = Security(api_key_header)) -> str:
    # TODO: Validate API key against database or config
    if not api_key:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid API Key")
    return "api_key_user"
`;
    }

    if (hasCookie) {
      schemeBlock += `
async def get_current_user_from_cookie(request: Request) -> str:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return token
`;
    }

    const content = `from fastapi import Depends, HTTPException, Security, status, Request
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.core.config import get_settings

${schemeBlock.trimStart()}
${policyFunctions.join('\n')}
`.trimEnd() + '\n';

    return [
      {
        relativePath: 'app/core/security.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── Route ──

  private generateRoute(artifact: IRRoute, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.controllerName);
    const routerVar = `${snakeName}_router`;
    const basePath = artifact.basePath.startsWith('/') ? artifact.basePath : `/${artifact.basePath}`;

    const routeLines: string[] = [];
    for (const action of artifact.actions) {
      const method = action.httpMethod.toLowerCase();
      const authComment = action.authRequired
        ? `  # auth required${action.authRoles ? ` (roles: ${action.authRoles.join(', ')})` : ''}`
        : '';
      const actionPath = action.path === '' ? '/' : action.path;
      routeLines.push(`@${routerVar}.${method}("${actionPath}")${authComment}`);
      routeLines.push(`async def ${toSnakeCase(action.handlerName)}():`);
      routeLines.push(
        `    raise HTTPException(status_code=501, detail="${action.handlerName} not yet implemented")`,
      );
      routeLines.push('');
    }

    const content = `from fastapi import APIRouter, HTTPException
${artifact.actions.some((a) => a.authRequired) ? 'from app.core.security import get_current_user\nfrom fastapi import Depends' : ''}

${routerVar} = APIRouter(prefix="${basePath}", tags=["${artifact.controllerName}"])


${routeLines.join('\n')}`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/routers/${snakeName}_routes.py`,
        content,
        overwrite: true,
      },
    ];
  }

  // ── Validation Schema ──

  private generateValidationSchema(
    artifact: IRValidationSchema,
    _ctx: GenerationContext,
  ): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const imports = new Set<string>([
      'from pydantic import BaseModel, Field, field_validator, model_validator',
    ]);

    const fieldLines: string[] = [];
    const validatorMethods: string[] = [];

    for (const field of artifact.fields) {
      const fieldSnake = toSnakeCase(field.name);
      const pyType = mapPythonType(field.type);

      if (pyType === 'datetime') imports.add('from datetime import datetime');
      if (pyType.includes('EmailStr')) imports.add('from pydantic import EmailStr');

      const fieldArgs = buildFieldArgs(field.rules, pyType);
      fieldLines.push(`    ${fieldSnake}: ${pyType} = ${fieldArgs}`);

      for (const rule of field.rules) {
        if (rule.kind === 'regex' || rule.kind === 'custom' || rule.kind === 'phone' || rule.kind === 'compare') {
          const validatorBody = buildValidatorBody(rule, fieldSnake);
          validatorMethods.push(`
    @field_validator("${fieldSnake}")
    @classmethod
    def validate_${fieldSnake}(cls, v: ${pyType}) -> ${pyType}:
${validatorBody}
        return v`);
        }
      }
    }

    const validatorSection =
      validatorMethods.length > 0 ? '\n' + validatorMethods.join('\n') : '';

    const content = `${Array.from(imports).join('\n')}


class ${artifact.name}Schema(BaseModel):
${fieldLines.length > 0 ? fieldLines.join('\n') : '    pass'}
${validatorSection}
`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/schemas/${snakeName}_schema.py`,
        content,
        overwrite: true,
      },
    ];
  }

  // ── DI Registration ──

  private generateDiRegistration(
    artifact: IRDiRegistration,
    _ctx: GenerationContext,
  ): GeneratedFile[] {
    const factoryLines: string[] = [];
    const importLines: string[] = [
      'from fastapi import Depends',
      'from sqlalchemy.ext.asyncio import AsyncSession',
      'from app.core.database import get_session',
    ];

    for (const reg of artifact.registrations) {
      const ifaceName = reg.interfaceName.startsWith('I')
        ? reg.interfaceName.slice(1)
        : reg.interfaceName;
      const implName = reg.implementationName;
      const funcName = `get_${toSnakeCase(ifaceName)}`;
      const sessionParam =
        reg.lifetime === 'scoped'
          ? ', session: AsyncSession = Depends(get_session)'
          : '';

      factoryLines.push(`
# ${reg.interfaceName} -> ${implName} (${reg.lifetime})
def ${funcName}(${sessionParam.trimStart().replace(/^, /, '')}) -> "${implName}":
    return ${implName}(${reg.lifetime === 'scoped' ? 'session' : ''})`);
    }

    const content = `${importLines.join('\n')}

${factoryLines.join('\n\n')}
`.trimEnd() + '\n';

    return [
      {
        relativePath: 'app/core/dependencies.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── Domain Event ──

  private generateDomainEvent(artifact: IRDomainEvent, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const imports = new Set<string>([
      'from pydantic import BaseModel, Field',
      'from datetime import datetime',
    ]);

    const fieldLines: string[] = [];
    for (const prop of artifact.properties) {
      const pyType = mapPythonType(prop.type);
      const fieldName = toSnakeCase(prop.name);
      if (pyType === 'UUID') imports.add('from uuid import UUID');
      if (pyType === 'Decimal') imports.add('from decimal import Decimal');
      fieldLines.push(`    ${fieldName}: ${pyType}`);
    }

    const content = `${Array.from(imports).join('\n')}


class ${artifact.name}Event(BaseModel):
${fieldLines.length > 0 ? fieldLines.join('\n') : '    pass'}
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    event_type: str = "${artifact.name}"
`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/events/${snakeName}_event.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/events/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Value Object ──

  private generateValueObject(artifact: IRValueObject, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const imports = new Set<string>([
      'from pydantic import BaseModel, ConfigDict, field_validator',
    ]);

    const fieldLines: string[] = [];
    for (const prop of artifact.properties) {
      const pyType = mapPythonType(prop.type);
      const fieldName = toSnakeCase(prop.name);
      if (pyType === 'datetime') imports.add('from datetime import datetime');
      if (pyType === 'UUID') imports.add('from uuid import UUID');
      if (pyType === 'Decimal') imports.add('from decimal import Decimal');
      fieldLines.push(`    ${fieldName}: ${pyType}`);
    }

    const validatorLines: string[] = [];
    for (const rule of artifact.validationRules) {
      if (rule.kind === 'custom') {
        validatorLines.push(`
    @field_validator("*", mode="before")
    @classmethod
    def validate_value(cls, v: object) -> object:
        # Custom validation: ${rule.errorMessage ?? 'apply business rule'}
        return v`);
      }
    }

    const content = `${Array.from(imports).join('\n')}


class ${artifact.name}(BaseModel):
    model_config = ConfigDict(frozen=True)

${fieldLines.length > 0 ? fieldLines.join('\n') : '    pass'}
${validatorLines.join('\n')}
`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/domain/value_objects/${snakeName}.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/domain/__init__.py', content: '', overwrite: false },
      { relativePath: 'app/domain/value_objects/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Enum ──

  private generateEnum(artifact: IREnum, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);

    const memberLines = artifact.members.map((m) => {
      const memberName = m.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const value =
        typeof m.value === 'string' ? `"${m.value}"` : (m.value?.toString() ?? `"${m.name}"`);
      return `    ${memberName} = ${value}`;
    });

    const hasIntValues = artifact.members.every(
      (m) => m.value === undefined || typeof m.value === 'number',
    );
    const baseClass = hasIntValues ? 'int, Enum' : 'str, Enum';

    const content = `from enum import Enum


class ${artifact.name}(${baseClass}):
${memberLines.length > 0 ? memberLines.join('\n') : '    pass'}
`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/models/enums/${snakeName}.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/models/enums/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Mapper ──

  private generateMapper(artifact: IRMapper, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const sourceSnake = toSnakeCase(artifact.sourceType);
    const targetSnake = toSnakeCase(artifact.targetType);

    const mappingArgs = artifact.mappings.map((m) => {
      const toField = toSnakeCase(m.to);
      const fromField = toSnakeCase(m.from);
      if (m.transform) {
        return `        ${toField}=${m.transform.replace(/source\./g, 'source.')}`;
      }
      return `        ${toField}=source.${fromField}`;
    });

    const content = `from app.models.${sourceSnake} import ${artifact.sourceType}
from app.schemas.${targetSnake}_schema import ${artifact.targetType}


def map_${sourceSnake}_to_${targetSnake}(source: ${artifact.sourceType}) -> ${artifact.targetType}:
    return ${artifact.targetType}(
${mappingArgs.join(',\n')},
    )


def map_${targetSnake}_to_${sourceSnake}(source: ${artifact.targetType}) -> ${artifact.sourceType}:
    return ${artifact.sourceType}(
${mappingArgs.map((l) => l.replace(`source.${sourceSnake}`, `source.${targetSnake}`)).join(',\n')},
    )
`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/mappers/${snakeName}_mapper.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/mappers/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Use Case / Handler ──

  private generateUseCaseOrHandler(
    artifact: IRUseCaseOrHandler,
    _ctx: GenerationContext,
  ): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const inputType = mapPythonType(artifact.inputType);
    const outputType = mapPythonType(artifact.outputType);

    const constructorParams: string[] = ['self'];
    const constructorBody: string[] = [];

    for (const dep of artifact.dependencies) {
      const depName = dep.interfaceName.startsWith('I')
        ? dep.interfaceName.slice(1)
        : dep.interfaceName;
      const depSnake = toSnakeCase(depName);
      constructorParams.push(`${depSnake}: "${depName}"`);
      constructorBody.push(`        self._${depSnake} = ${depSnake}`);
    }

    const constructorBodyStr =
      constructorBody.length > 0 ? constructorBody.join('\n') : '        pass';

    const inputParam = toSnakeCase(artifact.inputType.name || 'input_data');
    const cqrsComment = `# CQRS ${artifact.cqrsType}: ${artifact.name}`;

    const content = `from abc import ABC, abstractmethod

${cqrsComment}


class ${artifact.name}Handler:
    def __init__(${constructorParams.join(', ')}):
${constructorBodyStr}

    async def execute(self, ${inputParam}: "${inputType}") -> "${outputType}":
        raise NotImplementedError("${artifact.name} not yet implemented")
`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/use_cases/${snakeName}_handler.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/use_cases/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── SignalR Hub → WebSocket ──

  private generateSignalRHub(artifact: IRSignalRHub, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const managerClass = `${toPascalCase(artifact.name)}Manager`;
    const managerVar = `${snakeName}_manager`;

    const eventHandlers: string[] = [];
    for (const event of artifact.events) {
      const handlerName = `on_${toSnakeCase(event.name)}`;
      eventHandlers.push(`
    async def ${handlerName}(self, websocket: WebSocket, data: dict) -> None:
        """Handle ${event.name} event"""
        await self.broadcast({"event": "${event.name}", "data": data})`);
    }

    const hubMethods: string[] = [];
    for (const method of artifact.methods) {
      hubMethods.push(`
    async def ${toSnakeCase(method.name)}(self, websocket: WebSocket, data: dict) -> None:
        """Hub method: ${method.name}"""
        await self.broadcast({"method": "${method.name}", "data": data})`);
    }

    const hubPath = artifact.hubPath.startsWith('/') ? artifact.hubPath : `/${artifact.hubPath}`;

    const content = `from fastapi import WebSocket, WebSocketDisconnect, APIRouter
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class ${managerClass}:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected: {websocket.client}")

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected: {websocket.client}")

    async def broadcast(self, message: dict) -> None:
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message: {e}")
${eventHandlers.join('\n')}
${hubMethods.join('\n')}


${managerVar} = ${managerClass}()


@router.websocket("${hubPath}")
async def ${snakeName}_websocket(websocket: WebSocket) -> None:
    await ${managerVar}.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            event = data.get("event", "")
            await ${managerVar}.broadcast({"from": str(websocket.client), "event": event, "data": data})
    except WebSocketDisconnect:
        ${managerVar}.disconnect(websocket)
`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/websockets/${snakeName}_ws.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/websockets/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Background Job ──

  private generateBackgroundJob(artifact: IRBackgroundJob, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const scheduleComment = artifact.schedule
      ? `# Schedule: ${artifact.schedule}\n`
      : '';

    const methodParams = artifact.method.parameters
      .filter((p) => p.source !== 'injected')
      .map((p) => `${toSnakeCase(p.name)}: ${mapPythonType(p.type)}`)
      .join(', ');

    const depInits = artifact.dependencies.map((dep) => {
      const depName = dep.interfaceName.startsWith('I')
        ? dep.interfaceName.slice(1)
        : dep.interfaceName;
      return `    # Dependency: ${depName} (${dep.logicalRole})`;
    });

    const content = `import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

${scheduleComment}${depInits.join('\n')}


async def ${snakeName}_job(${methodParams}) -> None:
    """Background job: ${artifact.name} (type: ${artifact.type})"""
    logger.info(f"${artifact.name} job started at {datetime.utcnow().isoformat()}")
    raise NotImplementedError("${artifact.name} job not yet implemented")


async def schedule_${snakeName}(interval_seconds: int = 60) -> None:
    """Scheduler loop for ${artifact.name}"""
    while True:
        try:
            await ${snakeName}_job()
        except NotImplementedError:
            logger.warning("${artifact.name} job not yet implemented — skipping")
        except Exception as e:
            logger.error(f"${artifact.name} job failed: {e}")
        await asyncio.sleep(interval_seconds)
`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/jobs/${snakeName}_job.py`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/jobs/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Cache Usage ──

  private generateCacheUsage(artifact: IRCacheUsage, _ctx: GenerationContext): GeneratedFile[] {
    const isRedis = artifact.type === 'redis';
    const isDistributed = artifact.type === 'distributed' || isRedis;

    const operationsComment = artifact.operations
      .map((op) => `    # ${op.method}(key="${op.key}"${op.ttl !== undefined ? `, ttl=${op.ttl}` : ''})`)
      .join('\n');

    let content: string;

    if (isRedis) {
      content = `import logging
from redis.asyncio import Redis
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Cache type: ${artifact.type}
# Operations used:
${operationsComment}


class CacheService:
    def __init__(self, redis: Redis):
        self._redis = redis

    async def get(self, key: str) -> bytes | None:
        return await self._redis.get(key)

    async def set(self, key: str, value: str | bytes, ttl: int | None = None) -> None:
        if ttl is not None:
            await self._redis.setex(key, ttl, value)
        else:
            await self._redis.set(key, value)

    async def delete(self, key: str) -> None:
        await self._redis.delete(key)

    async def exists(self, key: str) -> bool:
        return bool(await self._redis.exists(key))


async def get_redis() -> Redis:
    settings = get_settings()
    return Redis.from_url(settings.database_url.replace("postgresql+asyncpg://", "redis://"), decode_responses=False)
`;
    } else {
      content = `import logging
from typing import Any

logger = logging.getLogger(__name__)

# Cache type: ${artifact.type}
# Operations used:
${operationsComment}


class CacheService:
    def __init__(self):
        self._cache: dict[str, Any] = {}

    async def get(self, key: str) -> Any | None:
        return self._cache.get(key)

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        # ttl is not enforced in memory cache — use Redis for TTL support
        self._cache[key] = value

    async def delete(self, key: str) -> None:
        self._cache.pop(key, None)

    async def exists(self, key: str) -> bool:
        return key in self._cache

    async def clear(self) -> None:
        self._cache.clear()


_cache_instance: CacheService | None = None


def get_cache() -> CacheService:
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService()
    return _cache_instance
`;
    }

    return [
      {
        relativePath: 'app/core/cache.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── Logging Config ──

  private generateLoggingConfig(artifact: IRLoggingConfig, _ctx: GenerationContext): GeneratedFile[] {
    const level = artifact.logLevel.toUpperCase();
    const isStructured = artifact.structuredLogging;

    const sinkHandlers = artifact.sinks.map((sink) => {
      const sinkName = toSnakeCase(sink);
      if (sink.toLowerCase().includes('file') || sink.toLowerCase().includes('rolling')) {
        return `        "${sinkName}": {
            "class": "logging.FileHandler",
            "filename": "app.log",
            "formatter": "${isStructured ? 'json' : 'default'}",
            "level": "${level}",
        },`;
      }
      return `        "${sinkName}": {
            "class": "logging.StreamHandler",
            "formatter": "${isStructured ? 'json' : 'default'}",
            "level": "${level}",
        },`;
    });

    if (sinkHandlers.length === 0) {
      sinkHandlers.push(`        "console": {
            "class": "logging.StreamHandler",
            "formatter": "${isStructured ? 'json' : 'default'}",
            "level": "${level}",
        },`);
    }

    const handlerNames = artifact.sinks.length > 0
      ? artifact.sinks.map((s) => `"${toSnakeCase(s)}"`)
      : ['"console"'];

    const formatterBlock = isStructured
      ? `        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "fmt": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },`
      : '';

    const content = `import logging
import logging.config

# Logging provider: ${artifact.provider}
# Structured: ${artifact.structuredLogging}

LOGGING_CONFIG: dict = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
${formatterBlock}
    },
    "handlers": {
${sinkHandlers.join('\n')}
    },
    "root": {
        "level": "${level}",
        "handlers": [${handlerNames.join(', ')}],
    },
    "loggers": {
        "uvicorn": {"level": "${level}", "handlers": [${handlerNames.join(', ')}], "propagate": False},
        "fastapi": {"level": "${level}", "handlers": [${handlerNames.join(', ')}], "propagate": False},
        "sqlalchemy.engine": {"level": "WARNING", "handlers": [${handlerNames.join(', ')}], "propagate": False},
    },
}


def setup_logging() -> None:
    logging.config.dictConfig(LOGGING_CONFIG)
`;

    return [
      {
        relativePath: 'app/core/logging_config.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── Health Check ──

  private generateHealthCheck(artifact: IRHealthCheck, _ctx: GenerationContext): GeneratedFile[] {
    const checkLines: string[] = [];
    const importLines: string[] = ['from fastapi import APIRouter', 'import logging'];

    for (const check of artifact.checks) {
      const checkKey = toSnakeCase(check.name);
      if (check.type === 'db') {
        importLines.push('from sqlalchemy.ext.asyncio import AsyncSession');
        checkLines.push(`
    try:
        await session.execute(text("SELECT 1"))
        checks["${checkKey}"] = "ok"
    except Exception as e:
        checks["${checkKey}"] = f"error: {e}"
        overall = "degraded"`);
      } else if (check.type === 'redis') {
        checkLines.push(`
    try:
        # TODO: ping redis
        checks["${checkKey}"] = "ok"
    except Exception as e:
        checks["${checkKey}"] = f"error: {e}"
        overall = "degraded"`);
      } else {
        checkLines.push(`    checks["${checkKey}"] = "ok"  # ${check.type} check`);
      }
    }

    const hasDb = artifact.checks.some((c) => c.type === 'db');
    const endpoint = artifact.endpoint.startsWith('/') ? artifact.endpoint : `/${artifact.endpoint}`;

    const routeParams = hasDb
      ? 'session: AsyncSession = Depends(get_session)'
      : '';

    if (hasDb) {
      importLines.push('from fastapi import Depends');
      importLines.push('from sqlalchemy import text');
      importLines.push('from app.core.database import get_session');
    }

    const content = `${importLines.join('\n')}

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("${endpoint}")
async def health_check(${routeParams}) -> dict:
    checks: dict[str, str] = {}
    overall = "healthy"
${checkLines.join('\n')}
    return {"status": overall, "checks": checks, "name": "${artifact.name}"}
`;

    return [
      {
        relativePath: 'app/routers/health_router.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── CORS Config ──

  private generateCorsConfig(artifact: IRCorsConfig, _ctx: GenerationContext): GeneratedFile[] {
    const origins = JSON.stringify(artifact.origins.length > 0 ? artifact.origins : ['*']);
    const methods = JSON.stringify(artifact.methods.length > 0 ? artifact.methods : ['*']);
    const headers = JSON.stringify(artifact.headers.length > 0 ? artifact.headers : ['*']);

    const content = `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def configure_cors(app: FastAPI) -> None:
    """Configure CORS middleware for the FastAPI application."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=${origins},
        allow_credentials=${artifact.allowCredentials ? 'True' : 'False'},
        allow_methods=${methods},
        allow_headers=${headers},
    )
`;

    return [
      {
        relativePath: 'app/core/cors.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── API Versioning ──

  private generateApiVersioning(
    artifact: IRApiVersioning,
    _ctx: GenerationContext,
  ): GeneratedFile[] {
    const routerDecls: string[] = [];
    const strategyComment = `# Versioning strategy: ${artifact.strategy}, default: ${artifact.defaultVersion}`;

    for (const version of artifact.versions) {
      const vNum = version.replace(/[^0-9]/g, '') || version;
      const varName = `v${vNum}_router`;

      if (artifact.strategy === 'url') {
        routerDecls.push(`${varName} = APIRouter(prefix="/v${vNum}")`);
      } else if (artifact.strategy === 'header') {
        routerDecls.push(`${varName} = APIRouter()  # Version via header: X-API-Version: ${version}`);
      } else {
        routerDecls.push(`${varName} = APIRouter()  # Version via query param: ?version=${version}`);
      }
    }

    const content = `from fastapi import APIRouter, Header, Query, HTTPException, status

${strategyComment}

${routerDecls.join('\n')}


${artifact.strategy === 'header' ? `async def get_api_version(x_api_version: str = Header(default="${artifact.defaultVersion}")) -> str:
    supported = ${JSON.stringify(artifact.versions)}
    if x_api_version not in supported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported API version: {x_api_version}. Supported: {supported}",
        )
    return x_api_version` : ''}
${artifact.strategy === 'query' ? `async def get_api_version(version: str = Query(default="${artifact.defaultVersion}")) -> str:
    supported = ${JSON.stringify(artifact.versions)}
    if version not in supported:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported API version: {version}. Supported: {supported}",
        )
    return version` : ''}
`.trimEnd() + '\n';

    return [
      {
        relativePath: 'app/core/versioning.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── Swagger Config ──

  private generateSwaggerConfig(artifact: IRSwaggerConfig, _ctx: GenerationContext): GeneratedFile[] {
    const content = `# OpenAPI / Swagger configuration
# FastAPI auto-generates OpenAPI from route decorators and type hints.
# Use this config dict when constructing the FastAPI() instance.

OPENAPI_CONFIG: dict = {
    "title": "${artifact.title}",
    "description": "${artifact.description ?? ''}",
    "version": "${artifact.version}",
    "openapi_url": "/openapi.json",
    "docs_url": "/docs",
    "redoc_url": "/redoc",
}

# Endpoint summary overrides extracted from source:
ENDPOINT_METADATA: list[dict] = [
${artifact.endpoints
  .map(
    (ep) =>
      `    {"path": "${ep.path}", "method": "${ep.method}"${ep.summary ? `, "summary": "${ep.summary}"` : ''}${ep.tags ? `, "tags": ${JSON.stringify(ep.tags)}` : ''}},`,
  )
  .join('\n')}
]
`;

    return [
      {
        relativePath: 'app/core/openapi_config.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── Rate Limiting ──

  private generateRateLimiting(artifact: IRRateLimiting, _ctx: GenerationContext): GeneratedFile[] {
    const policyComments = artifact.policies
      .map((p) => {
        const appliesTo = p.appliesTo ? ` — applies to: ${p.appliesTo.join(', ')}` : '';
        return `# Policy "${p.name}": ${p.limit} requests per ${p.window}${appliesTo}`;
      })
      .join('\n');

    const policyDecorators = artifact.policies
      .map(
        (p) =>
          `${toSnakeCase(p.name)}_limit = "${p.limit}/${p.window}"  # ${p.name}`,
      )
      .join('\n');

    const content = `from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

${policyComments}

limiter = Limiter(key_func=get_remote_address)

# Rate limit strings (use with @limiter.limit decorator):
${policyDecorators}


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )
`;

    return [
      {
        relativePath: 'app/core/rate_limiter.py',
        content,
        overwrite: true,
      },
    ];
  }

  // ── Stored Procedure ──

  private generateStoredProcedure(
    artifact: IRStoredProcedure,
    _ctx: GenerationContext,
  ): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);

    const paramList = artifact.parameters
      .filter((p) => p.source !== 'injected')
      .map((p) => `${toSnakeCase(p.name)}: ${mapPythonType(p.type)}`)
      .join(', ');

    const paramDict = artifact.parameters
      .filter((p) => p.source !== 'injected')
      .map((p) => `"${p.name}": ${toSnakeCase(p.name)}`)
      .join(', ');

    const sqlText = artifact.rawSql
      ? artifact.rawSql.replace(/"/g, '\\"')
      : `EXEC ${artifact.name}`;

    const returnTypePy = mapPythonType(artifact.returnType);

    const content = `from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def call_${snakeName}(
    session: AsyncSession,
    ${paramList ? paramList + ',' : ''}
) -> list[dict]:
    """
    Stored procedure: ${artifact.name}
    Return type: ${returnTypePy}
    """
    result = await session.execute(
        text("${sqlText}"),
        {${paramDict}},
    )
    return [dict(row._mapping) for row in result]
`.trimEnd() + '\n';

    return [
      {
        relativePath: `app/repositories/procedures/${snakeName}.py`,
        content,
        overwrite: true,
      },
      {
        relativePath: 'app/repositories/procedures/__init__.py',
        content: '',
        overwrite: false,
      },
    ];
  }

  // ── DB Migration ──

  private generateDbMigration(artifact: IRDbMigration, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);
    const revisionId = artifact.timestamp.replace(/[^0-9a-z]/gi, '').slice(0, 12);

    const upOps = artifact.upOperations.map((op) => `    # ${op}`).join('\n') || '    pass';
    const downOps = artifact.downOperations.map((op) => `    # ${op}`).join('\n') || '    pass';

    const content = `"""${artifact.name}

Revision ID: ${revisionId}
Revises:
Create Date: ${artifact.timestamp}
"""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
${upOps}


def downgrade() -> None:
${downOps}
`.trimEnd() + '\n';

    return [
      {
        relativePath: `alembic/versions/${artifact.timestamp.replace(/[^0-9]/g, '').slice(0, 14)}_${snakeName}.py`,
        content,
        overwrite: true,
      },
    ];
  }

  // ── NuGet Mapping ──

  private generateNuGetMapping(artifact: IRNuGetMapping, _ctx: GenerationContext): GeneratedFile[] {
    const targetStr = artifact.targetEquivalent
      ? `pip: ${artifact.targetEquivalent}${artifact.targetVersion ? `==${artifact.targetVersion}` : ''}`
      : 'pip: NO DIRECT EQUIVALENT — manual migration required';

    const notesStr = artifact.notes ? `\n# Notes: ${artifact.notes}` : '';

    const content = `# NuGet: ${artifact.nugetPackage} ${artifact.nugetVersion} -> ${targetStr}${notesStr}\n`;

    return [
      {
        relativePath: 'requirements-mapping.txt',
        content,
        overwrite: false,
      },
    ];
  }

  // ── Razor View ──

  private generateRazorView(artifact: IRRazorView, _ctx: GenerationContext): GeneratedFile[] {
    const snakeName = toSnakeCase(artifact.name);

    const content = `# UNMIGRATED: ${artifact.name}
# Original path: ${artifact.path}
# Status: ${artifact.status}
${artifact.model ? `# Model: ${artifact.model}` : ''}
${artifact.layout ? `# Layout: ${artifact.layout}` : ''}
#
# This Razor view requires manual migration to a frontend framework.
# Options:
#   1. React/Next.js — recommended for SPA with FastAPI backend
#   2. Jinja2 templates — for server-side rendering with FastAPI
#   3. HTMX + Jinja2 — for progressive enhancement approach
#
# To use Jinja2 with FastAPI:
#   from fastapi.templating import Jinja2Templates
#   templates = Jinja2Templates(directory="templates")
#   @router.get("/${snakeName}")
#   async def ${snakeName}_view(request: Request):
#       return templates.TemplateResponse("${snakeName}.html", {"request": request})
`;

    return [
      {
        relativePath: `app/unmigrated/${snakeName}_view.txt`,
        content,
        overwrite: true,
      },
      { relativePath: 'app/unmigrated/__init__.py', content: '', overwrite: false },
    ];
  }

  // ── Entry Point ──

  generateEntryPoint(ctx: GenerationContext): GeneratedFile[] {
    const controllerArtifacts = ctx.allArtifacts.filter(
      (a): a is IRController => a.kind === 'controller',
    );

    const swaggerArtifact = ctx.allArtifacts.find(
      (a): a is IRSwaggerConfig => a.kind === 'swagger-config',
    );

    const corsArtifact = ctx.allArtifacts.find(
      (a): a is IRCorsConfig => a.kind === 'cors-config',
    );

    const hubArtifacts = ctx.allArtifacts.filter(
      (a): a is IRSignalRHub => a.kind === 'signalr-hub',
    );

    const rateLimitArtifact = ctx.allArtifacts.find(
      (a): a is IRRateLimiting => a.kind === 'rate-limiting',
    );

    const routerImports = controllerArtifacts.map((c) => {
      const snakeName = toSnakeCase(c.name);
      return `from app.routers.${snakeName}_router import ${snakeName}_router`;
    });

    const wsImports = hubArtifacts.map((h) => {
      const snakeName = toSnakeCase(h.name);
      return `from app.websockets.${snakeName}_ws import router as ${snakeName}_ws_router`;
    });

    const appTitle = swaggerArtifact?.title ?? 'Migrated API';
    const appVersion = swaggerArtifact?.version ?? '1.0.0';
    const appDescription = swaggerArtifact?.description ?? 'Migrated from .NET';

    const routerIncludes = controllerArtifacts.map((c) => {
      const snakeName = toSnakeCase(c.name);
      const basePath = c.basePath.startsWith('/') ? c.basePath : `/${c.basePath}`;
      return `app.include_router(${snakeName}_router, prefix="${basePath}", tags=["${c.name}"])`;
    });

    const wsIncludes = hubArtifacts.map((h) => {
      const snakeName = toSnakeCase(h.name);
      return `app.include_router(${snakeName}_ws_router)`;
    });

    const corsImport = corsArtifact ? 'from app.core.cors import configure_cors' : '';
    const corsCall = corsArtifact ? '    configure_cors(app)' : '';

    const rateLimitImport = rateLimitArtifact
      ? 'from app.core.rate_limiter import limiter, rate_limit_exceeded_handler\nfrom slowapi.errors import RateLimitExceeded'
      : '';
    const rateLimitSetup = rateLimitArtifact
      ? '    app.state.limiter = limiter\n    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)'
      : '';

    const allImports = [
      'from fastapi import FastAPI',
      'from contextlib import asynccontextmanager',
      'from app.core.logging_config import setup_logging',
      ...routerImports,
      ...wsImports,
      ...(corsImport ? [corsImport] : []),
      ...(rateLimitImport ? [rateLimitImport] : []),
    ].join('\n');

    const mainPy = `${allImports}


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield


app = FastAPI(
    title="${appTitle}",
    description="${appDescription}",
    version="${appVersion}",
    lifespan=lifespan,
)

${corsCall}
${rateLimitSetup}

${routerIncludes.join('\n')}
${wsIncludes.join('\n')}


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
`.trimEnd() + '\n';

    return [
      {
        relativePath: 'app/main.py',
        content: mainPy,
        overwrite: true,
      },
      {
        relativePath: 'app/__init__.py',
        content: '',
        overwrite: false,
      },
    ];
  }

  // ── Project Config ──

  generateProjectConfig(ctx: GenerationContext): GeneratedFile[] {
    const configArtifacts = ctx.allArtifacts.filter(
      (a): a is IRConfig => a.kind === 'config',
    );

    const extraEnvLines: string[] = [];
    for (const configArtifact of configArtifacts) {
      for (const entry of configArtifact.entries) {
        const envKey = entry.key.replace(/[:.]/g, '_').toUpperCase();
        const envVal = entry.isSecret ? '' : entry.value;
        extraEnvLines.push(`${envKey}=${envVal}`);
      }
      for (const cs of configArtifact.connectionStrings) {
        const envKey = `${cs.name.toUpperCase()}_CONNECTION_STRING`;
        extraEnvLines.push(`${envKey}=${cs.connectionString}`);
      }
    }

    const envExample = `# Auto-generated from .NET configuration
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/app
SECRET_KEY=change-me-in-production
DEBUG=true
${extraEnvLines.join('\n')}
`.trimEnd() + '\n';

    const databasePy = `from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import get_settings


engine = create_async_engine(
    get_settings().database_url,
    echo=get_settings().debug,
    pool_pre_ping=True,
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
`;

    return [
      {
        relativePath: '.env.example',
        content: envExample,
        overwrite: true,
      },
      {
        relativePath: 'app/core/database.py',
        content: databasePy,
        overwrite: true,
      },
    ];
  }

  // ── Scaffold ──

  generateScaffold(ctx: GenerationContext): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push({
      relativePath: 'app/__init__.py',
      content: '',
      overwrite: false,
    });

    files.push({
      relativePath: 'app/core/__init__.py',
      content: '',
      overwrite: false,
    });

    files.push({
      relativePath: 'app/core/exceptions.py',
      content: `from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class BadRequestError(HTTPException):
    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class UnauthorizedError(HTTPException):
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Forbidden"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ConflictError(HTTPException):
    def __init__(self, detail: str = "Conflict"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
`,
      overwrite: true,
    });

    if (ctx.architecture === 'clean' || ctx.architecture === 'ddd') {
      files.push({
        relativePath: 'app/core/use_case.py',
        content: `from abc import ABC, abstractmethod
from typing import Generic, TypeVar

InputT = TypeVar("InputT")
OutputT = TypeVar("OutputT")


class UseCase(ABC, Generic[InputT, OutputT]):
    @abstractmethod
    async def execute(self, input_data: InputT) -> OutputT: ...
`,
        overwrite: true,
      });

      files.push({
        relativePath: 'app/core/result.py',
        content: `from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass(frozen=True)
class Result(Generic[T]):
    value: T | None = None
    error: str | None = None
    is_success: bool = True

    @staticmethod
    def ok(value: T) -> "Result[T]":
        return Result(value=value, is_success=True)

    @staticmethod
    def fail(error: str) -> "Result":
        return Result(error=error, is_success=False)
`,
        overwrite: true,
      });
    }

    if (ctx.architecture === 'ddd') {
      files.push({
        relativePath: 'app/core/domain_event_base.py',
        content: `from pydantic import BaseModel, Field
from datetime import datetime


class DomainEvent(BaseModel):
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    event_type: str = ""
`,
        overwrite: true,
      });

      files.push({
        relativePath: 'app/core/entity_base.py',
        content: `from pydantic import BaseModel, Field
from datetime import datetime


class EntityBase(BaseModel):
    id: int | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
`,
        overwrite: true,
      });

      files.push({
        relativePath: 'app/core/aggregate_root.py',
        content: `from app.core.entity_base import EntityBase
from app.core.domain_event_base import DomainEvent


class AggregateRoot(EntityBase):
    _domain_events: list[DomainEvent] = []

    def add_domain_event(self, event: DomainEvent) -> None:
        self._domain_events.append(event)

    def clear_domain_events(self) -> list[DomainEvent]:
        events = list(self._domain_events)
        self._domain_events.clear()
        return events
`,
        overwrite: true,
      });

      files.push({
        relativePath: 'app/core/value_object_base.py',
        content: `from pydantic import BaseModel, ConfigDict


class ValueObject(BaseModel):
    model_config = ConfigDict(frozen=True)
`,
        overwrite: true,
      });

      files.push({
        relativePath: 'app/core/event_bus.py',
        content: `import asyncio
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)

EventHandler = Callable[..., Any]


class EventBus:
    def __init__(self):
        self._handlers: dict[str, list[EventHandler]] = {}

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    async def publish(self, event_type: str, event: Any) -> None:
        for handler in self._handlers.get(event_type, []):
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as e:
                logger.error(f"Event handler failed for {event_type}: {e}")
`,
        overwrite: true,
      });
    }

    return files;
  }
}

// ── Helper Functions ──

function splitWords(name: string): string[] {
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function toSnakeCase(name: string): string {
  return splitWords(name).join('_').toLowerCase();
}

function toPascalCase(name: string): string {
  return splitWords(name)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function mapPythonType(typeRef: IRTypeRef): string {
  if (typeRef.isArray) {
    const inner = mapPythonTypeByName(typeRef.name, typeRef.genericArgs);
    return typeRef.isOptional || typeRef.isNullable ? `list[${inner}] | None` : `list[${inner}]`;
  }

  const base = mapPythonTypeByName(typeRef.name, typeRef.genericArgs);

  if (typeRef.isOptional || typeRef.isNullable) {
    return `${base} | None`;
  }
  return base;
}

function mapPythonTypeByName(name: string, genericArgs?: IRTypeRef[]): string {
  const lower = name.toLowerCase();

  switch (lower) {
    case 'string':
    case 'str':
      return 'str';
    case 'int':
    case 'int32':
    case 'integer':
    case 'long':
    case 'int64':
    case 'short':
      return 'int';
    case 'bool':
    case 'boolean':
      return 'bool';
    case 'float':
    case 'double':
    case 'single':
      return 'float';
    case 'decimal':
      return 'Decimal';
    case 'datetime':
    case 'datetimeoffset':
      return 'datetime';
    case 'dateonly':
      return 'date';
    case 'timeonly':
    case 'timespan':
      return 'time';
    case 'guid':
    case 'uuid':
      return 'UUID';
    case 'void':
    case 'task':
      return 'None';
    case 'object':
      return 'Any';
    case 'byte[]':
    case 'bytes':
      return 'bytes';
    case 'dynamic':
      return 'Any';
    case 'list':
    case 'ienumerable':
    case 'icollection':
    case 'ilist': {
      const inner = genericArgs?.[0] ? mapPythonType(genericArgs[0]) : 'Any';
      return `list[${inner}]`;
    }
    case 'dictionary':
    case 'idictionary':
    case 'ireadonlydictionary': {
      const k = genericArgs?.[0] ? mapPythonType(genericArgs[0]) : 'str';
      const v = genericArgs?.[1] ? mapPythonType(genericArgs[1]) : 'Any';
      return `dict[${k}, ${v}]`;
    }
    case 'hashset':
    case 'iset': {
      const inner = genericArgs?.[0] ? mapPythonType(genericArgs[0]) : 'Any';
      return `set[${inner}]`;
    }
    case 'tuple': {
      if (genericArgs && genericArgs.length > 0) {
        return `tuple[${genericArgs.map(mapPythonType).join(', ')}]`;
      }
      return 'tuple';
    }
    case 'nullable': {
      const inner = genericArgs?.[0] ? mapPythonType(genericArgs[0]) : 'Any';
      return `${inner} | None`;
    }
    case 'actionresult':
    case 'iactionresult':
      return 'dict';
    case 'task<>':
      return genericArgs?.[0] ? mapPythonType(genericArgs[0]) : 'None';
    default:
      if (name.startsWith('Task<') || name.startsWith('task<')) {
        const inner = genericArgs?.[0] ? mapPythonType(genericArgs[0]) : 'Any';
        return inner;
      }
      if (name.startsWith('IEnumerable<') || name.startsWith('List<') || name.startsWith('ICollection<')) {
        const inner = genericArgs?.[0] ? mapPythonType(genericArgs[0]) : 'Any';
        return `list[${inner}]`;
      }
      return name;
  }
}

function mapSqlAlchemyColumn(
  prop: IRProperty,
  tableMapping?: { columns: { propertyName: string; columnName: string; columnType?: string; isPrimaryKey: boolean; isAutoGenerated: boolean; maxLength?: number; isUnique: boolean; isNullable: boolean }[] },
): { definition: string; importTypes?: string[] } {
  const importTypes: string[] = [];
  const colMapping = tableMapping?.columns.find((c) => c.propertyName === prop.name);

  if (colMapping?.isPrimaryKey) {
    return { definition: 'Column(Integer, primary_key=True, autoincrement=True)', importTypes: ['Integer'] };
  }

  const typeName = prop.type.name.toLowerCase();
  let saType: string;

  switch (typeName) {
    case 'string':
    case 'str': {
      const maxLen = colMapping?.maxLength;
      saType = maxLen ? `String(${maxLen})` : 'String';
      importTypes.push('String');
      break;
    }
    case 'int':
    case 'int32':
    case 'integer':
    case 'long':
    case 'int64':
      saType = 'Integer';
      importTypes.push('Integer');
      break;
    case 'bool':
    case 'boolean':
      saType = 'Boolean';
      importTypes.push('Boolean');
      break;
    case 'float':
    case 'double':
    case 'single':
      saType = 'Float';
      importTypes.push('Float');
      break;
    case 'decimal':
      saType = 'Numeric(precision=18, scale=4)';
      importTypes.push('Numeric');
      break;
    case 'datetime':
    case 'datetimeoffset':
      saType = 'DateTime(timezone=True)';
      importTypes.push('DateTime');
      break;
    case 'guid':
    case 'uuid':
      saType = 'String(36)';
      importTypes.push('String');
      break;
    case 'byte[]':
    case 'bytes':
      saType = 'LargeBinary';
      importTypes.push('LargeBinary');
      break;
    default:
      saType = 'String';
      importTypes.push('String');
  }

  const isNullable = colMapping?.isNullable ?? (prop.type.isOptional || prop.type.isNullable);
  const isUnique = colMapping?.isUnique ?? false;
  const columnName = colMapping?.columnName;

  const args: string[] = [saType];
  if (!isNullable) args.push('nullable=False');
  if (isUnique) args.push('unique=True');
  if (columnName && columnName !== prop.name) args.push(`name="${columnName}"`);

  return { definition: `Column(${args.join(', ')})`, importTypes };
}

function buildParamDefault(param: IRParameter): string {
  const hasDefault = param.defaultValue !== undefined;

  switch (param.source) {
    case 'path':
      return hasDefault ? `Path(${param.defaultValue})` : 'Path(...)';
    case 'query':
      return hasDefault ? `Query(${param.defaultValue})` : 'Query(...)';
    case 'body':
      return hasDefault ? `Body(${param.defaultValue})` : 'Body(...)';
    case 'header':
      return hasDefault ? `Header(${param.defaultValue})` : 'Header(...)';
    case 'cookie':
      return hasDefault ? `Cookie(${param.defaultValue})` : 'Cookie(...)';
    case 'form':
      return hasDefault ? `Form(${param.defaultValue})` : 'Form(...)';
    default:
      return hasDefault ? param.defaultValue! : '...';
  }
}

function buildFieldArgs(rules: IRValidationRule[], pyType: string): string {
  if (rules.length === 0) {
    return pyType.endsWith('| None') ? 'None' : 'Field(...)';
  }

  const isRequired = rules.some((r) => r.kind === 'required');
  const defaultExpr = isRequired ? '...' : 'None';

  const fieldParts: string[] = [defaultExpr];

  for (const rule of rules) {
    switch (rule.kind) {
      case 'min-length':
        fieldParts.push(`min_length=${rule.params['min'] ?? rule.params['length'] ?? 0}`);
        break;
      case 'max-length':
        fieldParts.push(`max_length=${rule.params['max'] ?? rule.params['length'] ?? 255}`);
        break;
      case 'range': {
        if (rule.params['min'] !== undefined) fieldParts.push(`ge=${rule.params['min']}`);
        if (rule.params['max'] !== undefined) fieldParts.push(`le=${rule.params['max']}`);
        break;
      }
      case 'regex':
        fieldParts.push(`pattern=${JSON.stringify(rule.params['pattern'] ?? '')}`);
        break;
      case 'email':
        return isRequired ? 'Field(...)' : 'None';
      default:
        break;
    }
  }

  if (rules.some((r) => r.kind === 'email')) {
    return isRequired ? '...' : 'None';
  }

  return `Field(${fieldParts.join(', ')})`;
}

function buildValidatorBody(rule: IRValidationRule, fieldName: string): string {
  switch (rule.kind) {
    case 'regex': {
      const pattern = rule.params['pattern'] ?? '';
      return `        import re
        if not re.match(${JSON.stringify(pattern)}, str(v)):
            raise ValueError(${JSON.stringify(rule.errorMessage ?? `${fieldName} does not match required pattern`)})`;
    }
    case 'phone':
      return `        import re
        if not re.match(r"^[\\+]?[0-9\\s\\-\\(\\)]{7,15}$", str(v)):
            raise ValueError(${JSON.stringify(rule.errorMessage ?? `${fieldName} must be a valid phone number`)})`;
    case 'compare':
      return `        # Compare validator: ${rule.errorMessage ?? `${fieldName} must match comparison field`}
        # TODO: Implement cross-field validation with model_validator`;
    case 'custom':
      return `        # Custom rule: ${rule.errorMessage ?? `${fieldName} failed custom validation`}
        # TODO: Implement custom validation logic`;
    default:
      return `        # Validation: ${rule.kind}`;
  }
}

function renderMethod(method: IRMethod): string[] {
  const lines: string[] = [];

  const paramParts = method.parameters
    .filter((p) => p.source !== 'injected')
    .map((p) => `${toSnakeCase(p.name)}: ${mapPythonType(p.type)}`);

  const paramStr = paramParts.length > 0 ? `, ${paramParts.join(', ')}` : '';
  const returnType = mapPythonType(method.returnType);
  const asyncKeyword = method.isAsync ? 'async ' : '';

  lines.push(
    `    ${asyncKeyword}def ${toSnakeCase(method.name)}(self${paramStr}) -> ${returnType}:`,
  );

  if (method.body?.businessRules && method.body.businessRules.length > 0) {
    for (const rule of method.body.businessRules) {
      lines.push(`        # ${rule}`);
    }
  }

  lines.push(
    `        raise NotImplementedError("${method.name} not yet implemented")`,
  );

  return lines;
}

function formatPythonDefault(value: string, pyType: string): string {
  if (value === 'null' || value === 'default') return 'None';
  if (value === 'true') return 'True';
  if (value === 'false') return 'False';
  if (pyType === 'str') return `"${value}"`;
  return value;
}
