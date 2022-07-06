import { Field, FieldInput, String, IPFSImage, parseFields } from './fields';
import { DisplayView, View } from './views';

type SchemaOptions = {
  views?: View[];
};

export class Schema {
  fields: Field[];
  views: View[];

  constructor(fields: Field[], options?: SchemaOptions) {
    this.fields = fields;
    this.views = options?.views ?? [];
  }

  // TODO: include options in extend
  extend(schema: Schema | Field[]) {
    let fields;

    if (Array.isArray(schema)) {
      fields = schema;
    } else {
      fields = schema.fields;
    }

    const newFields = [...this.fields, ...fields];

    return new Schema(newFields, { views: this.views });
  }

  getView(name: string): View | undefined {
    return this.views.find((view: View) => view.name === name);
  }
}

export function createSchema(fields: Field[], options?: SchemaOptions): Schema {
  return new Schema(fields, options);
}

type SchemaInput = { fields: FieldInput[] } | FieldInput[];

export function parseSchema(input: SchemaInput): Schema {
  if (Array.isArray(input)) {
    return createSchema(parseFields(input));
  }

  return createSchema(parseFields(input.fields));
}

export const defaultSchema = createSchema([String('name'), String('description'), IPFSImage('thumbnail')], {
  views: [
    DisplayView({
      name: 'name',
      description: 'description',
      thumbnail: 'thumbnail',
    }),
  ],
});
