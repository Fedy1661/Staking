import { task } from "hardhat/config";

task("deploy", "Get from allowances")
  .addParam("staking", "Address")
  .addParam("reward", "Address")
  .addParam("freeze", "Number", "1200")
  .addParam("percent", "Number", "2")
  .setAction(async (taskArgs, hre) => {
    const { staking: stakingToken, reward, freeze, percent } = taskArgs;
    const Staking = await hre.ethers.getContractFactory("Staking");
    const staking = await Staking.deploy(stakingToken, reward, freeze, percent);

    await staking.deployed();

    console.log("Staking deployed to:", staking.address);
  });
