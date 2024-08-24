// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

import {IRiskModule} from "@ensuro/core/contracts/interfaces/IRiskModule.sol";

interface SignedBucketRiskModule {
  type GovernanceActions is uint8;
  type Parameter is uint8;

  struct PolicyData {
    uint256 id;
    uint256 payout;
    uint256 premium;
    uint256 jrScr;
    uint256 srScr;
    uint256 lossProb;
    uint256 purePremium;
    uint256 ensuroCommission;
    uint256 partnerCommission;
    uint256 jrCoc;
    uint256 srCoc;
    address riskModule;
    uint40 start;
    uint40 expiration;
  }

  event AdminChanged(address previousAdmin, address newAdmin);
  event BeaconUpgraded(address indexed beacon);
  event BucketDeleted(uint256 indexed bucketId);
  event ComponentChanged(GovernanceActions indexed action, address value);
  event GovernanceAction(GovernanceActions indexed action, uint256 value);
  event Initialized(uint8 version);
  event NewBucket(uint256 indexed bucketId, IRiskModule.Params params);
  event NewSignedPolicy(uint256 indexed policyId, bytes32 policyData);
  event Paused(address account);
  event Unpaused(address account);
  event Upgraded(address indexed implementation);

  function GUARDIAN_ROLE() external view returns (bytes32);
  function LEVEL1_ROLE() external view returns (bytes32);
  function LEVEL2_ROLE() external view returns (bytes32);
  function LEVEL3_ROLE() external view returns (bytes32);
  function POLICY_CREATOR_ROLE() external view returns (bytes32);
  function PRICER_ROLE() external view returns (bytes32);
  function RESOLVER_ROLE() external view returns (bytes32);
  function RM_PROVIDER_ROLE() external view returns (bytes32);
  function TWEAK_EXPIRATION() external view returns (uint40);
  function activeExposure() external view returns (uint256);
  function bucketParams(uint256 bucketId) external view returns (IRiskModule.Params memory params_);
  function currency() external view returns (address);
  function deleteBucket(uint256 bucketId) external;
  function exposureLimit() external view returns (uint256);
  function getMinimumPremium(uint256 payout, uint256 lossProb, uint40 expiration) external view returns (uint256);
  function getMinimumPremiumForBucket(
    uint256 payout,
    uint256 lossProb,
    uint40 expiration,
    uint256 bucketId
  ) external view returns (uint256);
  function initialize(
    string memory name_,
    uint256 collRatio_,
    uint256 ensuroPpFee_,
    uint256 srRoc_,
    uint256 maxPayoutPerPolicy_,
    uint256 exposureLimit_,
    address wallet_
  ) external;
  function lastTweak() external view returns (uint40, uint56);
  function maxDuration() external view returns (uint256);
  function maxPayoutPerPolicy() external view returns (uint256);
  function name() external view returns (string memory);
  function newPolicy(
    uint256 payout,
    uint256 premium,
    uint256 lossProb,
    uint40 expiration,
    address onBehalfOf,
    bytes32 policyData,
    uint256 bucketId,
    bytes32 quoteSignatureR,
    bytes32 quoteSignatureVS,
    uint40 quoteValidUntil
  ) external returns (uint256);
  function newPolicyFull(
    uint256 payout,
    uint256 premium,
    uint256 lossProb,
    uint40 expiration,
    address onBehalfOf,
    bytes32 policyData,
    uint256 bucketId,
    bytes32 quoteSignatureR,
    bytes32 quoteSignatureVS,
    uint40 quoteValidUntil
  ) external returns (PolicyData memory createdPolicy);
  function newPolicyPaidByHolder(
    uint256 payout,
    uint256 premium,
    uint256 lossProb,
    uint40 expiration,
    address onBehalfOf,
    bytes32 policyData,
    uint256 bucketId,
    bytes32 quoteSignatureR,
    bytes32 quoteSignatureVS,
    uint40 quoteValidUntil
  ) external returns (uint256);
  function params() external view returns (IRiskModule.Params memory ret);
  function pause() external;
  function paused() external view returns (bool);
  function policyPool() external view returns (address);
  function premiumsAccount() external view returns (address);
  function proxiableUUID() external view returns (bytes32);
  function releaseExposure(uint256 payout) external;
  function resolvePolicy(PolicyData memory policy, uint256 payout) external;
  function setBucketParams(uint256 bucketId, IRiskModule.Params memory params_) external;
  function setParam(Parameter param, uint256 newValue) external;
  function setWallet(address wallet_) external;
  function supportsInterface(bytes4 interfaceId) external view returns (bool);
  function unpause() external;
  function upgradeTo(address newImplementation) external;
  function upgradeToAndCall(address newImplementation, bytes memory data) external payable;
  function wallet() external view returns (address);
}
