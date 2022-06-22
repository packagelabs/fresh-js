// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Authorizer, Config } from '@fresh-js/core';
import * as schema from './schema';

export type ProjectAuthorizers = {
  default?: Authorizer;
  minter?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;
};

export default class Project {
  
  config: Config;

  contractName: string;
  contractAddress?: string;

  schema: schema.Field[];

  authorizers: ProjectAuthorizers;

  static defaultFields: schema.Field[] = [
    new schema.String('name'),
    new schema.String('description'),
    new schema.IPFSImage('image'),
  ];

  constructor({
    config,
    contractName,
    contractAddress,
    schema,
    authorizers
  }: {
    config: Config;
    contractName: string;
    contractAddress?: string;
    schema: schema.Field[];
    authorizers: ProjectAuthorizers;
  }) {
    this.config = config;

    this.contractName = contractName;
    this.contractAddress = contractAddress;

    this.schema = [...Project.defaultFields, ...schema];

    this.authorizers = authorizers;

    // TODO: find a better way to set this.
    //
    // Global config is messy but FCL requires it
    fcl.config().put('accessNode.api', this.config.host);
  }

  setContractAddress(address: string) {
    this.contractAddress = address;
  }

  getAuthorizers() {
    const minterAuth = this.authorizers.minter ?? this.authorizers.default;
    if (!minterAuth) {
      // TODO: improve error message
      throw 'must specify admin account';
    }

    const payerAuth = this.authorizers.payer ?? this.authorizers.default;
    if (!payerAuth) {
      // TODO: improve error message
      throw 'must specify payer account';
    }

    const proposerAuth = this.authorizers.proposer ?? this.authorizers.default;
    if (!proposerAuth) {
      // TODO: improve error message
      throw 'must specify proposer account';
    }

    return [
      fcl.payer(payerAuth.toFCLAuthorizationFunction()),
      fcl.proposer(proposerAuth.toFCLAuthorizationFunction()),
      fcl.authorizations([minterAuth.toFCLAuthorizationFunction()]),
    ];
  }
}
