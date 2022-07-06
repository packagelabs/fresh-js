# Fresh NFT

The Fresh NFT package provides the core pieces needed to deploy,
mint and distribute NFTs on Flow. 
It also powers [Freshmint](https://github.com/packagelabs/freshmint).

## Install

```sh
npm i @fresh-js/nft
```

## Create an NFT collection

An NFT collection is a set of NFTs that share the same type structure.
A collection is defined by a Cadence contract that implements the [Flow NFT interface](https://github.com/onflow/flow-nft).
All NFTs in a collection are minted by the same contract.

Fresh NFT supports the following collection types:

|Name                    |Metadata Format|Metadata Views Support|Blind Minting Support|
|------------------------|---------------|----------------------|---------------------|
|`OnChainCollection`     |On-chain       |Yes                   |No                   |
|`OnChainBlindCollection`|On-chain       |Yes                   |Yes                  |

```js
import { TestnetConfig } from '@fresh-js/core';
import { OnChainCollection } from '@fresh-js/nft';

const collection = new OnChainCollection({
  config: TestnetConfig,
  name: 'MyNFTContract',
  address: '0xf8d6e0586b0a20c7', // Optional: will be set after call to deployContract()
  schema: [
    new schema.String('foo'),
    new schema.Int('bar')],
  ]
});
```

### Metadata schema

A metadata schema defines the structure of an NFT collection.

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

By default, Fresh NFT defines the following fields for every NFT collection.

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

## Configure the collection owner

You will need to configure a collection owner before you can
deploy a contract or mint NFTs. The owner is the account that will
mint, reveal and manage your NFTs.

### Define an authorizer

The owner is defined as an `Authorizer`, an object that can authorize transactions for a specific Flow account.

The snippet below shows how to define an authorizer from an ECDSA private key.

```js
import { Authorizer } from '@fresh-js/core';
import { 
  InMemoryECPrivateKey, 
  InMemoryECSigner, 
  HashAlgorithm,
  SignatureAlgorithm
} from '@fresh-js/crypto';

const privateKey = InMemoryECPrivateKey.fromHex(
  process.env.PRIVATE_KEY, 
  SignatureAlgorithm.ECDSA_P256,
);
const signer = new InMemoryECSigner(privateKey, HashAlgorithm.SHA3_256);

const authorizer = new Authorizer({ 
  address: '0xf8d6e0586b0a20c7',
  keyIndex: 0,
  signer,
});
```

### Set the owner

```js
const collection = new OnChainCollection(...);

// ...

collection.setOwner(authorizer);
```

### Use a separate payer or proposer

You can optionally specify separate payer or proposer authorizers.
This is useful if you would like to create multiple collections, 
each with a separate owner, but pay for all fees from a central account.

An NFT collection has three authorizer roles:

|Role|Actions|
|----|-------|
|Owner|Mints, reveals and distributes NFTs. This is the only account with administrator access to the NFT contract.|
|Payer|Pays fees for all transactions.|
|Proposer|Signs as the proposer on all transactions.|

Note: the collection owner will sign for any role that is not explicitly set.

```js
collection.setOwner(ownerAuthorizer);

collection.setPayer(payerAuthorizer);

collection.setProposer(proposerAuthorizer);
```

### Specify authorizers in the constructor

For convenience, you can pass the authorizers directly in the collection constructor:

```js
const collection = new OnChainCollection({
  // ...
  owner: ownerAuthorizer, 
  payer: payerAuthorizer
  proposer: proposerAuthorizer
});
```

## Deploy a collection

Deploy a collection's contract using the `deployContract()` method:

```js
const collection = new OnChainCollection(...);

// Note: the call to deployContract() will 
// automatically update collection.address.
const contractAddress = await collection.deployContract();
```

## Mint NFTs

TODO

## Distribute NFTs

### Claim sale

In a claim sale, a user purchases an NFT from a collection but does not see the NFT
until after the purchase.

The creator can set an optional allowlist to restrict claiming to a specific list of addresses.

A claim sale with a price of zero is equivalent to an airdrop.

### Direct sale

_Not yet supported._