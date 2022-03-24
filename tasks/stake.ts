import { task } from "hardhat/config";
import { Staking } from "../typechain";

task("stake", "Stake")
  .addParam("contract", "Address")
  .addParam("amount", "Amount")
  .setAction(async (taskArgs, hre) => {
    const { contract, amount } = taskArgs;
    const Contract = await hre.ethers.getContractFactory("Staking");
    const staking: Staking = await Contract.attach(contract);

    const tx = await staking.stake(amount);
    await tx.wait();
  });
