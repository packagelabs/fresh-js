import * as schema from '../schema';
import TemplateGenerator, { Contracts } from './TemplateGenerator';

export default class OnChainGenerator extends TemplateGenerator {
  static async contract({
    contracts,
    contractName,
    schema,
  }: {
    contracts: Contracts;
    contractName: string;
    schema: schema.Field[];
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain/contracts/NFT.cdc', {
      contracts,
      contractName,
      fields: schema,
    });
  }

  static async deploy(): Promise<string> {
    return this.generate('../templates/cadence/on-chain/transactions/deploy.cdc', {});
  }

  static async mint({
    contracts,
    contractName,
    contractAddress,
    schema,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
    schema: schema.Field[];
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain/transactions/mint.cdc', {
      contracts,
      contractName,
      contractAddress,
      fields: schema
    });
  }
}
