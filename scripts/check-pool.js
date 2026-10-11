// Runs only the pool safety checks from lock-liquidity.js (no deploy).
process.env.CHECK_ONLY = "1";
require("./lock-liquidity.js");
