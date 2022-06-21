import * as schema from '../schema';
import TemplateGenerator, { Contracts } from './TemplateGenerator';

export default class OnChainMintRevealGenerator extends TemplateGenerator {
  static async contract({
    contracts,
    contractName,
    schema,
  }: {
    contracts: Contracts;
    contractName: string;
    schema: schema.Field[];
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/contracts/NFT.cdc', {
      contracts,
      contractName,
      fields: schema,
    });
  }

  static async deploy(): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/transactions/deploy.cdc', {});
  }

  static async mint({
    contracts,
    contractName,
    contractAddress,
  }: {
    contracts: Contracts;
    contractName: string;
    contractAddress: string;
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/transactions/mint.cdc', {
      contracts,
      contractName,
      contractAddress,
    });
  }

  static async reveal({
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
    return this.generate('../templates/cadence/on-chain-mint-reveal/transactions/reveal.cdc', {
      contracts,
      contractName,
      contractAddress,
      fields: schema,
    });
  }
}
