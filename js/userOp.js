const ethers = require("ethers");
const { ZeroAddress } = ethers;

const defaultAbiCoder = ethers.AbiCoder.defaultAbiCoder();

function packAccountGasLimits(verificationGasLimit, callGasLimit) {
  return ethers.toBeHex(verificationGasLimit, 16) + ethers.toBeHex(callGasLimit, 16).slice(2);
}

function packUserOp(userOp) {
  const accountGasLimits = packAccountGasLimits(userOp.verificationGasLimit, userOp.callGasLimit);
  const gasFees = packAccountGasLimits(userOp.maxPriorityFeePerGas, userOp.maxFeePerGas);
  let paymasterAndData = "0x";
  if (userOp.paymaster?.length >= 20 && userOp.paymaster !== ZeroAddress) {
    paymasterAndData = packPaymasterData(
      userOp.paymaster,
      userOp.paymasterVerificationGasLimit,
      userOp.paymasterPostOpGasLimit,
      userOp.paymasterData
    );
  }
  return {
    sender: userOp.sender,
    nonce: userOp.nonce,
    callData: userOp.callData,
    accountGasLimits,
    initCode: userOp.initCode,
    preVerificationGas: userOp.preVerificationGas,
    gasFees,
    paymasterAndData,
    signature: userOp.signature,
  };
}

function packedUserOpAsArray(packedUserOp, includeSignature = true) {
  if (includeSignature) {
    return [
      packedUserOp.sender,
      packedUserOp.nonce,
      packedUserOp.initCode,
      packedUserOp.callData,
      packedUserOp.accountGasLimits,
      packedUserOp.preVerificationGas,
      packedUserOp.gasFees,
      packedUserOp.paymasterAndData,
      packedUserOp.signature,
    ];
  } else {
    return [
      packedUserOp.sender,
      packedUserOp.nonce,
      packedUserOp.initCode,
      packedUserOp.callData,
      packedUserOp.accountGasLimits,
      packedUserOp.preVerificationGas,
      packedUserOp.gasFees,
      packedUserOp.paymasterAndData,
    ];
  }
}

function encodeUserOp(userOp, forSignature = true) {
  const packedUserOp = packUserOp(userOp);
  if (forSignature) {
    return defaultAbiCoder.encode(
      ["address", "uint256", "bytes32", "bytes32", "bytes32", "uint256", "bytes32", "bytes32"],
      [
        packedUserOp.sender,
        packedUserOp.nonce,
        ethers.keccak256(packedUserOp.initCode),
        ethers.keccak256(packedUserOp.callData),
        packedUserOp.accountGasLimits,
        packedUserOp.preVerificationGas,
        packedUserOp.gasFees,
        ethers.keccak256(packedUserOp.paymasterAndData),
      ]
    );
  } else {
    // for the purpose of calculating gas cost encode also signature (and no keccak of bytes)
    return defaultAbiCoder.encode(
      ["address", "uint256", "bytes", "bytes", "bytes32", "uint256", "bytes32", "bytes", "bytes"],
      [
        packedUserOp.sender,
        packedUserOp.nonce,
        packedUserOp.initCode,
        packedUserOp.callData,
        packedUserOp.accountGasLimits,
        packedUserOp.preVerificationGas,
        packedUserOp.gasFees,
        packedUserOp.paymasterAndData,
        packedUserOp.signature,
      ]
    );
  }
}

function getUserOpHash(op, entryPoint, chainId) {
  const userOpHash = ethers.keccak256(encodeUserOp(op, true));
  const enc = defaultAbiCoder.encode(["bytes32", "address", "uint256"], [userOpHash, entryPoint, chainId]);
  return ethers.keccak256(enc);
}

const DefaultsForUserOp = {
  sender: ZeroAddress,
  nonce: 0,
  initCode: "0x",
  callData: "0x",
  callGasLimit: 0,
  verificationGasLimit: 150000, // default verification gas. will add create2 cost (3200+200*length) if initCode exists
  preVerificationGas: 21000, // should also cover calldata cost.
  maxFeePerGas: 0,
  maxPriorityFeePerGas: 1e9,
  paymaster: ZeroAddress,
  paymasterData: "0x",
  paymasterVerificationGasLimit: 3e5,
  paymasterPostOpGasLimit: 0,
  signature: "0x",
};

function signUserOp(op, signer, entryPoint, chainId) {
  const message = getUserOpHash(op, entryPoint, chainId);
  const msg1 = Buffer.concat([
    Buffer.from("\x19Ethereum Signed Message:\n32", "ascii"),
    Buffer.from(arrayify(message)),
  ]);

  const sig = ecsign(keccak256_buffer(msg1), Buffer.from(arrayify(signer.privateKey)));
  // that's equivalent of:  await signer.signMessage(message);
  // (but without "async"
  const signedMessage1 = toRpcSig(sig.v, sig.r, sig.s);
  return {
    ...op,
    signature: signedMessage1,
  };
}

function fillUserOpDefaults(op, defaults = DefaultsForUserOp) {
  const partial = { ...op };
  // we want "item:undefined" to be used from defaults, and not override defaults, so we must explicitly
  // remove those so "merge" will succeed.
  for (const key in partial) {
    if (partial[key] == null) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete partial[key];
    }
  }
  const filled = { ...defaults, ...partial };
  return filled;
}

module.exports = {
  packAccountGasLimits,
  packUserOp,
  packedUserOpAsArray,
  encodeUserOp,
  getUserOpHash,
  DefaultsForUserOp,
  signUserOp,
  fillUserOpDefaults,
};
