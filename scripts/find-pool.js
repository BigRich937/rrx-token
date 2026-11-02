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
];

async function describe(ethers, address) {
  const code = await ethers.provider.getCode(address);
  if (code === "0x") return "a wallet address (not a contract)";
  const c = new ethers.Contract(address, ABI, ethers.provider);
  const tryCall = async (fn) => { try { return await c[fn](); } catch { return null; } };
  const [name, symbol, token0, factory] = await Promise.all([tryCall("name"), tryCall("symbol"), tryCall("token0"), tryCall("factory")]);
  if (token0) return `a liquidity pool (LP token) ${symbol || ""} for ${token0} / ${await tryCall("token1")}`;
  if (factory) return `a router-type contract (it points to factory ${factory}), not a pool`;
  if (symbol) return `a token: ${name} (${symbol}), not a pool`;
  return "a contract that is not a token or a pool";
}

async function main() {
  const { ethers } = hre;
  const [me] = await ethers.getSigners();
  const inspect = process.env.INSPECT_ADDRESS;
  if (inspect) console.log(`${inspect} is ${await describe(ethers, inspect)}`);

  const factory = new ethers.Contract(VVS_FACTORY, ABI, ethers.provider);
  let pair;
  try {
    pair = await factory.getPair(RRX, WCRO);
  } catch {
    throw new Error(`Could not query the VVS factory at ${VVS_FACTORY}.`);
  }
  if (pair === ethers.ZeroAddress) {
    console.log("No RRx / CRO pool exists on VVS yet. The add-liquidity transaction did not go through.");
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
