import OnChainMintRevealProject from './projects/OnChainMintRevealProject';
export { OnChainMintRevealProject };

export class NetworkConfig {

  host: string;
  contracts: { [key: string]: string };

  constructor({
    host,
    contracts,
  }: {
    host: string,
    contracts: { [key: string]: string }
  }) {
    this.host = host;
    this.contracts = contracts;
  }
}

export const TestnetConfig = new NetworkConfig({
  host: "",
  contracts: {
    FungibleToken: '0x9a0766d93b6608b7',
    NonFungibleToken: '0x631e88ae7f1d7c20',
    MetadataViews: '0x631e88ae7f1d7c20'
  }
});

export const MainnetConfig = new NetworkConfig({
  host: "",
  contracts: {
    FungibleToken: '0xf233dcee88fe0abe',
    NonFungibleToken: '0x1d7e57aa55817448',
    MetadataViews: '0x1d7e57aa55817448',
  }
});

export { Field, fieldTypes, parseFields, MetadataMap, MetadataValue } from './metadata';
