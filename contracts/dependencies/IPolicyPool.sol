// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface IPolicyPool {
  type ComponentKind is uint8;
  type ComponentStatus is uint8;
  type GovernanceActions is uint8;

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
  event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
  event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
  event BeaconUpgraded(address indexed beacon);
  event ComponentChanged(GovernanceActions indexed action, address value);
  event ComponentStatusChanged(address indexed component, ComponentKind kind, ComponentStatus newStatus);
  event Initialized(uint8 version);
  event NewPolicy(address indexed riskModule, PolicyData policy);
  event Paused(address account);
  event PolicyResolved(address indexed riskModule, uint256 indexed policyId, uint256 payout);
  event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
  event Unpaused(address account);
  event Upgraded(address indexed implementation);

  function GUARDIAN_ROLE() external view returns (bytes32);
  function LEVEL1_ROLE() external view returns (bytes32);
  function LEVEL2_ROLE() external view returns (bytes32);
  function LEVEL3_ROLE() external view returns (bytes32);
  function access() external view returns (address);
  function addComponent(address component, ComponentKind kind) external;
  function approve(address to, uint256 tokenId) external;
  function balanceOf(address owner) external view returns (uint256);
  function changeComponentStatus(address component, ComponentStatus newStatus) external;
  function currency() external view returns (address);
  function deposit(address eToken, uint256 amount) external;
  function expirePolicies(PolicyData[] memory policies) external;
  function expirePolicy(PolicyData memory policy) external;
  function getApproved(uint256 tokenId) external view returns (address);
  function getComponentStatus(address component) external view returns (ComponentStatus);
  function getPolicyHash(uint256 policyId) external view returns (bytes32);
  function initialize(string memory name_, string memory symbol_, address treasury_) external;
  function isActive(uint256 policyId) external view returns (bool);
  function isApprovedForAll(address owner, address operator) external view returns (bool);
  function name() external view returns (string memory);
  function newPolicy(
    PolicyData memory policy,
    address payer,
    address policyHolder,
    uint96 internalId
  ) external returns (uint256);
  function ownerOf(uint256 tokenId) external view returns (address);
  function pause() external;
  function paused() external view returns (bool);
  function proxiableUUID() external view returns (bytes32);
  function removeComponent(address component) external;
  function resolvePolicy(PolicyData memory policy, uint256 payout) external;
  function resolvePolicyFullPayout(PolicyData memory policy, bool customerWon) external;
  function safeTransferFrom(address from, address to, uint256 tokenId) external;
  function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) external;
  function setApprovalForAll(address operator, bool approved) external;
  function setBaseURI(string memory nftBaseURI_) external;
  function setTreasury(address treasury_) external;
  function supportsInterface(bytes4 interfaceId) external view returns (bool);
  function symbol() external view returns (string memory);
  function tokenURI(uint256 tokenId) external view returns (string memory);
  function transferFrom(address from, address to, uint256 tokenId) external;
  function treasury() external view returns (address);
  function unpause() external;
  function upgradeTo(address newImplementation) external;
  function upgradeToAndCall(address newImplementation, bytes memory data) external payable;
  function withdraw(address eToken, uint256 amount) external returns (uint256);
}
