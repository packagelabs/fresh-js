import { randomBytes } from 'crypto';
import { SHA3_256Hasher } from '@fresh-js/crypto';

// @ts-ignore
import * as t from '@onflow/types';

export type MetadataMap = { [key: string]: MetadataValue };
export type MetadataValue = { [key: string]: MetadataValue } | string;
export type MetadataHash = { hash: Buffer; salt: Buffer };

interface CadenceType {
  label: string;
}

export function hashMetadata(fields: Field[], metadata: MetadataMap): MetadataHash {
  // TODO: make hasher configurable
  const hasher = new SHA3_256Hasher();

  const salt = randomBytes(16);

  let message = salt;

  fields.forEach((field) => {
    const value = field.getValue(metadata);
    const serialized = field.serializeValue(value);

    message = Buffer.concat([message, serialized]);
  });

  const hash = hasher.hash(message);

  return { hash, salt };
}

class FieldType {
  name: string;
  label: string;
  cadenceType: CadenceType;
  toCadence: string;
  placeholder: string;

  constructor(name: string, label: string, cadenceType: CadenceType, placeholder: string) {
    this.name = name;
    this.label = label;
    this.cadenceType = cadenceType;
    this.toCadence = cadenceType.label;
    this.placeholder = placeholder;
  }

  getValue(fieldName: string, metadata: MetadataMap): MetadataValue {
    return metadata[fieldName];
  }

  serializeValue(value: MetadataValue): Buffer {
    // TODO: support other values besides strings
    return Buffer.from(value as string, 'utf-8');
  }
}

class Field {
  name: string;
  type: FieldType;

  constructor(name: string, type: FieldType) {
    this.name = name;
    this.type = type;
  }

  getValue(metadata: MetadataMap) {
    return this.type.getValue(this.name, metadata);
  }

  serializeValue(value: MetadataValue): Buffer {
    // TODO: improve serialization. currently all values serializes as UTF-8 strings
    // off-chain serialization should match on-chain serialization in Cadence
    return this.type.serializeValue(value);
  }
}

class IPFSMetadataFieldType extends FieldType {
  constructor() {
    super('ipfs-metadata', 'IPFS Metadata', t.String, '');
  }

  getValue(fieldName: string, metadata: MetadataMap): MetadataValue {
    if (!metadata.image) {
      throw new Error("Error generating metadata, must supply an 'image' property");
    }

    if (metadata.attributes) {
      try {
        metadata.attributes = JSON.parse(metadata.attributes as string);
      } catch (e) {
        throw new Error("Error generating metadata, 'attributes' must be valid JSON");
      }
    }

    return metadata;
  }
}

const fieldTypes = {
  String: new FieldType('string', 'String', t.String, 'Sample string'),
  Int: new FieldType('int', 'Int', t.Int, '42'),
  Int8: new FieldType('int8', 'Int8', t.Int8, '42'),
  Int16: new FieldType('int16', 'Int16', t.Int16, '42'),
  Int32: new FieldType('int32', 'Int32', t.Int32, '42'),
  Int64: new FieldType('int64', 'Int64', t.Int64, '42'),
  UInt: new FieldType('uint', 'UInt', t.UInt, '42'),
  UInt8: new FieldType('uint8', 'UInt8', t.UInt8, '42'),
  UInt16: new FieldType('uint16', 'UInt16', t.UInt16, '42'),
  UInt32: new FieldType('uint32', 'UInt32', t.UInt32, '42'),
  UInt64: new FieldType('uint64', 'UInt64', t.UInt64, '42'),
  Fix64: new FieldType('fix64', 'Fix64', t.Fix64, '42.0'),
  UFix64: new FieldType('ufix64', 'UFix64', t.UFix64, '42.0'),
  IPFSImage: new FieldType('ipfs-image', 'IPFS Image', t.String, 'lady.jpg'),
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

function parseFields(fields: { name: string; type: string }[]): Field[] {
  return fields.map((field) => {
    const name = field.name;
    const type = getFieldTypeByName(field.type);

    return new Field(name, type);
  });
}

export { Field, fieldTypes, validFieldTypes, parseFields };

// // TODO: remove after OffChainProject exists
// export const offChainFields = [new Field('metadata', fieldTypes.IPFSMetadata)];
