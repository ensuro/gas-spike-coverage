const { expect } = require("chai");
const { _W, getRole, amountFunction, getAddress, grantComponentRole } = require("@ensuro/core/js/utils");
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
};

async function setUp() {
  const [, eoa1, eoa2, anon, owner, pricer] = await ethers.getSigners();

  const ep = await ethers.getContractAt("IEntryPoint", ADDRESSES.ENTRYPOINT);

  // SwapLibrary setup
  const SwapLibrary = await ethers.getContractFactory("SwapLibrary");
  const deployedSwapLibrary = await SwapLibrary.deploy();
  const swapAddr = await ethers.resolveAddress(deployedSwapLibrary);

  const GSCPaymaster = await ethers.getContractFactory("GSCPaymaster", { libraries: { SwapLibrary: swapAddr } });

  // Setup some accounts
  const SimpleAccountFactory = await ethers.getContractFactory("SimpleAccountFactory");
  const simpleAccFactory = await SimpleAccountFactory.deploy(ADDRESSES.ENTRYPOINT);
  await simpleAccFactory.createAccount(eoa1, 0);
  await simpleAccFactory.createAccount(eoa2, 0);
  const acc1 = await ethers.getContractAt("SimpleAccount", await simpleAccFactory.getAddress(eoa1, 0));
  const acc2 = await ethers.getContractAt("SimpleAccount", await simpleAccFactory.getAddress(eoa2, 0));
  // Setup Ensuro permissions
  const pool = await ethers.getContractAt("IPolicyPool", ADDRESSES.POOL);
  const access = await ethers.getContractAt("IAccessManager", ADDRESSES.ACCESSMANAGER);
  const rm = await ethers.getContractAt("SignedBucketRiskModule", ADDRESSES.RM_GSC);
  await helpers.impersonateAccount(ADDRESSES.ADMINS_MULTISIG);
  await helpers.setBalance(ADDRESSES.ADMINS_MULTISIG, ethers.parseEther("100"));
  const ensAdmin = await ethers.getSigner(ADDRESSES.ADMINS_MULTISIG);
  await grantComponentRole(hre, access.connect(ensAdmin), rm, "PRICER_ROLE", pricer);

  // Airdrop some USDC for tests
  const usdc = await initForkCurrency(ADDRESSES.USDC, ADDRESSES.USDCWhale, [acc1, acc2], [_A(100), _A(100)]);

  const FEETIER = 500;
  const swapConfig = buildUniswapConfig(_W("0.005"), FEETIER, ADDRESSES.SWAP_ROUTER);
  const pm = await GSCPaymaster.deploy(ADDRESSES.ENTRYPOINT, rm, swapConfig, ADDRESSES.WETH, owner);

  return {
    ep,
    GSCPaymaster,
    SimpleAccountFactory,
    simpleAccFactory,
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
  };
}

describe("GSCPaymaster contract tests", function () {
  before(async () => {
    await setupChain(null);
  });

  it("Constructs with the right permissions and EP", async () => {
    const { usdc, pool } = await helpers.loadFixture(setUp);
  });
});
