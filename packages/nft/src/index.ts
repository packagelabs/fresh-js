const Handlebars = require('handlebars');
const fcl = require('@onflow/fcl');
const t = require('@onflow/types');

fcl.config().put('accessNode.api', 'http://localhost:8888');

import * as path from 'path';
import * as fs from 'fs';

import { Field, fieldTypes } from './metadata/fields';
import { Signer } from '@fresh-js/crypto';
import { hashMetadata } from './metadata';

interface MintResult {
  id: string;
  transactionId: string;
  metadata: Metadata;
  metadataHash: string;
}

interface RevealResult {
  id: string;
  transactionId: string;
  metadata: Metadata;
  metadataHash: string;
}

type Metadata = { [key: string]: any }

export class OnChainMintRevealProject {
  contractName: string;
  contractAddress: string | null;
  metadataSalt: Buffer;

  static defaultFields: Field[] = [
    new Field('name', fieldTypes.String),
    new Field('description', fieldTypes.String),
    new Field('image', fieldTypes.IPFSImage),
  ]

  userFields: Field[];

  transactions: OnChainMintRevealTransactionGenerator;

  constructor({
    contractName,
    contractAddress,
    fields,
  }: {
    contractName: string;
    contractAddress: string | null;
    fields: Field[];
  }) {
    this.contractName = contractName;
    this.contractAddress = contractAddress || null;
    this.userFields = fields;

    // TODO: make parameter
    this.metadataSalt = Buffer.alloc(10);

    const allFields = this.fields();

    this.transactions = new OnChainMintRevealTransactionGenerator({ contractName, contractAddress, fields: allFields });
  }

  fields(): Field[] {
    return [
      ...OnChainMintRevealProject.defaultFields,
      ...this.userFields
    ]
  }

  async mint(metadata: Metadata[], options: TransactionOptions): Promise<MintResult[]> {

    const fields = this.fields();

    const metadataHashes = metadata.map(
      metadata => hashMetadata(fields, this.metadataSalt, metadata).toString("hex")
    )

    const transaction = await this.transactions.mint();

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([fcl.arg(metadataHashes, t.Array(t.String))]),
      fcl.limit(1000),

      // TODO: move these to standard helper function on TransactionOptions
      fcl.payer(options.payer.toFCLAuthorizationFunction()),
      fcl.proposer(options.proposer.toFCLAuthorizationFunction()),
      fcl.authorizations(options.authorizers.map((authorizer) => authorizer.toFCLAuthorizationFunction())),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { error, events } = await fcl.tx(response).onceSealed();

    return this.formatMintResults(transactionId, events, metadata, metadataHashes);
  }

  private formatMintResults(
    transactionId: string,
    events: any[],
    metadata: Metadata[],
    metadataHashes: string[]
  ): MintResult[] {
    const deposits = events.filter((event) => event.type.includes('.Minted'));

    return deposits.map((deposit, i) => {
      return {
        id: deposit.data.id,
        transactionId,
        metadata: metadata[i],
        metadataHash: metadataHashes[i],
      };
    });
  }

  async reveal(ids: string[], metadata: Metadata[], options: TransactionOptions): Promise<RevealResult[]> {

    const fields = this.fields();

    const metadataHashes = metadata.map(
      metadata => hashMetadata(fields, this.metadataSalt, metadata).toString("hex")
    )

    const transaction = await this.transactions.reveal();

    console.log(transaction);

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(ids, t.Array(t.UInt64)),
        ...fields.map(field => {
          return fcl.arg(
            metadata.map(values => field.getValue(values)),
            t.Array(field.type.cadenceType)
          )
        })
      ]),
      fcl.limit(1000),

      // TODO: move these to standard helper function on TransactionOptions
      fcl.payer(options.payer.toFCLAuthorizationFunction()),
      fcl.proposer(options.proposer.toFCLAuthorizationFunction()),
      fcl.authorizations(options.authorizers.map((authorizer) => authorizer.toFCLAuthorizationFunction())),
    ]);

    const { transactionId } = response;

    // TODO: handle error
    const { error, events } = await fcl.tx(response).onceSealed();

    return this.formatRevealtResults(transactionId, events, metadata, metadataHashes)
  }

  private formatRevealtResults(
    transactionId: string,
    events: any[],
    metadata: Metadata[],
    metadataHashes: string[]
  ): RevealResult[] {
    const deposits = events.filter((event) => event.type.includes('.Revealed'));

    return deposits.map((deposit, i) => {
      return {
        id: deposit.data.id,
        transactionId,
        metadata: metadata[i],
        metadataHash: metadataHashes[i],
      };
    });
  }

  async contract(): Promise<string> {
    const src = './templates/cadence/on-chain-mint-reveal/contracts/NFT.cdc';

    const templateSource = await fs.promises.readFile(path.resolve(__dirname, src), 'utf8');
    const template = Handlebars.compile(templateSource);

    return template({ name: this.contractName, fields: this.fields });
  }
}

class TransactionGenerator {
  contractName: string;
  contractAddress: string | null;
  fields: Field[];

  constructor({
    contractName,
    contractAddress,
    fields,
  }: {
    contractName: string;
    contractAddress: string | null;
    fields: Field[];
  }) {
    this.contractName = contractName;
    this.contractAddress = contractAddress || null;
    this.fields = fields;
  }

  async startDrop(): Promise<string> {
    const src = './templates/cadence/common/transactions/queue/start_drop.cdc';

    const templateSource = await fs.promises.readFile(path.resolve(__dirname, src), 'utf8');

    const template = Handlebars.compile(templateSource);

    return template({ contractName: this.contractName, contractAddress: this.contractAddress });
  }
}

class OnChainMintRevealTransactionGenerator extends TransactionGenerator {
  async mint(): Promise<string> {
    const src = './templates/cadence/on-chain-mint-reveal/transactions/mint.cdc';

    const templateSource = await fs.promises.readFile(path.resolve(__dirname, src), 'utf8');

    const template = Handlebars.compile(templateSource);

    return template({ contractName: this.contractName, contractAddress: this.contractAddress });
  }

  async reveal(): Promise<string> {
    const src = './templates/cadence/on-chain-mint-reveal/transactions/reveal.cdc';

    const templateSource = await fs.promises.readFile(path.resolve(__dirname, src), 'utf8');

    const template = Handlebars.compile(templateSource);

    return template({ contractName: this.contractName, contractAddress: this.contractAddress, fields: this.fields });
  }
}

interface TransactionOptions {
  payer: Authorizer;
  proposer: Authorizer;
  authorizers: [Authorizer];
}

const toHex = (buffer: Buffer) => buffer.toString('hex');
const fromHex = (hex: string) => Buffer.from(hex, 'hex');

export class Authorizer {
  address: string;
  keyIndex: number;
  signer: Signer;

  constructor({ address, keyIndex, signer }: { address: string; keyIndex: number; signer: Signer }) {
    this.address = address;
    this.keyIndex = keyIndex;
    this.signer = signer;
  }

  toFCLAuthorizationFunction() {
    return async (account = {}) => {
      return {
        ...account,
        tempId: 'SIGNER',
        addr: fcl.sansPrefix(this.address),
        keyId: this.keyIndex,
        signingFunction: (data: any) => ({
          addr: fcl.withPrefix(this.address),
          keyId: this.keyIndex,
          signature: toHex(this.signer.sign(fromHex(data.message))),
        }),
      };
    };
  }
}
