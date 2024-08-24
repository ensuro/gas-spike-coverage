// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

// Import the required libraries and contracts
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/core/Helpers.sol";

import {SignedBucketRiskModule} from "./dependencies/SignedBucketRiskModule.sol";

/// @title Sample ERC-20 Token Paymaster for ERC-4337
/// This Paymaster covers gas fees in exchange for ERC20 tokens charged using allowance pre-issued by ERC-4337 accounts.
/// The contract refunds excess tokens if the actual gas cost is lower than the initially provided amount.
/// The token price cannot be queried in the validation code due to storage access restrictions of ERC-4337.
/// The price is cached inside the contract and is updated in the 'postOp' stage if the change is >10%.
/// It is theoretically possible the token has depreciated so much since the last 'postOp' the refund becomes negative.
/// The contract reverts the inner user transaction in that case but keeps the charge.
/// The contract also allows honest clients to prepay tokens at a higher price to avoid getting reverted.
/// It also allows updating price configuration and withdrawing tokens by the contract owner.
/// The contract uses an Oracle to fetch the latest token prices.
/// @dev Inherits from BasePaymaster.
contract GSCPaymaster is BasePaymaster {
  using UserOperationLib for PackedUserOperation;

  event UserOperationSponsored(address indexed user, uint256 actualGasCost);

  event Received(address indexed sender, uint256 value);

  SignedBucketRiskModule riskModule;

  /// @notice Initializes the TokenPaymaster contract with the given parameters.
  /// @param _entryPoint The EntryPoint contract used in the Account Abstraction infrastructure.
  /// @param _riskModule The Ensuro riskModule that will cover the gas spikes
  /// @param _owner The address that will be set as the owner of the contract.
  constructor(IEntryPoint _entryPoint, SignedBucketRiskModule _riskModule, address _owner) BasePaymaster(_entryPoint) {
    _riskModule = riskModule;
    transferOwnership(_owner);
  }

  /// @notice Validates a paymaster user operation and calculates the required token amount for the transaction.
  /// @param userOp The user operation data.
  /// @param requiredPreFund The maximum cost (in native token) the paymaster has to prefund.
  /// @return context The context containing the token amount and user sender address (if applicable).
  /// @return validationResult A uint256 value indicating the result of the validation (always 0 in this implementation).
  function _validatePaymasterUserOp(
    PackedUserOperation calldata userOp,
    bytes32,
    uint256 requiredPreFund
  ) internal override returns (bytes memory context, uint256 validationResult) {}

  /// @notice Performs post-operation tasks, such as updating the token price and refunding excess tokens.
  /// @dev This function is called after a user operation has been executed or reverted.
  /// @param context The context containing the token amount and user sender address.
  /// @param actualGasCost The actual gas cost of the transaction.
  /// @param actualUserOpFeePerGas - the gas price this UserOp pays. This value is based on the UserOp's maxFeePerGas
  //      and maxPriorityFee (and basefee)
  //      It is not the same as tx.gasprice, which is what the bundler pays.
  function _postOp(
    PostOpMode,
    bytes calldata context,
    uint256 actualGasCost,
    uint256 actualUserOpFeePerGas
  ) internal override {}

  receive() external payable {
    emit Received(msg.sender, msg.value);
  }

  function withdrawEth(address payable recipient, uint256 amount) external onlyOwner {
    (bool success, ) = recipient.call{value: amount}("");
    require(success, "withdraw failed");
  }
}
