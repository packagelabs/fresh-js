import * as elliptic from 'elliptic';

import { PublicKey } from './publicKey';
import { Signer, SignatureAlgorithm } from './sign';
import { Hasher, HashAlgorithm, getHasher } from './hash';

const ECDSA_P256 = new elliptic.ec('p256');
const ECDSA_secp256k1 = new elliptic.ec('secp256k1');

const bufferEndianness = 'be';

function getEC(sigAlgo: SignatureAlgorithm): elliptic.ec {
  switch (sigAlgo) {
    case SignatureAlgorithm.ECDSA_P256:
      return ECDSA_P256;
    case SignatureAlgorithm.ECDSA_secp256k1:
      return ECDSA_secp256k1;
  }
}

class InvalidECSignatureError extends Error {}

class ECSignature {
  private static n = 32;
  private r: Buffer;
  private s: Buffer;

  constructor(r: Buffer, s: Buffer) {
    this.r = r;
    this.s = s;
  }

  public static fromECSignature(ecSignature: elliptic.ec.Signature): ECSignature {
    return new ECSignature(
      ecSignature.r.toBuffer(bufferEndianness, ECSignature.n),
      ecSignature.s.toBuffer(bufferEndianness, ECSignature.n),
    );
  }

  public static fromHex(hex: string): ECSignature {
    const buffer = Buffer.from(hex, 'hex');
    return ECSignature.fromBuffer(buffer);
  }

  public static fromBuffer(buffer: Buffer): ECSignature {
    if (buffer.length !== ECSignature.n * 2) {
      throw new InvalidECSignatureError(`signature must have length ${ECSignature.n * 2}`);
    }

    return new ECSignature(buffer.slice(0, ECSignature.n), buffer.slice(ECSignature.n));
  }

  toObject(): { r: string; s: string } {
    return {
      r: this.r.toString('hex'),
      s: this.s.toString('hex'),
    };
  }

  toBuffer(): Buffer {
    return Buffer.concat([this.r, this.s]);
  }

  toHex(): string {
    return this.toBuffer().toString('hex');
  }
}

export class ECPublicKey implements PublicKey {
  private static size = 32;
  private ecKeyPair: elliptic.ec.KeyPair;
  private sigAlgo: SignatureAlgorithm;

  constructor(ecKeyPair: elliptic.ec.KeyPair, sigAlgo: SignatureAlgorithm) {
    this.ecKeyPair = ecKeyPair;
    this.sigAlgo = sigAlgo;
  }

  public static fromBuffer(buffer: Buffer, sigAlgo: SignatureAlgorithm): ECPublicKey {
    const hex = buffer.toString('hex');
    return ECPublicKey.fromHex(hex, sigAlgo);
  }

  public static fromHex(hex: string, sigAlgo: SignatureAlgorithm): ECPublicKey {
    const ec = getEC(sigAlgo);

    // Public Key MUST be either:
    // 1) '04' + hex string of x + hex string of y; or
    // 2) object with two hex string properties (x and y); or
    // 3) object with two buffer properties (x and y)
    const publicKey = '04' + hex;

    const ecKeyPair = ec.keyFromPublic(publicKey, 'hex');

    return new ECPublicKey(ecKeyPair, sigAlgo);
  }

  verify(message: Buffer, signature: Buffer): boolean {
    try {
      const ecSignature = ECSignature.fromBuffer(signature);
      return this.ecKeyPair.verify(message, ecSignature.toObject());
    } catch (e) {
      return false;
    }
  }

  toBuffer(): Buffer {
    const publicKey = this.ecKeyPair.getPublic();

    const x = publicKey.getX().toArrayLike(Buffer, bufferEndianness, ECPublicKey.size);
    const y = publicKey.getY().toArrayLike(Buffer, bufferEndianness, ECPublicKey.size);

    return Buffer.concat([x, y]);
  }

  toHex(): string {
    return this.toBuffer().toString('hex');
  }

  signatureAlgorithm(): SignatureAlgorithm {
    return this.sigAlgo;
  }
}

export class InMemoryECPrivateKey {
  private ecKeyPair: elliptic.ec.KeyPair;
  private sigAlgo: SignatureAlgorithm;

  private constructor(ecKeyPair: elliptic.ec.KeyPair, sigAlgo: SignatureAlgorithm) {
    this.ecKeyPair = ecKeyPair;
    this.sigAlgo = sigAlgo;
  }

  public static fromBuffer(buffer: Buffer, sigAlgo: SignatureAlgorithm): InMemoryECPrivateKey {
    const ec = getEC(sigAlgo);
    const ecKeyPair = ec.keyFromPrivate(buffer);
    return new InMemoryECPrivateKey(ecKeyPair, sigAlgo);
  }

  public static fromHex(hex: string, sigAlgo: SignatureAlgorithm): InMemoryECPrivateKey {
    const buffer = Buffer.from(hex, 'hex');
    return InMemoryECPrivateKey.fromBuffer(buffer, sigAlgo);
  }

  sign(digest: Buffer): Buffer {
    const ecSignature = this.ecKeyPair.sign(digest);
    return ECSignature.fromECSignature(ecSignature).toBuffer();
  }

  getPublicKey(): PublicKey {
    const pubPoint = this.ecKeyPair.getPublic();

    const ec = getEC(this.sigAlgo);

    const x = pubPoint.getX();
    const y = pubPoint.getY();

    const publicKey = {
      x: x.toString('hex'),
      y: y.toString('hex'),
    };

    const ecKeyPair = ec.keyFromPublic(publicKey);

    return new ECPublicKey(ecKeyPair, this.sigAlgo);
  }

  getSignatureAlgorithm(): SignatureAlgorithm {
    return this.sigAlgo;
  }

  toBuffer(): Buffer {
    return this.ecKeyPair.getPrivate().toArrayLike(Buffer, bufferEndianness);
  }

  toHex(): string {
    return this.toBuffer().toString('hex');
  }
}

export class InMemoryECSigner implements Signer {
  private privateKey: InMemoryECPrivateKey;
  private hasher: Hasher;

  constructor(privateKey: InMemoryECPrivateKey, hashAlgo: HashAlgorithm) {
    this.privateKey = privateKey;
    this.hasher = getHasher(hashAlgo);
  }

  sign(message: Buffer): Buffer {
    const digest = this.hasher.hash(message);
    return this.privateKey.sign(digest);
  }
}
