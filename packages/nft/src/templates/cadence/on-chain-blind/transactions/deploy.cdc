transaction(
    contractName: String,
    contractCode: String,
    publicKeyHex: String,
    signatureAlgorithm: UInt8,
    hashAlgorithm: UInt8,
    placeholderImage: String
) {
    prepare(admin: AuthAccount) {
        let account = AuthAccount(payer: admin)

        let publicKey = PublicKey(
            publicKey: publicKeyHex.decodeHex(),
            signatureAlgorithm: SignatureAlgorithm(rawValue: signatureAlgorithm)!
        )

        account.keys.add(
            publicKey: publicKey,
            hashAlgorithm: HashAlgorithm(rawValue: hashAlgorithm)!,
            weight: 1000.0
        )

        account.contracts.add(
            name: contractName,
            code: contractCode.decodeHex(),
            admin,
            placeholderImage
        )
    }
}
