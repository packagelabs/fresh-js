import { randomBytes } from 'crypto';
import { SHA3_256Hasher } from '@fresh-js/crypto';

import * as schema from './schema';

export type MetadataMap = { [key: string]: MetadataValue };
export type MetadataValue = { [key: string]: MetadataValue } | string;
export type MetadataHash = { hash: Buffer; salt: Buffer };

export function hashMetadata(schema: schema.Field[], metadata: MetadataMap): MetadataHash {
  // TODO: make hasher configurable
  const hasher = new SHA3_256Hasher();

  const salt = randomBytes(16);

  let message = salt;

  schema.forEach((field) => {
    const value = field.getValue(metadata);
    const serialized = field.serializeValue(value);

    message = Buffer.concat([message, serialized]);
  });

  const hash = hasher.hash(message);

  return { hash, salt };
}
