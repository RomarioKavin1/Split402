const { ethers } = require("hardhat");

async function main() {
  const SplitRegistry = await ethers.getContractFactory("PaymentSplitterRegistry");
  const splitRegistry = await SplitRegistry.deploy();
  await splitRegistry.waitForDeployment();
  console.log("PaymentSplitterRegistry deployed to:", splitRegistry.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
