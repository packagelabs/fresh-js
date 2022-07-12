import * as metadata from '../metadata';
import TemplateGenerator, { Contracts } from './TemplateGenerator';

export default class OnChainMintRevealGenerator extends TemplateGenerator {
  static async contract({
    contracts,
    contractName,
    schema,
  }: {
    contracts: Contracts;
    contractName: string;
    schema: metadata.Schema;
  }): Promise<string> {
    const displayView = schema.getView(metadata.DisplayView.TYPE);

    return this.generate('../templates/cadence/on-chain-mint-reveal/contracts/NFT.cdc', {
      contracts,
      contractName,
      fields: schema.getFieldList(),
      // TODO: support multiple views
      displayView,
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
    schema: metadata.Schema;
  }): Promise<string> {
    return this.generate('../templates/cadence/on-chain-mint-reveal/transactions/reveal.cdc', {
      contracts,
      contractName,
      contractAddress,
      fields: schema.getFieldList(),
    });
  }
}
