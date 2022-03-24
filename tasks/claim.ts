import { task } from "hardhat/config";
import { Staking } from "../typechain";

task("claim", "Claim reward")
  .addParam("contract", "Address")
  .setAction(async (taskArgs, hre) => {
    const { contract } = taskArgs;
    const Contract = await hre.ethers.getContractFactory("Staking");
    const staking: Staking = await Contract.attach(contract);

    const tx = await staking.claim();
    await tx.wait();
  });
