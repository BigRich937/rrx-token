// Finds the VVS RRx / WCRO pool (LP token) by asking the VVS factory, and shows what an
// address is. Read-only: sends no transactions.
// Optional: INSPECT_ADDRESS=<0x...> to describe any address.
const hre = require("hardhat");

const RRX = process.env.RRX_ADDRESS || "0x7C5524548FBF613b6B0A6BC8e2c534ED373b508a";
const WCRO = "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23";
const VVS_FACTORY = process.env.VVS_FACTORY || "0x3B44B2a187a7b3824131F8db5a74194D0a42Fc15";

const ABI = [
  "function getPair(address, address) view returns (address)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function balanceOf(address) view returns (uint256)",
  "function factory() view returns (address)",
  "function fee() view returns (uint24)",
  "function liquidity() view returns (uint128)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint32, bool)",
];

async function describe(ethers, address, holder) {
  const code = await ethers.provider.getCode(address);
  if (code === "0x") return "a wallet address (not a contract)";
  const c = new ethers.Contract(address, ABI, ethers.provider);
  const tryCall = async (fn, ...args) => { try { return await c[fn](...args); } catch { return null; } };
  const [name, symbol, token0, token1, factory, fee, slot0, reserves] = await Promise.all([
    tryCall("name"), tryCall("symbol"), tryCall("token0"), tryCall("token1"),
    tryCall("factory"), tryCall("fee"), tryCall("slot0"), tryCall("getReserves"),
  ]);
  if (token0) {
    const lines = [];
    const rrxFirst = token0.toLowerCase() === RRX.toLowerCase();
    if (slot0 && fee !== null) {
      // V3 pool: price of token0 in token1 = (sqrtPriceX96 / 2^96)^2 (both tokens have 18 decimals)
      const p01 = (Number(slot0[0]) / 2 ** 96) ** 2;
      const croPerRrx = rrxFirst ? p01 : 1 / p01;
      lines.push(`a V3 (concentrated liquidity) pool, fee tier ${Number(fee) / 10000}%`);
      lines.push(`  Tokens:      ${token0} / ${token1}`);
      lines.push(`  Factory:     ${factory}`);
      lines.push(`  Price:       1 RRx = ${croPerRrx.toPrecision(4)} CRO`);
      lines.push(`  Liquidity:   ${await tryCall("liquidity")} (0 means no position is active at this price)`);
      lines.push("  V3 positions are NFTs in your wallet, not LP tokens.");
    } else {
      lines.push(`a V2-style pool (LP token) ${symbol || ""} for ${token0} / ${token1}`);
      lines.push(`  Factory:     ${factory}`);
      if (reserves) {
        const rrx = rrxFirst ? reserves[0] : reserves[1], cro = rrxFirst ? reserves[1] : reserves[0];
        lines.push(`  Pool holds:  ${ethers.formatEther(rrx)} RRx + ${ethers.formatEther(cro)} CRO`);
      }
      if (holder) lines.push(`  Your LP:     ${ethers.formatEther((await tryCall("balanceOf", holder)) ?? 0n)}`);
    }
    return lines.join("\n");
  }
  if (factory) return `a router-type contract (it points to factory ${factory}), not a pool`;
  if (symbol) return `a token: ${name} (${symbol}), not a pool`;
  return "a contract that is not a token or a pool";
}

async function main() {
  const { ethers } = hre;
  const [me] = await ethers.getSigners();
  const inspect = process.env.INSPECT_ADDRESS;
  if (inspect) console.log(`${inspect} is ${await describe(ethers, inspect, me?.address)}`);

  const factory = new ethers.Contract(VVS_FACTORY, ABI, ethers.provider);
  let pair;
  try {
    pair = await factory.getPair(RRX, WCRO);
  } catch {
    throw new Error(`Could not query the VVS factory at ${VVS_FACTORY}.`);
  }
  if (pair === ethers.ZeroAddress) {
    console.log("No classic (V2) RRx / CRO pool exists on VVS. If you added liquidity on VVS V3, check the address above instead.");
    return;
  }
  const p = new ethers.Contract(pair, ABI, ethers.provider);
  const [t0, reserves, lp] = await Promise.all([p.token0(), p.getReserves(), me ? p.balanceOf(me.address) : 0n]);
  const rrxFirst = t0.toLowerCase() === RRX.toLowerCase();
  const rrx = rrxFirst ? reserves[0] : reserves[1], cro = rrxFirst ? reserves[1] : reserves[0];
  console.log(`RRx / CRO pool (LP token): ${pair}`);
  console.log(`  Pool holds:  ${ethers.formatEther(rrx)} RRx + ${ethers.formatEther(cro)} CRO`);
  if (rrx > 0n) console.log(`  Price:       1 RRx = ${(Number(ethers.formatEther(cro)) / Number(ethers.formatEther(rrx))).toPrecision(4)} CRO`);
  if (me) console.log(`  Your LP:     ${ethers.formatEther(lp)}`);
  console.log(`Use this address as LP_TOKEN_ADDRESS.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
