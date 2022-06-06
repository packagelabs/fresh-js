// TODO: replace with template vars
import NonFungibleToken from 0xf8d6e0586b0a20c7
import {{ contractName }} from {{ contractAddress }}

transaction(metadataHashes: [String]) {
    
    let admin: &{{ contractName }}.Admin
    let receiver: &{NonFungibleToken.CollectionPublic}

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
        
        self.receiver = signer
            .getCapability({{ contractName }}.CollectionPublicPath)!
            .borrow<&{NonFungibleToken.CollectionPublic}>()
            ?? panic("Could not get receiver reference to the NFT Collection")
    }

    execute {
        for metadataHash in metadataHashes {
            let token <- self.admin.mintNFT(metadataHash: metadataHash)

            self.receiver.deposit(token: <- token)
        }
    }
}
