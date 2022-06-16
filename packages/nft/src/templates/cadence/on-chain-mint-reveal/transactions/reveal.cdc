// TODO: replace with template vars
import NonFungibleToken from 0xf8d6e0586b0a20c7
import {{ contractName }} from {{ contractAddress }}

transaction(
    ids: [UInt64],
    metadataSalts: [String],
    {{#each fields}}
    {{ this.name }}: [{{ this.type.toCadence }}],
    {{/each}}
) {
    
    let admin: &{{ contractName }}.Admin

    prepare(signer: AuthAccount) {
        self.admin = signer.borrow<&{{ contractName }}.Admin>(from: {{ contractName }}.AdminStoragePath)
            ?? panic("Could not borrow a reference to the NFT admin")
    }

    execute {
        var i = 0

        for id in ids {

            let metadataSalt = metadataSalts[i]

            let metadata = {{ contractName }}.Metadata(
                metadataSalt: metadataSalt,
                {{#each fields}}
                {{ this.name }}: {{ this.name }}[i],
                {{/each}}
            )
        
            self.admin.revealNFT(
                id: id,
                metadata: metadata,
            )
        
            i = i +1
        }
    }
}
