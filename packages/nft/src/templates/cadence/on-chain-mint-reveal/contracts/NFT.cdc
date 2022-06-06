import NonFungibleToken from "./NonFungibleToken.cdc"
import MetadataViews from "./MetadataViews.cdc"
import FungibleToken from "./FungibleToken.cdc"

pub contract {{ name }}: NonFungibleToken {

    // Events
    //
    pub event ContractInitialized()
    pub event Withdraw(id: UInt64, from: Address?)
    pub event Deposit(id: UInt64, to: Address?)
    pub event Minted(id: UInt64)
    pub event Revealed(id: UInt64)

    // Named Paths
    //
    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let CollectionPrivatePath: PrivatePath
    pub let AdminStoragePath: StoragePath

    // totalSupply
    // The total number of {{ name }} that have been minted
    //
    pub var totalSupply: UInt64

    // A placeholder image used to display NFTs that have not
    // yet been revealed.
    pub let placeholderImage: String

    // A salt that is published after all NFTs have been revealed.
    //
    // The salt is hex-encoded bytes that are appended to the metadata
    // values before generated a metadata hash.
    pub var metadataSalt: String

    pub struct Metadata {
        {{#each fields}}
        pub let {{ this.name }}: {{ this.type.toCadence }}
        {{/each}}

        init(
            {{#each fields}}
            {{ this.name }}: {{ this.type.toCadence }},
            {{/each}}
        ) {
            {{#each fields}}
            self.{{ this.name }} = {{ this.name }}
            {{/each}}
        }
    }

    access(contract) let metadata: {UInt64: Metadata}

    pub resource NFT: NonFungibleToken.INFT {

        pub let id: UInt64

        pub let metadataHash: String

        init(
            id: UInt64,
            metadataHash: String
        ) {
            self.id = id
            self.metadataHash = metadataHash
        }

        pub fun getViews(): [Type] {
            return [
                Type<MetadataViews.Display>()
            ]
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    return self.resolveDisplay()
            }

            return nil
        }

        pub fun resolveDisplay(): MetadataViews.Display {
            if let metadata = {{ name }}.metadata[self.id] {
                return MetadataViews.Display(
                    name: metadata.name,
                    description: metadata.description,
                    thumbnail: MetadataViews.IPFSFile(
                        cid: metadata.image, 
                        nil
                    )
                )
            }

            return MetadataViews.Display(
                name: "{{ name }} #".concat(self.id.toString()),
                description: "This NFT is not yet revealed.",
                thumbnail: MetadataViews.IPFSFile(
                    cid: {{ name }}.placeholderImage, 
                    nil
                )
            )
        }
    }

    pub resource interface {{ name }}CollectionPublic {
        pub fun deposit(token: @NonFungibleToken.NFT)
        pub fun getIDs(): [UInt64]
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
        pub fun borrow{{ name }}(id: UInt64): &{{ name }}.NFT? {
            post {
                (result == nil) || (result?.id == id):
                    "Cannot borrow {{ name }} reference: The ID of the returned reference is incorrect"
            }
        }
    }

    pub resource Collection: {{ name }}CollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic {
        
        // dictionary of NFTs
        // NFT is a resource type with an `UInt64` ID field
        //
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        // withdraw
        // Removes an NFT from the collection and moves it to the caller
        //
        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")

            emit Withdraw(id: token.id, from: self.owner?.address)

            return <- token
        }

        // deposit
        // Takes a NFT and adds it to the collections dictionary
        // and adds the ID to the id array
        //
        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @{{ name }}.NFT

            let id: UInt64 = token.id

            // add the new token to the dictionary which removes the old one
            let oldToken <- self.ownedNFTs[id] <- token

            emit Deposit(id: id, to: self.owner?.address)

            destroy oldToken
        }

        // getIDs
        // Returns an array of the IDs that are in the collection
        //
        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        // borrowNFT
        // Gets a reference to an NFT in the collection
        // so that the caller can read its metadata and call its methods
        //
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return (&self.ownedNFTs[id] as &NonFungibleToken.NFT?)!
        }

        // borrow{{ name }}
        // Gets a reference to an NFT in the collection as a {{ name }}.
        //
        pub fun borrow{{ name }}(id: UInt64): &{{ name }}.NFT? {
            if self.ownedNFTs[id] != nil {
                let ref = (&self.ownedNFTs[id] as auth &NonFungibleToken.NFT?)!
                return ref as! &{{ name }}.NFT
            }

            return nil
        }

        // destructor
        destroy() {
            destroy self.ownedNFTs
        }

        // initializer
        //
        init () {
            self.ownedNFTs <- {}
        }
    }

    // createEmptyCollection
    // public function that anyone can call to create a new empty collection
    //
    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        return <- create Collection()
    }

    // Admin
    // Resource that an admin can use to mint NFTs.
    //
    pub resource Admin {

        // mintNFT
        // Mints a new NFT with a new ID
        //
        pub fun mintNFT(metadataHash: String): @{{ name }}.NFT {
            let nft <- create {{ name }}.NFT(
                id: {{ name }}.totalSupply,
                metadataHash: metadataHash,
            )

            emit Minted(id: nft.id)

            {{ name }}.totalSupply = {{ name }}.totalSupply + (1 as UInt64)

            return <- nft
        }

        pub fun revealNFT(id: UInt64, metadata: Metadata) {
            pre {
                {{ name }}.metadata[id] == nil : "NFT has already been revealed"
            }

            {{ name }}.metadata[id] = metadata

            emit Revealed(id: id)
        }
    }

    // fetch
    // Get a reference to a {{ name }} from an account's Collection, if available.
    // If an account does not have a {{ name }}.Collection, panic.
    // If it has a collection but does not contain the itemID, return nil.
    // If it has a collection and that collection contains the itemID, return a reference to that.
    //
    pub fun fetch(_ from: Address, itemID: UInt64): &{{ name }}.NFT? {
        let collection = getAccount(from)
            .getCapability({{ name }}.CollectionPublicPath)!
            .borrow<&{ {{ name }}.{{ name }}CollectionPublic }>()
            ?? panic("Couldn't get collection")

        // We trust {{ name }}.Collection.borow{{ name }} to get the correct itemID
        // (it checks it before returning it).
        return collection.borrow{{ name }}(id: itemID)
    }

    // initializer
    //
    init() {
        // Set our named paths
        self.CollectionStoragePath = /storage/{{ name }}Collection
        self.CollectionPublicPath = /public/{{ name }}Collection
        self.CollectionPrivatePath = /private/{{ name }}Collection
        self.AdminStoragePath = /storage/{{ name }}Admin

        // Initialize the total supply
        self.totalSupply = 0

        // TODO: make these parameters
        self.placeholderImage = "foo"
        self.metadataSalt = "foo"

        self.metadata = {}

        let collection <- {{ name }}.createEmptyCollection()
        
        self.account.save(<- collection, to: {{ name }}.CollectionStoragePath)

        self.account.link<&{{ name }}.Collection>({{ name }}.CollectionPrivatePath, target: {{ name }}.CollectionStoragePath)

        self.account.link<&{{ name }}.Collection{NonFungibleToken.CollectionPublic, {{ name }}.{{ name }}CollectionPublic}>({{ name }}.CollectionPublicPath, target: {{ name }}.CollectionStoragePath)
        
        // Create an admin resource and save it to storage
        let admin <- create Admin()
        self.account.save(<- admin, to: self.AdminStoragePath)

        emit ContractInitialized()
    }
}
