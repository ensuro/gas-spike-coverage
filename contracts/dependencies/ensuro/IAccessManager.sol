// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

interface IAccessManager {
  event AdminChanged(address previousAdmin, address newAdmin);
  event BeaconUpgraded(address indexed beacon);
  event Initialized(uint8 version);
  event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
  event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
  event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
  event Upgraded(address indexed implementation);

  function ANY_COMPONENT() external view returns (address);
  function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
  function GUARDIAN_ROLE() external view returns (bytes32);
  function LEVEL1_ROLE() external view returns (bytes32);
  function LEVEL2_ROLE() external view returns (bytes32);
  function LEVEL3_ROLE() external view returns (bytes32);
  function checkComponentRole(address component, bytes32 role, address account, bool alsoGlobal) external view;
  function checkComponentRole2(
    address component,
    bytes32 role1,
    bytes32 role2,
    address account,
    bool alsoGlobal
  ) external view;
  function checkRole(bytes32 role, address account) external view;
  function checkRole2(bytes32 role1, bytes32 role2, address account) external view;
  function getComponentRole(address component, bytes32 role) external pure returns (bytes32);
  function getRoleAdmin(bytes32 role) external view returns (bytes32);
  function grantComponentRole(address component, bytes32 role, address account) external;
  function grantRole(bytes32 role, address account) external;
  function hasComponentRole(
    address component,
    bytes32 role,
    address account,
    bool alsoGlobal
  ) external view returns (bool);
  function hasRole(bytes32 role, address account) external view returns (bool);
  function initialize() external;
  function proxiableUUID() external view returns (bytes32);
  function renounceRole(bytes32 role, address account) external;
  function revokeRole(bytes32 role, address account) external;
  function setComponentRoleAdmin(address component, bytes32 role, bytes32 adminRole) external;
  function setRoleAdmin(bytes32 role, bytes32 adminRole) external;
  function supportsInterface(bytes4 interfaceId) external view returns (bool);
  function upgradeTo(address newImplementation) external;
  function upgradeToAndCall(address newImplementation, bytes memory data) external payable;
}
