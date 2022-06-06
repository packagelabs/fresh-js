const t = require('@onflow/types');

const toNumber = (v: any) => Number(v);

const stringToBuffer = (v: string) => Buffer.from(v, 'utf-8');

class FieldType {
  name: string;
  label: string;
  cadenceType: any;
  toCadence: any;
  placeholder: any;
  toBuffer: (v: any) => Buffer;
  toArgument: (v: any) => any;

  constructor(
    name: string,
    label: string,
    cadenceType: any,
    placeholder: any,
    toBuffer: (v: any) => Buffer,
    toArgument = (v: any) => v,
  ) {
    this.name = name;
    this.label = label;
    this.cadenceType = cadenceType;
    this.toCadence = this.cadenceType.label;
    this.placeholder = placeholder;
    this.toBuffer = toBuffer;
    this.toArgument = toArgument;
  }

  getValue(fieldName: string, metadata: { [key: string]: any }) {
    return metadata[fieldName];
  }

  serializeValue(value: any): Buffer {
    return this.toBuffer(value);
  }
}

class Field {
  name: string;
  type: FieldType;

  constructor(name: string, type: FieldType) {
    this.name = name;
    this.type = type;
  }

  getValue(metadata: { [key: string]: any }) {
    return this.type.getValue(this.name, metadata);
  }

  serializeValue(value: any): Buffer {
    // TODO: improve serialization. currently all values serializes as UTF-8 strings
    return this.type.serializeValue(value);
  }
}

class IPFSMetadataFieldType extends FieldType {
  constructor() {
    super('ipfs-metadata', 'IPFS Metadata', t.String, '', stringToBuffer);
  }

  getValue(fieldName: string, metadata: { [key: string]: any }) {
    if (!metadata.image) {
      throw new Error("Error generating metadata, must supply an 'image' property");
    }

    if (metadata.attributes) {
      try {
        metadata.attributes = JSON.parse(metadata.attributes);
      } catch (e) {
        throw new Error("Error generating metadata, 'attributes' must be valid JSON");
      }
    }

    return metadata;
  }
}

const fieldTypes = {
  String: new FieldType('string', 'String', t.String, 'Sample string', stringToBuffer),
  Int: new FieldType('int', 'Int', t.Int, '42', stringToBuffer, toNumber),
  Int8: new FieldType('int8', 'Int8', t.Int8, '42', stringToBuffer, toNumber),
  Int16: new FieldType('int16', 'Int16', t.Int16, '42', stringToBuffer, toNumber),
  Int32: new FieldType('int32', 'Int32', t.Int32, '42', stringToBuffer, toNumber),
  Int64: new FieldType('int64', 'Int64', t.Int64, '42', stringToBuffer, toNumber),
  UInt: new FieldType('uint', 'UInt', t.UInt, '42', stringToBuffer, toNumber),
  UInt8: new FieldType('uint8', 'UInt8', t.UInt8, '42', stringToBuffer, toNumber),
  UInt16: new FieldType('uint16', 'UInt16', t.UInt16, '42', stringToBuffer, toNumber),
  UInt32: new FieldType('uint32', 'UInt32', t.UInt32, '42', stringToBuffer, toNumber),
  UInt64: new FieldType('uint64', 'UInt64', t.UInt64, '42', stringToBuffer, toNumber),
  Fix64: new FieldType('fix64', 'Fix64', t.Fix64, '42.0', stringToBuffer, toNumber),
  UFix64: new FieldType('ufix64', 'UFix64', t.UFix64, '42.0', stringToBuffer, toNumber),
  IPFSImage: new FieldType('ipfs-image', 'IPFS Image', t.String, 'lady.jpg', stringToBuffer),
  IPFSMetadata: new IPFSMetadataFieldType(),
};

// Fields that the user can select during project creation
const validFieldTypes = [
  fieldTypes.IPFSImage,
  fieldTypes.String,
  fieldTypes.Int,
  fieldTypes.Int8,
  fieldTypes.Int16,
  fieldTypes.Int32,
  fieldTypes.Int64,
  fieldTypes.UInt,
  fieldTypes.UInt8,
  fieldTypes.UInt16,
  fieldTypes.UInt32,
  fieldTypes.UInt64,
  fieldTypes.Fix64,
  fieldTypes.UFix64,
];

const fieldTypesByName: { [key: string]: FieldType } = validFieldTypes.reduce(
  (fields, field) => ({ [field.name]: field, ...fields }),
  {},
);

function getFieldTypeByName(name: string): FieldType {
  return fieldTypesByName[name];
}

// pass FE data through here
// ex:
// [
//   {
//     "name": "foo",
//     "type": "string"
//   },
//   ...
// ]
function parseFields(fields: { name: string; type: string }[]) {
  return fields.map((field) => {
    const name = field.name;
    const type = getFieldTypeByName(field.type);

    return new Field(name, type);
  });
}

export { Field, fieldTypes, validFieldTypes, parseFields };
