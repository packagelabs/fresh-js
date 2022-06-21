// @ts-ignore
import * as fcl from '@onflow/fcl';

import { Authorizer, Config } from '@fresh-js/core';
import * as schema from '../schema';

export type ProjectAuthorizers = {
  minter?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;
};

export default class Project {
  config: Config;

  contractName: string;
  contractAddress?: string;

  defaultAuthorizer?: Authorizer;
  minter?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;

  static defaultFields: schema.Field[] = [
    new schema.String('name'),
    new schema.String('description'),
    new schema.IPFSImage('image'),
  ];

  schema: schema.Field[];

  constructor({
    config,
    contractName,
    contractAddress,
    schema,
    authorizers,
  }: {
    config: Config;
    contractName: string;
    contractAddress?: string;
    schema: schema.Field[];
    authorizers?: ProjectAuthorizers;
  }) {
    this.config = config;

    this.contractName = contractName;
    this.contractAddress = contractAddress;

    this.schema = [...Project.defaultFields, ...schema];

    if (authorizers) {
      this.minter = authorizers.minter;
      this.payer = authorizers.payer;
      this.proposer = authorizers.proposer;
    }

    // TODO: find a better way to set this.
    //
    // Global config is messy but FCL requires it
    fcl.config().put('accessNode.api', this.config.host);
  }

  setDefaultAuthorizer(auth: Authorizer) {
    this.defaultAuthorizer = auth;
  }

  setMinter(auth: Authorizer) {
    this.minter = auth;
  }

  setPayer(auth: Authorizer) {
    this.payer = auth;
  }

  setProposer(auth: Authorizer) {
    this.proposer = auth;
  }

  protected getAuthorizers(authorizers?: ProjectAuthorizers) {
    const minterAuth = authorizers?.minter ?? this.minter ?? this.defaultAuthorizer;
    if (!minterAuth) {
      // TODO: improve error message
      throw 'must specify admin account';
    }

    const payerAuth = authorizers?.payer ?? this.payer ?? this.defaultAuthorizer;
    if (!payerAuth) {
      // TODO: improve error message
      throw 'must specify payer account';
    }

    const proposerAuth = authorizers?.proposer ?? this.proposer ?? this.defaultAuthorizer;
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
