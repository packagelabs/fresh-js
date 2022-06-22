// @ts-ignore
import * as fcl from '@onflow/fcl';

// @ts-ignore
import * as t from '@onflow/types';

import Project from "../Project";
import ClaimSaleGenerator from '../generators/ClaimSaleGenerator';

export default class ClaimSale {

  project: Project;

  constructor(project: Project) {
    this.project = project;
  }

  async start(price: string) {
    const transaction = await ClaimSaleGenerator.startSale({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.project.contractAddress ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.args([
        fcl.arg(price, t.UFix64)
      ]),
      fcl.limit(1000),

      ...this.project.getAuthorizers(),
    ]);

    // TODO: handle error
    const { error } = await fcl.tx(response).onceSealed();
  }

  async stop() {
    const transaction = await ClaimSaleGenerator.stopSale({
      contracts: this.project.config.contracts,
      contractName: this.project.contractName,
      // TODO: return error if contract address is not set
      contractAddress: this.project.contractAddress ?? '',
    });

    const response = await fcl.send([
      fcl.transaction(transaction),
      fcl.limit(1000),

      ...this.project.getAuthorizers(),
    ]);

    // TODO: handle error
    const { error } = await fcl.tx(response).onceSealed();
  }
}
