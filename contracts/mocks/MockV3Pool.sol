// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test-only stand-in for a Uniswap V3-style pool's read functions. Never use on mainnet.
contract MockV3Pool {
    address public token0;
    address public token1;
    address public factory;
    uint24 public fee;
    uint128 public liquidity;
    uint160 private sqrtPriceX96;

    constructor(address token0_, address token1_, uint24 fee_, uint160 sqrtPriceX96_, uint128 liquidity_) {
        token0 = token0_;
        token1 = token1_;
        factory = msg.sender;
        fee = fee_;
        sqrtPriceX96 = sqrtPriceX96_;
        liquidity = liquidity_;
    }

    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint32, bool) {
        return (sqrtPriceX96, 0, 0, 0, 0, 0, true);
    }
}
