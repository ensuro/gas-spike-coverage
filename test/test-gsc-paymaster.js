const { expect } = require("chai");
const {
  _W,
  amountFunction,
  getAddress,
  grantComponentRole,
  defaultPolicyParams,
  makeSignedQuote,
  makeBucketQuoteMessage,
  getTransactionEvent,
} = require("@ensuro/core/js/utils");
const { setupChain, initForkCurrency } = require("@ensuro/core/js/test-utils");
const { buildUniswapConfig } = require("@ensuro/swaplibrary/js/utils");
const hre = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const { ethers } = hre;
const { MaxUint256, ZeroAddress } = hre.ethers;
const { getUserOpHash, packUserOp, packedUserOpAsArray } = require("../js/userOp.js");

const _A = amountFunction(6);
const ADDRESSES = {
  // Arbitrum One addresses
  USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  ADMINS_MULTISIG: "0xe712B19a8819562B15b6d46585668AAdC26b9452",
  POOL: "0x47E2aFB074487682Db5Db6c7e41B43f913026544",
  ACCESSMANAGER: "0xC3D6B7DC889173bcbB25015eceE62D93cD373c07",
  RM_GSC: "0xb957202C0b07d78924F724a65FdD1d3E70734f8e",
  USDCWhale: "0xf89d7b9c864f589bbF53a82105107622B35EaA40",
  ENTRYPOINT: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
  SWAP_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  ETH_USD_ORACLE: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
};

const ERC20_TRANSFER_GAS = 65000n; // Approx
const ORACLE_TO_WAD = 10n ** 10n;

async function setUp() {
  const [, eoa1, eoa2, anon, owner, pricer] = await ethers.getSigners();

  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const ep = await EntryPoint.deploy();
  // await ethers.getContractAt("IEntryPoint", ADDRESSES.ENTRYPOINT);

  // SwapLibrary setup
  const SwapLibrary = await ethers.getContractFactory("SwapLibrary");
  const deployedSwapLibrary = await SwapLibrary.deploy();
  const swapAddr = await ethers.resolveAddress(deployedSwapLibrary);

  const GSCPaymaster = await ethers.getContractFactory("GSCPaymaster", { libraries: { SwapLibrary: swapAddr } });

  // Setup some accounts
  const AccessControlAccount = await ethers.getContractFactory("AccessControlAccount");
  const acc1 = await AccessControlAccount.deploy(ep, eoa1, [eoa1]);
  const acc2 = await AccessControlAccount.deploy(ep, eoa2, [eoa2]);
  // Setup Ensuro permissions
  const pool = await ethers.getContractAt("IPolicyPool", ADDRESSES.POOL);
  const access = await ethers.getContractAt("IAccessManager", ADDRESSES.ACCESSMANAGER);
  const rm = await ethers.getContractAt("SignedBucketRiskModule", ADDRESSES.RM_GSC);
  await helpers.impersonateAccount(ADDRESSES.ADMINS_MULTISIG);
  await helpers.setBalance(ADDRESSES.ADMINS_MULTISIG, ethers.parseEther("100"));
  const ensAdmin = await ethers.getSigner(ADDRESSES.ADMINS_MULTISIG);
  await grantComponentRole(hre, access.connect(ensAdmin), rm, "PRICER_ROLE", pricer);

  const oracle = await ethers.getContractAt("EACAggregatorProxy", ADDRESSES.ETH_USD_ORACLE);
  // Airdrop some USDC for tests
  const usdc = await initForkCurrency(ADDRESSES.USDC, ADDRESSES.USDCWhale, [acc1, acc2], [_A(100), _A(100)]);

  const FEETIER = 500;
  const swapConfig = buildUniswapConfig(_W("0.01"), FEETIER, ADDRESSES.SWAP_ROUTER);
  const pm = await GSCPaymaster.deploy(ep, rm, swapConfig, ADDRESSES.WETH, oracle, owner);

  await grantComponentRole(hre, access.connect(ensAdmin), rm, "POLICY_CREATOR_ROLE", pm);
  await grantComponentRole(hre, access.connect(ensAdmin), rm, "RESOLVER_ROLE", pm);

  return {
    ep,
    GSCPaymaster,
    AccessControlAccount,
    pool,
    rm,
    access,
    eoa1,
    eoa2,
    acc1,
    acc2,
    anon,
    owner,
    pricer,
    ensAdmin,
    usdc,
    pm,
    oracle,
  };
}

function makeCoverageInput(acc, erc20count = 20n, prePaid = "0.5", limit = "1.5", salt = 0) {
  const gasLimit = ERC20_TRANSFER_GAS * erc20count;
  const prePaidGasPrice = ethers.parseUnits(prePaid, "gwei");
  const limitGasPrice = ethers.parseUnits(limit, "gwei");
  const reasonablePrioPerc = _W("0.1");

  return [gasLimit, acc, prePaidGasPrice, limitGasPrice, reasonablePrioPerc, salt];
}

async function computePayout(coverageInput, oracle) {
  const appreciationFactor = _W("1.2");
  const [gasLimit, , prePaidGasPrice, limitGasPrice] = coverageInput;
  const payout = ((limitGasPrice - prePaidGasPrice) * gasLimit * appreciationFactor) / _W(1);
  const price = (await oracle.latestRoundData()).answer * ORACLE_TO_WAD;
  return (payout * price) / _W(1) / 10n ** 12n;
}

function ethToSend(coverageInput, premiunInEth) {
  const [gasLimit, , prePaidGasPrice] = coverageInput;
  return prePaidGasPrice * gasLimit + premiunInEth + (premiunInEth * _W("0.05")) / _W(1);
}

describe("GSCPaymaster contract tests", function () {
  before(async () => {
    await setupChain(246353581);
  });

  it("Checks price computations are correct", async () => {
    const { pm } = await helpers.loadFixture(setUp);
    expect(await pm.getPriceCurrencyInEth()).to.be.closeTo(_W("0.000363"), _W("0.000005"));
    expect(await pm.getPriceEthInCurrency()).to.be.closeTo(_W("2754.41"), _W("0.5"));
  });

  it("Creates a policy", async () => {
    const { usdc, pool, pm, eoa1, acc1, acc2, rm, oracle, pricer, anon, ep } = await helpers.loadFixture(setUp);

    const coverageInput = makeCoverageInput(acc1);
    const policyData = await pm.computePolicyDataHash(coverageInput);
    const payoutInUSDC = await computePayout(coverageInput, oracle);
    const premium = _A(1);
    const lossProb = _W("0.05");

    const policyParams = await defaultPolicyParams({ rm, payout: payoutInUSDC, premium, lossProb, policyData });
    policyParams.bucketId = 0;
    const signature = await makeSignedQuote(pricer, policyParams, makeBucketQuoteMessage);

    const policyInput = [
      policyParams.payout,
      policyParams.premium,
      policyParams.lossProb,
      policyParams.expiration,
      policyParams.bucketId,
      signature.r,
      signature.yParityAndS,
      policyParams.validUntil,
    ];

    const premiunInEth = await pm.getPriceCurrencyInEth();
    const tx = await pm
      .connect(eoa1)
      .newPolicy(policyInput, coverageInput, { value: ethToSend(coverageInput, premiunInEth) });
    const receipt = await tx.wait();
    const newPolicyEvt = getTransactionEvent(pool.interface, receipt, "NewPolicy");
    const policyId = newPolicyEvt.args.policy.id;
    console.log(policyId);

    const transferCall = usdc.interface.encodeFunctionData("transfer", [getAddress(acc2), _A(3)]);
    const executeCall = acc1.interface.encodeFunctionData("execute", [getAddress(usdc), 0, transferCall]);
    const nonce = await ep.getNonce(acc1, 0);
    const userOpObj = {
      sender: getAddress(acc1),
      nonce: nonce,
      initCode: "0x",
      callData: executeCall,
      callGasLimit: ERC20_TRANSFER_GAS,
      verificationGasLimit: ERC20_TRANSFER_GAS,
      preVerificationGas: ERC20_TRANSFER_GAS,
      paymasterVerificationGasLimit: ERC20_TRANSFER_GAS,
      paymasterPostOpGasLimit: ERC20_TRANSFER_GAS,
      maxFeePerGas: ethers.parseUnits("1.0", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("1.0", "gwei"),
      paymaster: getAddress(pm),
      paymasterData: ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [policyId]),
      paymasterVerificationGasLimit: ERC20_TRANSFER_GAS,
      paymasterPostOpGasLimit: ERC20_TRANSFER_GAS,
      signature: "0x",
    };
    console.log(userOpObj);
    const { chainId } = await hre.ethers.provider.getNetwork();
    const userOpHash = getUserOpHash(userOpObj, getAddress(ep), chainId);
    const userOp = packedUserOpAsArray(packUserOp(userOpObj), false);
    const userOpHash2 = await ep.getUserOpHash([...userOp, ethers.toUtf8Bytes("")]);
    expect(userOpHash).to.be.equal(userOpHash2);

    // Sign the hash
    const message = userOpHash;
    const aaSignature = await eoa1.signMessage(ethers.getBytes(message));
    const prevBalance = await usdc.balanceOf(acc1);
    await expect(() => ep.handleOps([[...userOp, aaSignature]], anon)).to.changeTokenBalances(
      usdc,
      [acc1, acc2],
      [_A(-3), _A(3)]
    );
    const postBalance = await usdc.balanceOf(acc1);
    expect(prevBalance - postBalance).to.equal(_A(3));
  });
});
