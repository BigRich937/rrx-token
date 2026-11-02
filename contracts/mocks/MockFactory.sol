// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test-only stand-in for the VVS factory's getPair lookup. Never use on mainnet.
contract MockFactory {
    mapping(address => mapping(address => address)) public getPair;

    function setPair(address a, address b, address pair) external {
        getPair[a][b] = pair;
        getPair[b][a] = pair;
    }
}
