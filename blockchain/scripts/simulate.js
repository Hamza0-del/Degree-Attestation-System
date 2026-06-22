const hre = require("hardhat");

async function main() {
  const [admin] = await hre.ethers.getSigners();
  
  // 1. Deploy Contract
  console.log("=== 1. Deploying DegreeSystem Smart Contract ===");
  const DegreeSystem = await hre.ethers.getContractFactory("DegreeSystem");
  const degreeSystem = await DegreeSystem.deploy();
  await degreeSystem.waitForDeployment();
  const contractAddress = await degreeSystem.getAddress();
  console.log("Contract deployed at:", contractAddress);
  console.log("Admin address:", admin.address);
  console.log();

  // 2. Issue 5 Degrees
  console.log("=== 2. Issuing 5 Degrees (Transactions) ===");
  const degreesToIssue = [
    { roll: "Roll01", name: "Alice", prog: "BSCS", date: "2026" },
    { roll: "Roll02", name: "Bob", prog: "BSCB", date: "2026" },
    { roll: "Roll03", name: "Charlie", prog: "BSCS", date: "2026" },
    { roll: "Roll04", name: "David", prog: "MSCS", date: "2028" },
    { roll: "Roll05", name: "Emma", prog: "MBA", date: "2029" }
  ];

  for (const student of degreesToIssue) {
    console.log(`Issuing degree for ${student.name} (Roll: ${student.roll}, Program: ${student.prog}, Date: ${student.date})...`);
    const tx = await degreeSystem.issueDegree(student.roll, student.name, student.prog, student.date);
    await tx.wait();
  }
  console.log();

  // 3. Verify Degrees (3 cases: 2 valid, 1 fake)
  console.log("=== 3. Verification & Fraud Detection ===");
  
  // Case A: Verify Roll01
  console.log("Verifying Roll01...");
  let result1 = await degreeSystem.verifyDegree.staticCall("Roll01");
  console.log("Result:", result1);
  let txVerify1 = await degreeSystem.verifyDegree("Roll01");
  await txVerify1.wait();

  // Case B: Verify Roll02
  console.log("Verifying Roll02...");
  let result2 = await degreeSystem.verifyDegree.staticCall("Roll02");
  console.log("Result:", result2);
  let txVerify2 = await degreeSystem.verifyDegree("Roll02");
  await txVerify2.wait();

  // Case C: Verify FakeRoll999 (should detect fraud)
  console.log("Verifying FakeRoll999 (Simulated Fraud)...");
  let resultFake = await degreeSystem.verifyDegree.staticCall("FakeRoll999");
  console.log("Result:", resultFake);
  let txVerifyFake = await degreeSystem.verifyDegree("FakeRoll999");
  await txVerifyFake.wait();
  console.log();

  // 4. Print counters
  console.log("=== 4. Live System Metrics (Dashboard Data) ===");
  const totalIssued = await degreeSystem.totalIssued();
  const totalVerified = await degreeSystem.totalVerified();
  const fraudAttempts = await degreeSystem.fraudAttempts();
  
  console.log("Total Degrees Issued   :", totalIssued.toString());
  console.log("Total Degrees Verified :", totalVerified.toString());
  console.log("Fraud Attempts Logged  :", fraudAttempts.toString());
}

main().catch((error) => {
  console.error("Simulation failed:", error);
  process.exitCode = 1;
});
