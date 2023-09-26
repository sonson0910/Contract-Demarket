import {
    Blockfrost,
    C,
    Data,
    Lucid,
    SpendingValidator,
    TxHash,
    fromHex,
    toHex,
    Wallet,
} from "https://deno.land/x/lucid@0.8.4/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

const lucid = await Lucid.new(
    new Blockfrost(
        "https://cardano-preview.blockfrost.io/api/v0",
        // Deno.env.get("API_KEY"),
        "previewad7caqvYiu70SZAKSYQKg3EE9WsIrcF3",
    ),
    "Preview",
);

const wallet = lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./owner.sk"));

// const txHash = payNFTToAddress()
// const txHash = payToAddress();
// console.log(txHash)


async function payToAddress(): Promise<TxHash> {
    const tx = await lucid.newTx()
        .payToAddress("addr_test1qpkxr3kpzex93m646qr7w82d56md2kchtsv9jy39dykn4cmcxuuneyeqhdc4wy7de9mk54fndmckahxwqtwy3qg8pums5vlxhz", { lovelace: 2000000n })
        .attachMetadata(1, { msg: "Hello from Lucid." })
        .complete();

    const signedTx = await tx.sign().complete();

    const txHash = await signedTx.submit();
}

async function payNFTToAddress(): Promise<TxHash> {
    const policyId = "88a63b655e94df38af3f0e4fb02cc111edfa769c5b8fce1eeb17bd77";
    const assetName = "000de1404e46542039";

    const NFT = policyId + assetName;

    console.log(policyId + assetName);

    const tx = await lucid.newTx()
        .payToAddress("addr_test1vqhs6zag6mfkr8qj8l59sh5mfx7g0ay6hc8qfza6y8mzp9c3henpx", {
            [NFT]: 1n
        })
        .complete();

    const signedTx = await tx.sign().complete();

    const txHash = await signedTx.submit();
}

// --- Supportinew



// --------- Lock NFT
// Doc trinh xac nhan giao dich dau tien (Ham dau tien trong aiken bien dich)
const validator = await readValidator();

async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
    return {
        type: "PlutusV2",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
    };
}

// Lay publickey tu vi nguoi mua
const ownerPublicKeyHash = lucid.utils.getAddressDetails(
    await lucid.wallet.address()
).paymentCredential.hash;

// Lay public key tu vi nguoi ban, khong tra ve gi ca
const beneficiaryPublicKeyHash =
    lucid.utils.getAddressDetails("addr_test1vqzm7agsc3hmzzcmakfd77h3eag2xnh3gneagcs8n8nvusc5nz6zw")
        .paymentCredential.hash;
// --------------------------------------------------------------------------


const Datum = Data.Object({
    policyId: Data.String,
    assetName: Data.String,
    seller: Data.String, // we can pass owner's verification key hash as byte array but also as a string
    buyer: Data.String,
    price: Data.String,
});

type Datum = Data.Static<typeof Datum>;

const Price = "50000000";

const policyId = "9abbe1414ca0dbcedc623c40470f85e9a17301c91fab84afd555cb68";
const assetName = "000de14074657374";
console.log(1)
// Khoi tao datum
const datum = Data.to<Datum>(
    {
        policyId: policyId,
        assetName: assetName,
        seller: ownerPublicKeyHash, // our own wallet verification key hash
        buyer: beneficiaryPublicKeyHash,
        price: Price,
    },
    Datum
);
console.log(1)

const NFT = policyId + assetName;

// Goi ham lock phia duoi
const txLock = await lock(NFT, { into: validator, datum: datum });

// gui len onchain
await lucid.awaitTx(txLock);

console.log(`NFT locked into the contract
    Tx ID: ${txLock}
    Datum: ${datum}
`);

// --- Supporting functions

// Lock NFT len hop dong
async function lock(NFT, { into, datum }): Promise<TxHash> {
    // Lay dia chi tu validator trong script
    const contractAddress = lucid.utils.validatorToAddress(into);
    console.log(contractAddress);

    // Khoi tao giao dich
    const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datum }, { [NFT]: 1n }) // Chuyen UTxO len hop dong (contract address, truyen Datum vao dau vao, va truyen NFT)
        .complete();

    const signedTx = await tx.sign().complete(); // Ki

    return signedTx.submit(); // submit
}

