export enum SignatureAlgorithm {
  ECDSA_P256 = 'ECDSA_P256',
  ECDSA_secp256k1 = 'ECDSA_secp256k1',
}

export interface Signer {
  sign(message: Buffer): Buffer;
}
