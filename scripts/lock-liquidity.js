// Deploys a LiquidityLock for the VVS RRx / CRO LP token.
// Required in .env: LP_TOKEN_ADDRESS (shown on VVS / the explorer after adding liquidity).
// Optional: LOCK_MONTHS (default 12), LOCK_BENEFICIARY (default: deployer).
// After it deploys, transfer your LP tokens to the printed lock address.
// CHECK_ONLY=1 runs the safety checks on LP_TOKEN_ADDRESS and stops without deploying.
const hre = require("hardhat");

const RRX = (process.env.RRX_ADDRESS || "0x7C5524548FBF613b6B0A6BC8e2c534ED373b508a").toLowerCase();
const WCRO = "0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23"; // wrapped CRO on Cronos mainnet

const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// Confirms LP_TOKEN_ADDRESS is the RRx pool and that the wallet holds its LP tokens.
async function checkPool(ethers, lpToken, holder, isMainnet) {
  const pair = new ethers.Contract(lpToken, PAIR_ABI, ethers.provider);
  if ((await ethers.provider.getCode(lpToken)) === "0x") throw new Error(`${lpToken} is not a contract. Check the LP address.`);
  let t0, t1, reserves, symbol;
  try {
    [t0, t1, reserves, symbol] = await Promise.all([pair.token0(), pair.token1(), pair.getReserves(), pair.symbol()]);
  } catch {
    throw new Error(`${lpToken} is not a VVS pool (LP token). You may have copied the RRx or wallet address instead.`);
  }
  const tokens = [t0.toLowerCase(), t1.toLowerCase()];
  if (!tokens.includes(RRX)) throw new Error(`This pool does not contain RRx (it holds ${t0} and ${t1}).`);
  const other = tokens[0] === RRX ? tokens[1] : tokens[0];
  if (isMainnet && other !== WCRO) throw new Error(`This pool pairs RRx with ${other}, not WCRO (CRO).`);

  const rrxReserve = tokens[0] === RRX ? reserves[0] : reserves[1];
  const otherReserve = tokens[0] === RRX ? reserves[1] : reserves[0];
  const balance = await pair.balanceOf(holder);
  const priceCro = Number(ethers.formatEther(otherReserve)) / Number(ethers.formatEther(rrxReserve));
  console.log("Pool details:");
  console.log(`  LP token:      ${symbol} at ${lpToken}`);
  console.log(`  Pool holds:    ${ethers.formatEther(rrxReserve)} RRx + ${ethers.formatEther(otherReserve)} CRO`);
  console.log(`  Price:         1 RRx = ${priceCro.toPrecision(4)} CRO`);
  console.log(`  Your LP:       ${ethers.formatEther(balance)} ${symbol}`);
  if (balance === 0n) throw new Error("This wallet holds none of these LP tokens. Is the add-liquidity transaction confirmed?");
  console.log("Pool check passed: this is the RRx / CRO pool and your wallet holds its LP tokens.");
}

async function main() {
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("Set PRIVATE_KEY in .env");
  const lpToken = process.env.LP_TOKEN_ADDRESS;
  if (!lpToken || !ethers.isAddress(lpToken)) throw new Error("Set LP_TOKEN_ADDRESS in .env");

  await checkPool(ethers, lpToken, deployer.address, network.config.chainId === 25);
  if (process.env.CHECK_ONLY) return;

  const months = Number(process.env.LOCK_MONTHS || 12);
  if (!(months >= 1 && months <= 60)) throw new Error("LOCK_MONTHS must be between 1 and 60");
  const beneficiary = process.env.LOCK_BENEFICIARY || deployer.address;
  const now = (await ethers.provider.getBlock("latest")).timestamp;
  const unlockTime = now + Math.round(months * 30.44 * 24 * 60 * 60);

  console.log(`Network:     ${network.name} (chainId ${network.config.chainId})`);
  console.log(`LP token:    ${lpToken}`);
  console.log(`Beneficiary: ${beneficiary}`);
  console.log(`Unlocks:     ${new Date(unlockTime * 1000).toUTCString()} (${months} months)`);

  const lock = await ethers.deployContract("LiquidityLock", [lpToken, beneficiary, unlockTime]);
  await lock.waitForDeployment();
  const address = await lock.getAddress();
  console.log(`Lock:        ${address}`);
  console.log("Next: send your LP tokens to the lock address above.");

  if (process.env.CRONOS_EXPLORER_API_KEY) {
    await lock.deploymentTransaction().wait(5);
    try {
      await hre.run("verify:verify", { address, constructorArguments: [lpToken, beneficiary, unlockTime] });
    } catch (err) {
      console.log(`Verification failed (you can retry later): ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

module.exports = { checkPool };
