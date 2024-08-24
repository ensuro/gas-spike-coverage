// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

// Import the required libraries and contracts
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";

import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@account-abstraction/contracts/core/Helpers.sol";

import {SignedBucketRiskModule} from "./dependencies/ensuro/SignedBucketRiskModule.sol";
import {IPolicyPool} from "./dependencies/ensuro/IPolicyPool.sol";
import {IRiskModule} from "@ensuro/core/contracts/interfaces/IRiskModule.sol";
import {IPolicyHolder} from "@ensuro/core/contracts/interfaces/IPolicyHolder.sol";
import {Policy} from "./dependencies/ensuro/Policy.sol";
import {SwapLibrary} from "@ensuro/swaplibrary/contracts/SwapLibrary.sol";
import {IWETH9} from "./dependencies/uniswap-v3/IWETH9.sol";
import {EACAggregatorProxy} from "./dependencies/chainlink/EACAggregatorProxy.sol";

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
contract GSCPaymaster is BasePaymaster, IPolicyHolder {
  using UserOperationLib for PackedUserOperation;
  using SwapLibrary for SwapLibrary.SwapConfig;

  uint256 public constant MAX_ORACLE_AGE = 3600;
  uint256 internal constant WAD = 1e18;

  SignedBucketRiskModule public immutable riskModule;

  // TODO: this will track the actual gas accounting
  struct GasUsed {
    uint32 expiration;
    uint256 foo;
    uint256 bar;
  }

  struct PolicyInput {
    uint256 payout;
    uint256 premium;
    uint256 lossProb;
    uint40 expiration;
    uint256 bucketId;
    bytes32 quoteSignatureR;
    bytes32 quoteSignatureVS;
    uint40 quoteValidUntil;
  }

  struct CoverageInput {
    uint256 gasLimit;
    address account;
    uint256 prePaidGasPrice;
    uint256 limitGasPrice;
    uint256 reasonablePrioPerc;
  }

  mapping(uint256 => GasUsed) internal _gasStatus;
  mapping(uint256 => Policy.PolicyData) internal _policies;

  EACAggregatorProxy public oracle;
  SwapLibrary.SwapConfig public swapConfig;
  IWETH9 public immutable weth;

  event SwapConfigChanged(SwapLibrary.SwapConfig swapConfig);
  event UserOperationSponsored(address indexed user, uint256 actualGasCost);

  event Received(address indexed sender, uint256 value);

  event NewCoverage(address indexed account, CoverageInput coverage, bytes32 policyData, uint256 policyId, uint256 extraForTips);

  error OraclePriceTooOld(uint256 updatedAt);
  error NotEnoughEthPaid(uint256 premiumInEth, uint256 left);
  error OnlyPolicyPoolCanCallThis(address msgSender);
  error ERC721TransfersNotAllowed();
  error ShouldntHappen();

  modifier onlyPolicyPool() {
    if (msg.sender != address(_policyPool())) revert OnlyPolicyPoolCanCallThis(msg.sender);
    _;
  }

  /// @notice Initializes the TokenPaymaster contract with the given parameters.
  /// @param _entryPoint The EntryPoint contract used in the Account Abstraction infrastructure.
  /// @param _riskModule The Ensuro riskModule that will cover the gas spikes
  /// @param _owner The address that will be set as the owner of the contract.
  constructor(
    IEntryPoint _entryPoint,
    SignedBucketRiskModule _riskModule,
    SwapLibrary.SwapConfig memory _swapConfig,
    IWETH9 _weth,
    EACAggregatorProxy _oracle,
    address _owner
  ) BasePaymaster(_entryPoint) {
    riskModule = _riskModule;
    weth = _weth;
    oracle = _oracle;
    _setSwapConfig(_swapConfig);
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

  function _setSwapConfig(SwapLibrary.SwapConfig memory newSwapConfig) internal {
    newSwapConfig.validate();
    swapConfig = newSwapConfig;
    emit SwapConfigChanged(swapConfig);
  }

  function setSwapConfig(SwapLibrary.SwapConfig memory newSwapConfig) external onlyOwner {
    _setSwapConfig(newSwapConfig);
  }

  function getPriceCurrencyInEth() public view returns (uint256 price) {
    return Math.mulDiv(WAD, WAD, getPriceEthInCurrency());
  }

  function getPriceEthInCurrency() public view returns (uint256 price) {
    (, int256 answer, , uint256 updatedAt, ) = oracle.latestRoundData();
    if ((block.timestamp - updatedAt) > MAX_ORACLE_AGE) revert OraclePriceTooOld(updatedAt);
    price = uint256(answer) * (10 ** (18 - oracle.decimals()));
  }

  function _policyPool() internal view returns (IPolicyPool) {
    return IPolicyPool(riskModule.policyPool());
  }

  function _currency() internal view returns (address) {
    return _policyPool().currency();
  }

  function computePolicyDataHash(CoverageInput memory coverageInput) public view returns (bytes32) {
    return keccak256(abi.encode(block.chainid, address(this), coverageInput));
  }

  function newPolicy(PolicyInput memory policyInput, CoverageInput memory coverageInput) external payable {
    // Get the currency() to pay the premium
    weth.deposit{value: msg.value}();
    uint256 premiumInEth = swapConfig.exactOutput(
      address(weth),
      _currency(),
      policyInput.premium,
      getPriceCurrencyInEth()
    );
    weth.withdraw(msg.value - premiumInEth);

    uint256 prePaidGas = coverageInput.gasLimit * coverageInput.prePaidGasPrice;
    if ((prePaidGas + premiumInEth) > msg.value)
      revert NotEnoughEthPaid(premiumInEth, prePaidGas + premiumInEth - msg.value);
    uint256 extraForTips = msg.value - prePaidGas - premiumInEth;
    bytes32 policyData = computePolicyDataHash(coverageInput);
    uint256 policyId = _createPolicy(policyInput, policyData);

    emit NewCoverage(coverageInput.account, coverageInput, policyData, policyId, extraForTips);
  }

  function _createPolicy(PolicyInput memory policyInput, bytes32 policyData) internal returns (uint256 policyId) {
    IERC20Metadata(_currency()).approve(riskModule.policyPool(), policyInput.premium);
    policyId = riskModule.newPolicy(
      policyInput.payout,
      policyInput.premium,
      policyInput.lossProb,
      policyInput.expiration,
      address(this),
      policyData,
      policyInput.bucketId,
      policyInput.quoteSignatureR,
      policyInput.quoteSignatureVS,
      policyInput.quoteValidUntil
    );
    // This is to recover the full policy, since isn't returned by the risk module
    _policies[policyId] = Policy.PolicyData({
      id: policyId,
      payout: policyInput.payout,
      premium: policyInput.premium,
      lossProb: policyInput.lossProb,
      start: uint40(block.timestamp),
      expiration: policyInput.expiration,
      riskModule: IRiskModule(address(riskModule)),
      purePremium: 0,
      srScr: 0,
      jrScr: 0,
      srCoc: 0,
      jrCoc: 0,
      ensuroCommission: 0,
      partnerCommission: 0
    });
    Policy.PremiumComposition memory premiumComposition = Policy.getMinimumPremium(
      riskModule.bucketParams(policyInput.bucketId),
      policyInput.payout,
      policyInput.lossProb,
      policyInput.expiration,
      uint40(block.timestamp)
    );
    _policies[policyId].srScr = premiumComposition.srScr;
    _policies[policyId].jrScr = premiumComposition.jrScr;
    _policies[policyId].srCoc = premiumComposition.srCoc;
    _policies[policyId].jrCoc = premiumComposition.jrCoc;
    _policies[policyId].purePremium = premiumComposition.purePremium;
    _policies[policyId].ensuroCommission = premiumComposition.ensuroCommission;
    _policies[policyId].partnerCommission = policyInput.premium - premiumComposition.srCoc - premiumComposition.jrCoc - premiumComposition.ensuroCommission - premiumComposition.purePremium;
    if (Policy.hash(_policies[policyId]) != _policyPool().getPolicyHash(policyId))
      revert ShouldntHappen();
  }

  function supportsInterface(
    bytes4 interfaceId
  )
    public
    view
    virtual
    returns (bool)
  {
    return
      interfaceId == type(IPolicyHolder).interfaceId;
  }

  function onERC721Received(
    address, // operator is the risk module that called newPolicy in the PolicyPool. Ignored for now,
    // perhaps in the future we can check is a PriceRiskModule
    address from,
    uint256 tokenId,
    bytes calldata data
  ) external virtual override onlyPolicyPool returns (bytes4) {
    if (from != address(0)) {
      revert ERC721TransfersNotAllowed();
    }
    return IERC721Receiver.onERC721Received.selector;
  }

  function onPayoutReceived(
    address, // riskModule, ignored
    address, // from - Must be the PolicyPool, ignored too. Not too relevant this parameter
    uint256 tokenId,
    uint256 amount
  ) external virtual override onlyPolicyPool returns (bytes4) {
    // TODO
    return IPolicyHolder.onPayoutReceived.selector;
  }

  function onPolicyExpired(
    address,
    address,
    uint256 tokenId
  ) external virtual override onlyPolicyPool returns (bytes4) {
    // TODO
    return IPolicyHolder.onPolicyExpired.selector;
  }


}
