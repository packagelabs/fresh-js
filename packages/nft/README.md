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
import { OnChainCollection, metadata } from '@fresh-js/nft';

const collection = new OnChainCollection({
  config: TestnetConfig,
  name: 'MyNFTContract',
  address: '0xf8d6e0586b0a20c7', // Optional: will be set after call to deployContract()
  schema: metadata.defaultSchema.extend([
    metadata.String('foo'),
    metadata.Int('bar')
  ]),
});
```

Read more: [defining a metadata schema](#metadata-schemas).

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
import { HashAlgorithm } from '@fresh-js/crypto';

const collection = new OnChainCollection(...);

// Specify a public key (with hash algorithm)
// to attach to the contract account.
const publicKey = privateKey.getPublicKey();
const hashAlgorithm = HashAlgorithm.SHA3_256;

// Note: the call to deployContract() will 
// automatically update collection.address.
const contractAddress = await collection.deployContract(publicKey, hashAlgorithm);
```

## Create a metadata schema

A metadata schema defines the structure of an NFT collection.

Today, a schema is simply a list of field types. 
However, Fresh NFT may support more complex schema models in the future (e.g. sets and editions).

```js
import { metadata } from '@fresh-js/nft';

// Create a schema with two fields:
// - "foo" is a string field
// - "bar" is an integer field
const schema = metadata.createSchema({
  foo: metadata.String(),
  bar: metadata.Int()
});
```

### Default schema

Fresh NFT defines a default schema.
This is the minimum set of fields required to
implement the [Display](https://github.com/onflow/flow-nft#list-of-common-views)
metadata view.

```js
const defaultSchema = metadata.createSchema(
  [
    name: metadata.String(),
    description: metadata.String(),
    thumbnail: metadata.IPFSImage(),
  ],
  {
    // The default schema implements the MetadataViews.Display view.
    views: [
      (fields) => metadata.DisplayView({
        name: fields.name,
        description: fields.description,
        thumbnail: fields.thumbnail,
      })
    ]
  }
);
```

You can use the default schema as a starting place
and extend it with additional fields.

```js
import { metadata } from '@fresh-js/nft';

const schema = metadata.defaultSchema.extend([
  foo: metadata.String(),
  bar: metadata.Int(),
]);
```

### Supported metadata fields

|Name|Identifier|
|----|----------|
|String|`string`|
|Bool|`bool`|
|Int|`int`|
|UInt|`uint`|
|Fix64|`fix64`|
|UFix64|`ufix64`|
|IPFSImage|`ipfs-image`|

### Custom metadata fields

You can define custom metadata fields using the `defineField` function.

```js
import * as t from '@onflow/types';
import { metadata } from '@fresh-js/nft';

const MyCustomFieldType = metadata.defineField({
  id: 'my-custom-field-type',
  label: 'My Custom Field Type',
  cadenceType: t.String,
  sampleValue: 'This is a custom field!',
})

const schema = metadata.createSchema({
  foo: metadata.String(),
  bar: MyCustomFieldType(),
});
```

### Parse a raw metadata schema

You can represent a metadata schema as a raw JavaScript (or JSON) object.
The `type` field must match a field identifier from the table above.

```js
const rawSchema = {
  fields: [
    {
      name: 'foo',
      type: 'string'
    },
    {
      name: 'bar',
      type: 'int'
    }
  ]
};
```

Use the `parseSchema` function to convert a raw schema into a `metadata.Schema` object:

```js
import { metadata } from '@fresh-js/nft';

const schema = metadata.parseSchema(rawSchema);
```

## Blind mint NFTs

Use an `OnChainBlindCollection` to create NFTs that can be blindly minted.
In a blind mint, NFTs are initially minted as partial objects with their metadata hidden.
The collection owner can then reveal the metadata at a later point in time.

Fresh NFT implements blind minting using two separate mint and reveal transactions:

1. The first transaction mints an NFT in its hidden form. 
A hidden NFT contains a SHA256 hash of the complete metadata that 
can later be used to verify the integrity of the revealed metadata.
2. The second transaction publishes the NFT metadata to the blockchain.
The hidden NFT is converted into a full NFT containing a complete
on-chain metadata record.

### Set up a blind collection

```js
import { TestnetConfig, Authorizer } from '@fresh-js/core';
import { OnChainBlindCollection, metadata } from '@fresh-js/nft';

// Intialize your owner authorizer.
const owner = new Authorizer(...);

const collection = new OnChainBlindCollection({
  config: TestnetConfig,
  name: 'MyNFTContract',
  schema: metadata.defaultSchema,
  owner,
});
```

### Deploy the contract

```js
import { HashAlgorithm } from '@fresh-js/crypto';

// Specify a public key (with hash algorithm)
// to attach to the contract account.
const publicKey = privateKey.getPublicKey();
const hashAlgorithm = HashAlgorithm.SHA3_256;

// Specify the IPFS hash of an image (JPEG, PNG, etc)
// to be used as a placeholder for hidden NFTs.
const placeholderImage = 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam';

const address = await collection.deployContract(
  publicKey,
  hashAlgorithm,
  placeholderImage
);
```

### Step 1: Mint NFTs

```js
// Note: the metadata fields provided must match those
// defined in your metadata schema.
const nfts = [
  {
    name: 'NFT 1',
    description: 'NFT 1 is awesome.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
  {
    name: 'NFT 2',
    description: 'NFT 2 is even better.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
];

const mintedNFTs = await collection.mintNFTs(nfts);

console.log(mintedNFTs);
```

This will print:

```
[
  {
    id: "0",
    metadata: {
      name: "NFT 1",
      description: "NFT 1 is awesome.",
      thumbnail: "bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam"
    },
    metadataHash: "ed94560233ee34cf059e846560b43b462d0337e21d563f668404ee4cee407c97",
    metadataSalt: "727ca86ae4a338f21e83ec330f490bcf",
    transactionId: "20d0c77028d9a23347330956e8cd253fbe96a225e5cb42a4450fdc2e5cefa8c1"
  },
  {
    id: "1",
    metadata: {
      name: "NFT 2",
      description: "NFT 2 is even better.",
      thumbnail: "bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam"
    },
    metadataHash: "504b154e868692932e2ef77900459915d3ab97be6150b2eac03c65b233cfbb8c",
    metadataSalt: "18087aeaa388597b81cafdf4d2f6d81f",
    transactionId: "20d0c77028d9a23347330956e8cd253fbe96a225e5cb42a4450fdc2e5cefa8c1"
  }
]
```

The `mintNFTs` function generates a unique salt for each minted NFT.
The salt is used to compute the metadata hash and prevents users from hash-grinding
against a known set of possible metadata values.

Important: you **must** save the `id`, `metadata` and `metadataSalt` fields for each NFT.
You'll need them to later reveal the NFTs.

#### Randomized minting

Blind NFTs are often minted in a random order. To randomize your mint,
shuffle your input array before calling `mintNFTs()`.
Fresh NFT does not support automatic randomization at this point.

It's important to note that this will only randomize the NFT metadata.
The minted NFT IDs will still be sequential (i.e. 0, 1, 2, etc).

### Step 2: Reveal NFTs

You can reveal your NFTs at any time.
You also have the option to reveal NFTs one by one, all at once, or in batches.

```js
const nft0 = {
  id: '0',
  metadata: {
    name: 'NFT 1',
    description: 'NFT 1 is awesome.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
  metadataHash: 'ed94560233ee34cf059e846560b43b462d0337e21d563f668404ee4cee407c97',
  metadataSalt: '727ca86ae4a338f21e83ec330f490bcf',
  transactionId: '20d0c77028d9a23347330956e8cd253fbe96a225e5cb42a4450fdc2e5cefa8c1'
}

const nft1 = {
  id: '1',
  metadata: {
    name: 'NFT 2',
    description: 'NFT 2 is awesome.',
    thumbnail: 'bafybeidlkqhddsjrdue7y3dy27pu5d7ydyemcls4z24szlyik3we7vqvam',
  },
  metadataSalt: '18087aeaa388597b81cafdf4d2f6d81f',
}

// Reveal a single NFT
await collection.revealNFTs([nft0]);

// Reveal multiple NFTs
await collection.revealNFTs([nft0, nft1]);
```

## NFT reveal strategies

As a collection owner, there are multiple ways you can reveal your NFTs.

### Bulk manual reveal

This is the simplest strategy. You can choose a point in time to reveal
all NFTs at once (usually once the collection is sold out).

All users see their NFTs at the same time.

```js
async function bulkReveal() {
  // This implementation assumes that you have stored all NFT metadata
  // and salt values in your database.
  const nfts = await loadNFTsFromDatabase();
  
  console.log(nfts);

  // [
  //  { 
  //    id: '0',
  //    metadata: { ... },
  //    metadataSalt: '727ca86ae4a338f21e83ec330f490bcf'
  //  },
  //  ...
  // ]

  await collection.revealNFTs(nfts);
}
```

### Reveal on purchase

In this strategy, each NFT is revealed immediately after it is claimed by a buyer.
The NFTs are revealed one by one until all NFTs are claimed.

An individual user sees their revealed NFT shortly after they buy it.

This strategy assumes you are using the [claim sale](#claim-sale) distribution method.

```js
import * as fcl from '@onflow/fcl';

// This implementation assumes you have the transaction ID
// of the buyer's claim transaction (i.e. by capturing on your frontend).
//
// An alternate and more robust implementation would subscribe
// to 'NFTClaimSale.Claimed' events and trigger a reveal.
async function revealAfterPurchase(transactionId) {
  const { events } = await fcl.tx({ transationId }).onceSealed();
  
  const claimEvent = events.find(
    // Note: this is the event ID for testnet.
    (event) => event.type === 'A.f6908f3ab6c14d81.NFTClaimSale.Claimed'
  );

  const nftId = claimEvent.data['nftID'];

  // This implementation assumes that you have stored the NFT metadata
  // and salt in your database.
  const { metadata, metadataSalt } = await loadNFTFromDatabase(nftId);

  await collection.reveal([{
    id: nftId,
    metadata,
    metadataSalt
  }]);
}
```

## NFT distribution

Fresh NFT provides several distribution methods that you can use
after minting your NFT collection.

### Claim sale

In a claim sale, a user purchases an NFT from a collection but does not see the NFT
until after the purchase.

```js
import { ClaimSale } from '@fresh-js/nft';

const collection = new OnChainBlindCollection(...);

// After minting your NFTs...

const sale = new ClaimSale(collection);

// Start a new claim sale for 10 FLOW
await sale.start("10.0");

// Stop the claim sale. 
// The unsold NFTs stay in the collection owner's account.
await sale.stop();
```

### Direct sale

Coming soon!
