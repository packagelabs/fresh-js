import { Field, fieldTypes } from './fields';
import { SHA3_256Hasher } from '@fresh-js/crypto';

// TODO: remove after OffChainProject exists
export const offChainFields = [new Field('metadata', fieldTypes.IPFSMetadata)];

export function hashMetadata(fields: Field[], salt: Buffer, metadata: { [key: string]: any }) {
  // TODO: make hasher configurable
  const hasher = new SHA3_256Hasher();

  let message = Buffer.alloc(0);

  fields.forEach((field) => {
    const value = field.getValue(metadata);
    const serialized = field.serializeValue(value);

    message = Buffer.concat([message, serialized]);
  });

  message = Buffer.concat([message, salt]);

  return hasher.hash(message);
}
