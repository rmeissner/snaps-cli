const { errors: rpcErrors } = require('eth-json-rpc-errors')

const accounts = [];
updateUi();

wallet.registerRpcMessageHandler(async (_origin, req) => {
  switch (req.method) {
    case 'addAccount':
      addAccount(req.params);
      break;

    default:
      throw rpcErrors.methodNotFound(req)
  }

  updateUi();
  return true
})

async function sign(tx) {
  await confirm(`Transaction to sign: \n${JSON.stringify(tx)}`)
  let typedData = {
    types: {
        EIP712Domain: [
            { type: "address", name: "verifyingContract" }
        ],
        // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
        SafeTx: [
            { type: "address", name: "to" },
            { type: "uint256", name: "value" },
            { type: "bytes", name: "data" },
            { type: "uint8", name: "operation" },
            { type: "uint256", name: "safeTxGas" },
            { type: "uint256", name: "baseGas" },
            { type: "uint256", name: "gasPrice" },
            { type: "address", name: "gasToken" },
            { type: "address", name: "refundReceiver" },
            { type: "uint256", name: "nonce" },
        ]
    },
    domain: {
        verifyingContract: tx.from
    },
    primaryType: "SafeTx",
    message: {
        to: tx.to,
        value: tx.value,
        data: tx.data,
        operation: 0,
        safeTxGas: 0,
        baseGas: 0,
        gasPrice: 0,
        gasToken: 0,
        refundReceiver: 0,
        nonce: 0
    }
  }
  await confirm(`Data to sign: \n${JSON.stringify(typedData)}`)
  const accounts = await wallet.send({
    method: 'eth_accounts',
    params: [],
  })
  await confirm(`Accounts: ${JSON.stringify(accounts)}`)
  const signature = await wallet.send({
    method: 'eth_signTypedData_v4',
    params: [ accounts[0], typedData],
  })
  await confirm(`Signature ${JSON.stringify(signature)}`)
  return signature
}

wallet.registerAccountMessageHandler(async (origin, req) => {
  console.log("Handle method", req.method)
  switch (req.method) {
    case 'eth_signTransaction':
      const approved = await confirm(`Transaction will be submitted for confirmation to Safe for teams`)
      if (!approved) {
        throw rpcErrors.userRejectedRequest()
      }
      try {
        return await sign(req.params[0])
      } catch (e) {
        await confirm(`Error: \n${JSON.stringify(e)}`)
        throw e
      }
    default:
      throw rpcErrors.methodNotFound(req)
  }
})

async function addAccount (params) {
  validate(params);
  const account = params[0]
  const approved = await confirm(`Do you want to add offline account ${account} to your wallet?`)
  if (!approved) {
    throw rpcErrors.userRejectedRequest()
  }
  accounts.push(account);
  updateUi();
}

function validate (params) {
  if (params.length !== 1 || typeof params[0] !== 'string') {
    throw rpcErrors.invalidParams()
  }
}

async function confirm (message) {
  const response = await wallet.send({ method: 'confirm', params: [message] });
  return response.result;
}

async function prompt (message) {
  const response = await wallet.send({ method: 'prompt', params: [message] });
  return response.result;
}

function updateUi () {
  console.log('updating UI with accounts', accounts)
  accounts.forEach(async (account) => {
    console.log('issuing add for ', account)
    wallet.send({
      method: 'wallet_manageIdentities',
      params: [ 'add', { address: account }],
    })
    .catch((err) => console.log('Problem updating identity', err))
    .then((result) => {
      console.log('adding identity seems to have succeeded!')
    })
  })
}

