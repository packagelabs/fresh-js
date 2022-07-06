import { Field, FieldInput, parseFields } from './fields';

export class Schema {
  fields: Field[];

  constructor(fields: Field[]) {
    this.fields = fields;
  }

  extend(schema: Schema) {
    return new Schema([...this.fields, ...schema.fields]);
  }
}

export function createSchema(fields: Field[]): Schema {
  return new Schema(fields);
}

type SchemaInput = { fields: FieldInput[] } | FieldInput[];

export function parseSchema(input: SchemaInput): Schema {
  if (Array.isArray(input)) {
    return createSchema(parseFields(input));
  }

  return createSchema(parseFields(input.fields));
}
