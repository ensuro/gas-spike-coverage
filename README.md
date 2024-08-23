# Gas Spike Coverage

This project built for the Aleph Hackathon 2024 intents to build a Gas Spike Coverage for account abstraction users. 

The user will be able to pre-pay a given number of gas units at a given price (in ETH) and if that pre-paid amount is not enough, a payout will be released to cover the extra cost.

For this coverage it will pay a premium and this will create a policy in the Ensuro protocol. 

The pre-paid gas will be disbursed to the user in the form of sponsored transactions by a Paymaster contract of the ERC-4337 standard.


## Hardhat usage

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
