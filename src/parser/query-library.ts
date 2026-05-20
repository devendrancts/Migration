// Common tree-sitter S-expression queries for C# constructs
// Used by both .NET Framework and .NET Core analysis

export const QUERIES = {
  classDeclaration: `
    (class_declaration
      name: (identifier) @class_name
      bases: (base_list)? @bases
      body: (declaration_list) @body
    ) @class
  `,

  interfaceDeclaration: `
    (interface_declaration
      name: (identifier) @interface_name
      bases: (base_list)? @bases
      body: (declaration_list) @body
    ) @interface
  `,

  methodDeclaration: `
    (method_declaration
      returns: (_) @return_type
      name: (identifier) @method_name
      parameters: (parameter_list) @params
      body: (block)? @body
    ) @method
  `,

  propertyDeclaration: `
    (property_declaration
      type: (_) @prop_type
      name: (identifier) @prop_name
    ) @property
  `,

  constructorDeclaration: `
    (constructor_declaration
      name: (identifier) @ctor_name
      parameters: (parameter_list) @params
      body: (block) @body
    ) @constructor
  `,

  usingDirectives: `
    (using_directive) @using
  `,

  namespaceDeclaration: `
    (namespace_declaration
      name: (_) @namespace_name
      body: (declaration_list) @body
    ) @namespace
  `,

  fileScopedNamespace: `
    (file_scoped_namespace_declaration
      name: (_) @namespace_name
    ) @namespace
  `,

  enumDeclaration: `
    (enum_declaration
      name: (identifier) @enum_name
      body: (enum_member_declaration_list) @body
    ) @enum
  `,

  attributeList: `
    (attribute_list
      (attribute
        name: (_) @attr_name
        (attribute_argument_list)? @attr_args
      ) @attribute
    ) @attr_list
  `,

  dbSetProperties: `
    (property_declaration
      type: (generic_name
        (identifier) @generic_type
        (type_argument_list) @type_args
      )
      name: (identifier) @prop_name
    ) @property
  `,

  linqMethodCalls: `
    (invocation_expression
      function: (member_access_expression
        name: (identifier) @method_name
      )
    ) @invocation
  `,
};

export const LINQ_METHODS = new Set([
  'Where', 'Select', 'OrderBy', 'OrderByDescending', 'GroupBy', 'Join',
  'First', 'FirstOrDefault', 'Single', 'SingleOrDefault',
  'Any', 'All', 'Count', 'Sum', 'Average', 'Min', 'Max',
  'ToList', 'ToArray', 'Include', 'ThenInclude',
  'Skip', 'Take', 'Distinct', 'AsNoTracking',
  'FindAsync', 'AddAsync', 'Add', 'Update', 'Remove',
  'SaveChangesAsync', 'SaveChanges',
]);

export const HTTP_ATTRIBUTES = new Set([
  'HttpGet', 'HttpPost', 'HttpPut', 'HttpPatch', 'HttpDelete',
  'Route', 'ApiController',
]);

export const PARAM_SOURCE_ATTRIBUTES = new Set([
  'FromBody', 'FromQuery', 'FromRoute', 'FromHeader', 'FromForm',
]);

export const VALIDATION_ATTRIBUTES = new Set([
  'Required', 'StringLength', 'MaxLength', 'MinLength',
  'Range', 'RegularExpression', 'EmailAddress', 'Url', 'Phone',
  'Compare', 'CreditCard',
]);

export const DATA_ANNOTATION_ATTRIBUTES = new Set([
  'Key', 'Table', 'Column', 'ForeignKey', 'NotMapped',
  'DatabaseGenerated', 'Index', 'MaxLength', 'Required',
]);
