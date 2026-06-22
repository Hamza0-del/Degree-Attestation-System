const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const DegreeSystem = await hre.ethers.getContractFactory("DegreeSystem");
  console.log("Deploying DegreeSystem contract...");
  const degreeSystem = await DegreeSystem.deploy();

  await degreeSystem.waitForDeployment();

  const contractAddress = await degreeSystem.getAddress();
  console.log("DegreeSystem contract deployed to:", contractAddress);

  // ✅ Address ko frontend ke liye automatically save karo
  const configData = {
    contractAddress: contractAddress,
    network: "localhost",
    deployedAt: new Date().toISOString()
  };

  // Frontend src folder mein save karo
  const outputPath = path.join(__dirname, "../../frontend/src/contract-config.json");
  fs.writeFileSync(outputPath, JSON.stringify(configData, null, 2));
  console.log("✅ Contract address saved to frontend/src/contract-config.json");
  console.log("🚀 Frontend will now automatically use the new address!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
