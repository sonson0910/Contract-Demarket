use aiken/hash.{Blake2b_224, Hash}
use aiken/transaction/credential.{VerificationKey}
use aiken/list
use aiken/transaction.{Transaction, ScriptContext, Spend}
use aiken/transaction/value.{lovelace_of}
use aiken/int.{from_utf8}


type Datum {
  policyId: VerificationKeyHash,
  assetName: VerificationKeyHash,
  seller: VerificationKeyHash,
  buyer: VerificationKeyHash,
  price: ByteArray,
}

type VerificationKeyHash = 
    Hash<Blake2b_224, VerificationKey>
    
validator {
  fn contract(datum: Datum, _redeemer: Void, ctx: ScriptContext) {
    let ScriptContext {transaction, purpose} = ctx
    let Transaction {outputs, ..} = transaction

    let price_test: ByteArray = "50000000"
    expect Some(price) = from_utf8(price_test)
    // let price = 50000000
    expect Some(_output) = list.find(outputs, fn(output) {lovelace_of(output.value) + 5000000 >= price})

    when purpose is {
      Spend(_) ->
        or {
          must_be_signed_by(transaction, datum.seller),
          must_be_signed_by(transaction, datum.buyer),
        }
      _ -> False
    }
  }
  
  // fn redeemer(datum: Datum, ctx: ScriptContext) -> Bool {
  //   must_be_signed_by(ctx.transaction, datum.seller)
  // }
}
 
fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash) {
  list.has(transaction.extra_signatories, vk)
}
 
