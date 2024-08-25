require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-dependency-compiler");
require("hardhat-contract-sizer");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  dependencyCompiler: {
    paths: [
      "@openzeppelin/contracts/interfaces/IERC20.sol",
      "@account-abstraction/contracts/samples/SimpleAccountFactory.sol",
      "@account-abstraction/contracts/core/EntryPoint.sol",
      "@ensuro/swaplibrary/contracts/SwapLibrary.sol",
      "@ensuro/account-abstraction/contracts/AccessControlAccount.sol",
    ],
  },
};
