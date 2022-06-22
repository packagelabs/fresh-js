# Fresh NFT

The Fresh NFT package provides the core pieces needed to deploy,
mint and distribute NFTs on Flow. 
It also powers [Freshmint](https://github.com/packagelabs/freshmint).

## Install

```sh
npm i @fresh-js/nft
```

## Define a project

A `Project` is the configuration for a single NFT project or collection.

```js
import { TestnetConfig } from '@fresh-js/core';
import { Project } from '@fresh-js/nft';

const project = new Project({
  config: TestnetConfig,
  contractName: 'MyNFTContract',
  schema: [new schema.String('foo'), new schema.Int('bar')],
})
```

### Metadata schema

A metadata schema defines the structure of an NFT project.

Today, a schema is simply a list of field types. 
However, Fresh NFT may support more complex schema models in the future (e.g. sets and editions).

```js
import { schema } from '@fresh-js/nft';

const metadataSchema = [
  new schema.String('name'),
  new schema.Int('age')
];
```

#### Default schema fields

By default, Fresh NFT defines the following fields for every NFT project.

Creator-defined fields are appended to the default fields.

```js
import { schema } from '@fresh-js/nft';

const defaultSchema = [
  new schema.String('name'),
  new schema.String('description'),
  new schema.IPFSImage('image')
];
```

#### Supported fields

- `String`
- `Bool`
- `Int`
- `UInt`
- `Fix64`
- `UFix64`
- `IPFSImage`

## Deploy an NFT contract

After defining a project, you can instantiate a minter and deploy your contract.

```js
import { OnChainMinter } from '@fresh-js/nft';

// See minting methods below
const minter = new OnChainMinter(project);

await minter.deployContract();
```

## Mint NFTs

Fresh NFT supports several minting methods.

### On-chain minting

In this method, NFT metadata is stored on the blockchain and publicly readable at minting time.

### Blind on-chain minting

This method also stores NFT metadata on the blockchain,
but allows the creator to reveal the metadata at a later date 
(i.e. after all NFTs have been claimed).

### Off-chain minting

_Not yet supported._

## Distribute NFTs

### Claim sale

In a claim sale, a user purchases an NFT from a collection but does not see the NFT
until after the purchase.

The creator can set an optional allowlist to restrict claiming to a specific list of addresses.

A claim sale with a price of zero is equivalent to an airdrop.

### Direct sale

_Not yet supported._
