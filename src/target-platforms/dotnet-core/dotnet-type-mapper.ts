import type { TargetTypeMapper } from '../target-platform.interface.js';

// ── Framework → Modern .NET namespace mappings ──

const FRAMEWORK_TO_MODERN: Record<string, string> = {
  // ASP.NET MVC / Web API
  'System.Web.Mvc.Controller': 'Microsoft.AspNetCore.Mvc.Controller',
  'System.Web.Http.ApiController': 'Microsoft.AspNetCore.Mvc.ControllerBase',
  'System.Web.HttpContext': 'Microsoft.AspNetCore.Http.HttpContext',
  'System.Web.Mvc.ActionResult': 'Microsoft.AspNetCore.Mvc.IActionResult',
  'System.Web.Mvc.JsonResult': 'Microsoft.AspNetCore.Mvc.JsonResult',
  'System.Web.Mvc.ViewResult': 'Microsoft.AspNetCore.Mvc.ViewResult',
  'System.Web.Mvc.ContentResult': 'Microsoft.AspNetCore.Mvc.ContentResult',
  'System.Web.Mvc.RedirectResult': 'Microsoft.AspNetCore.Mvc.RedirectResult',
  'System.Web.Mvc.FileResult': 'Microsoft.AspNetCore.Mvc.FileResult',
  'System.Web.Mvc.FilterAttribute': 'Microsoft.AspNetCore.Mvc.Filters.IFilterMetadata',
  'System.Web.Mvc.ActionFilterAttribute': 'Microsoft.AspNetCore.Mvc.Filters.ActionFilterAttribute',
  'System.Web.Mvc.AuthorizeAttribute': 'Microsoft.AspNetCore.Authorization.AuthorizeAttribute',
  'System.Web.Http.HttpResponseException': 'Microsoft.AspNetCore.Http.BadHttpRequestException',
  'HttpResponseMessage': 'IActionResult',
  'IHttpActionResult': 'IActionResult',

  // Configuration
  'System.Configuration.ConfigurationManager': 'Microsoft.Extensions.Configuration.IConfiguration',
  'System.Web.Configuration.WebConfigurationManager': 'Microsoft.Extensions.Configuration.IConfiguration',

  // Entity Framework
  'System.Data.Entity.DbContext': 'Microsoft.EntityFrameworkCore.DbContext',
  'System.Data.Entity.DbSet': 'Microsoft.EntityFrameworkCore.DbSet',
  'System.Data.Entity.Database': 'Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade',
  'System.Data.Entity.Migrations.DbMigration': 'Microsoft.EntityFrameworkCore.Migrations.Migration',
  'System.Data.Entity.ModelConfiguration.EntityTypeConfiguration': 'Microsoft.EntityFrameworkCore.IEntityTypeConfiguration',

  // ADO.NET
  'System.Data.SqlClient.SqlConnection': 'Microsoft.Data.SqlClient.SqlConnection',
  'System.Data.SqlClient.SqlCommand': 'Microsoft.Data.SqlClient.SqlCommand',
  'System.Data.SqlClient.SqlDataReader': 'Microsoft.Data.SqlClient.SqlDataReader',
  'System.Data.SqlClient.SqlParameter': 'Microsoft.Data.SqlClient.SqlParameter',
  'System.Data.SqlClient.SqlDataAdapter': 'Microsoft.Data.SqlClient.SqlDataAdapter',
  'System.Data.SqlClient.SqlBulkCopy': 'Microsoft.Data.SqlClient.SqlBulkCopy',
  'System.Data.SqlClient.SqlTransaction': 'Microsoft.Data.SqlClient.SqlTransaction',
  'System.Data.SqlClient.SqlException': 'Microsoft.Data.SqlClient.SqlException',

  // Logging
  'System.Diagnostics.Trace': 'Microsoft.Extensions.Logging.ILogger',
  'System.Diagnostics.Debug': 'Microsoft.Extensions.Logging.ILogger',
  'log4net.ILog': 'Microsoft.Extensions.Logging.ILogger',

  // DI
  'System.Web.Mvc.IDependencyResolver': 'Microsoft.Extensions.DependencyInjection.IServiceProvider',
  'Unity.IUnityContainer': 'Microsoft.Extensions.DependencyInjection.IServiceCollection',
  'Autofac.IContainer': 'Microsoft.Extensions.DependencyInjection.IServiceProvider',
  'Ninject.IKernel': 'Microsoft.Extensions.DependencyInjection.IServiceProvider',

  // Caching
  'System.Web.Caching.Cache': 'Microsoft.Extensions.Caching.Memory.IMemoryCache',
  'System.Runtime.Caching.MemoryCache': 'Microsoft.Extensions.Caching.Memory.IMemoryCache',
  'System.Runtime.Caching.ObjectCache': 'Microsoft.Extensions.Caching.Memory.IMemoryCache',

  // HTTP
  'System.Web.HttpRequest': 'Microsoft.AspNetCore.Http.HttpRequest',
  'System.Web.HttpResponse': 'Microsoft.AspNetCore.Http.HttpResponse',
  'System.Web.HttpServerUtility': 'Microsoft.AspNetCore.Http.HttpContext',
  'System.Web.HttpApplication': 'Microsoft.AspNetCore.Builder.WebApplication',
  'System.Web.Routing.RouteCollection': 'Microsoft.AspNetCore.Routing.IEndpointRouteBuilder',
};

// Short-name aliases (without namespace prefix)
const SHORT_NAME_MAP: Record<string, string> = {
  Controller: 'Controller',
  ApiController: 'ControllerBase',
  ActionResult: 'IActionResult',
  HttpResponseMessage: 'IActionResult',
  IHttpActionResult: 'IActionResult',
  JsonResult: 'JsonResult',
  ViewResult: 'ViewResult',
  FilterAttribute: 'IFilterMetadata',
  ConfigurationManager: 'IConfiguration',
  DbContext: 'DbContext',
  DbSet: 'DbSet',
  SqlConnection: 'SqlConnection',
  SqlCommand: 'SqlCommand',
  SqlDataReader: 'SqlDataReader',
  SqlParameter: 'SqlParameter',
  SqlDataAdapter: 'SqlDataAdapter',
  SqlBulkCopy: 'SqlBulkCopy',
  SqlTransaction: 'SqlTransaction',
  DataSet: 'DataSet',
  DataTable: 'DataTable',
  DataRow: 'DataRow',
};

export class DotNetTypeMapper implements TargetTypeMapper {
  mapType(csharpType: string): string {
    // Handle nullable shorthand (e.g. "int?")
    if (csharpType.endsWith('?')) {
      const base = csharpType.slice(0, -1);
      return this.mapNullableType(this.mapType(base));
    }

    // Handle Task<T> / Task
    const taskMatch = csharpType.match(/^Task<(.+)>$/);
    if (taskMatch) {
      return this.mapAsyncReturnType(this.mapType(taskMatch[1]));
    }
    if (csharpType === 'Task') {
      return 'Task';
    }

    // Handle collections: List<T>, IEnumerable<T>, ICollection<T>, IList<T>
    const listMatch = csharpType.match(
      /^(?:List|IEnumerable|ICollection|IList|IReadOnlyList|IReadOnlyCollection)<(.+)>$/,
    );
    if (listMatch) {
      return this.mapCollectionType(this.mapType(listMatch[1]));
    }

    // Handle Dictionary<K, V>
    const dictMatch = csharpType.match(
      /^(?:Dictionary|IDictionary|IReadOnlyDictionary)<(.+),\s*(.+)>$/,
    );
    if (dictMatch) {
      return this.mapDictionaryType(this.mapType(dictMatch[1]), this.mapType(dictMatch[2]));
    }

    // Handle HashSet<T>
    const setMatch = csharpType.match(/^(?:HashSet|ISet)<(.+)>$/);
    if (setMatch) {
      return `HashSet<${this.mapType(setMatch[1])}>`;
    }

    // Handle Nullable<T>
    const nullableMatch = csharpType.match(/^Nullable<(.+)>$/);
    if (nullableMatch) {
      return this.mapNullableType(this.mapType(nullableMatch[1]));
    }

    // Check full namespace mapping
    if (FRAMEWORK_TO_MODERN[csharpType]) {
      return FRAMEWORK_TO_MODERN[csharpType];
    }

    // Check short-name mapping
    if (SHORT_NAME_MAP[csharpType]) {
      return SHORT_NAME_MAP[csharpType];
    }

    // Primitives pass through unchanged (C# → C#)
    return csharpType;
  }

  mapCollectionType(elementType: string): string {
    return `List<${elementType}>`;
  }

  mapDictionaryType(keyType: string, valueType: string): string {
    return `Dictionary<${keyType}, ${valueType}>`;
  }

  mapNullableType(baseType: string): string {
    return `${baseType}?`;
  }

  mapAsyncReturnType(innerType: string): string {
    return `Task<${innerType}>`;
  }

  mapToOrmType(csharpType: string): string {
    // For C# → C# migration, ORM types are the same CLR types
    if (csharpType.endsWith('?')) {
      return this.mapToOrmType(csharpType.slice(0, -1));
    }
    const nullableMatch = csharpType.match(/^Nullable<(.+)>$/);
    if (nullableMatch) {
      return this.mapToOrmType(nullableMatch[1]);
    }
    // Pass through — EF Core uses CLR types directly
    return csharpType;
  }
}
