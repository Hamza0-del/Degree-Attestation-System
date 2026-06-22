const hre = require("hardhat");

async function main() {
  const DegreeSystem = await hre.ethers.getContractFactory("DegreeSystem");
  console.log("Deploying DegreeSystem contract...");
  const degreeSystem = await DegreeSystem.deploy();

  await degreeSystem.waitForDeployment();

  console.log("DegreeSystem contract deployed to:", await degreeSystem.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
