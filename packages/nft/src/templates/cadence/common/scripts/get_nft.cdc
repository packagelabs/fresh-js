// TODO: replace with template vars
import NonFungibleToken from 0xf8d6e0586b0a20c7
import {{ contractName }} from {{ contractAddress }}

pub struct NFT {
    pub let id: UInt64
    pub let owner: Address
    
    pub let name: String
    pub let description: String
    pub let thumbnail: String

    init(
        id: UInt64,
        owner: Address,
        name: String,
        description: String,
        thumbnail: String
    ) {
        self.id = id
        self.owner = owner
        self.name = name
        self.description = description
        self.thumbnail = thumbnail
    }
}

pub fun main(address: Address, id: UInt64): NFT? {
    if let col = getAccount(address).getCapability<&{{ contractName }}.Collection{NonFungibleToken.CollectionPublic, {{ contractName }}.{{ contractName }}CollectionPublic}>({{ contractName }}.CollectionPublicPath).borrow() {
        if let nft = col.borrow{{ contractName }}(id: id) {

            let view = nft.resolveView(Type<MetadataViews.Display>())!

            let display = view as! MetadataViews.Display

            return NFT(
                id: id,
                owner: address,
                name: display.name,
                description: display.description,
                thumbnail: display.thumbnail.uri()
            )
        }
    }

    return nil
}
