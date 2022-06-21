// @ts-ignore
import * as t from '@onflow/types';
import { MetadataMap, MetadataValue } from './metadata';

interface CadenceType {
  label: string;
}

interface Field {
  name: string;
  placeholder: string;

  asCadenceTypeObject(): CadenceType;
  asCadenceTypeString(): string;

  getValue(metadata: MetadataMap): MetadataValue;
  serializeValue(value: MetadataValue): Buffer;
}

class BaseField {
  name: string;
  placeholder: string;
  cadenceType: CadenceType;

  constructor(name: string, placeholder: string, cadenceType: CadenceType) {
    this.name = name;
    this.placeholder = placeholder;
    this.cadenceType = cadenceType;
  }

  asCadenceTypeObject(): CadenceType {
    return this.cadenceType;
  }

  asCadenceTypeString(): string {
    return this.cadenceType.label;
  }

  getValue(metadata: MetadataMap): MetadataValue {
    return metadata[this.name];
  }

  serializeValue(value: MetadataValue): Buffer {
    // TODO: improve serialization. currently all values serializes as UTF-8 strings
    // off-chain serialization should match on-chain serialization in Cadence
    return Buffer.from(value as string, 'utf-8');
  }
}

class String extends BaseField implements Field {
  constructor(name: string) {
    super(name, 'Sample string', t.String);
  }
}

class Int extends BaseField implements Field {
  constructor(name: string) {
    super(name, '42', t.Int);
  }
}

class UInt extends BaseField implements Field {
  constructor(name: string) {
    super(name, '42', t.UInt);
  }
}

class Fix64 extends BaseField implements Field {
  constructor(name: string) {
    super(name, '-42.001', t.Fix);
  }
}

class UFix64 extends BaseField implements Field {
  constructor(name: string) {
    super(name, '42.001', t.UFix);
  }
}

class Bool extends BaseField implements Field {
  constructor(name: string) {
    super(name, 'true', t.Bool);
  }
}

class IPFSImage extends BaseField implements Field {
  constructor(name: string) {
    super(name, 'foo.jpg', t.String);
  }
}

class IPFSMetadata extends BaseField implements Field {
  getValue(metadata: MetadataMap): MetadataValue {
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

interface FieldOption {
  id: string;
  label: string;
  constructor: (name: string) => Field;
}

const fields: FieldOption[] = [
  {
    id: 'string',
    label: 'String',
    constructor: (name: string) => new String(name),
  },
  {
    id: 'int',
    label: 'Int',
    constructor: (name: string) => new Int(name),
  },
  {
    id: 'uint',
    label: 'UInt',
    constructor: (name: string) => new UInt(name),
  },
  {
    id: 'fix64',
    label: 'Fix64',
    constructor: (name: string) => new Fix64(name),
  },
  {
    id: 'ufix64',
    label: 'UFix64',
    constructor: (name: string) => new UFix64(name),
  },
  {
    id: 'bool',
    label: 'Boolean',
    constructor: (name: string) => new Bool(name),
  },
  {
    id: 'ipfs-image',
    label: 'IPFS Image',
    constructor: (name: string) => new IPFSImage(name),
  },
];

const fieldsById: { [key: string]: FieldOption } = fields.reduce(
  (fields, field) => ({ [field.id]: field, ...fields }),
  {},
);

function getFieldById(id: string): FieldOption {
  return fieldsById[id];
}

function parseFields(fields: { name: string; type: string }[]): Field[] {
  return fields.map((field) => {
    const name = field.name;
    const fieldOption = getFieldById(field.type);

    return fieldOption.constructor(name);
  });
}

export { Field, String, Int, UInt, Fix64, UFix64, Bool, IPFSImage, IPFSMetadata, FieldOption, fields, parseFields };
