import { ethers, network } from "hardhat";
import chai, { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Staking, Token } from "../typechain";

chai.use(require("chai-bignumber")());

describe("Staking Contract", function() {
  let staking: Staking;
  let stakingToken: Token;
  let rewardToken: Token;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let clean: string;

  const initValue = 100;
  const freezeTime = 1200;
  const percent = 1;

  before(async () => {
    const Staking = await ethers.getContractFactory("Staking");
    const ERC20 = await ethers.getContractFactory("Token");
    stakingToken = await ERC20.deploy();
    rewardToken = await ERC20.deploy();
    await stakingToken.deployed();
    await rewardToken.deployed();
    staking = await Staking.deploy(
      stakingToken.address, rewardToken.address, freezeTime, percent
    );
    [owner, addr1] = await ethers.getSigners();
    await staking.deployed();

    clean = await network.provider.send("evm_snapshot");
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [clean]);
    clean = await network.provider.send("evm_snapshot");
  });

  describe("constructor", () => {
    it("stakingToken should be valid", async () => {
      expect(await staking.stakingToken()).to.be.equal(stakingToken.address)
    });
    it("rewardToken should be valid", async () => {
      expect(await staking.rewardToken()).to.be.equal(rewardToken.address)
    });
    it("freezeTime should be valid", async () => {
      expect(await staking.freezeTime()).to.be.equal(freezeTime);
    });
    it("percent should be valid", async () => {
      expect(await staking.percent()).to.be.equal(percent);
    });
  });

  describe("stake", () => {
    it("should return error without approve", async () => {
      await stakingToken.transfer(addr1.address, initValue);
      await rewardToken.transfer(staking.address, initValue);
      const tx = staking.connect(addr1).stake(initValue);
      const reason = 'You can\'t transfer so tokens from this user';
      await expect(tx).to.be.revertedWith(reason);
    });
    it("should increase reward after each 10 min", async () => {
      await stakingToken.transfer(addr1.address, initValue);
      await rewardToken.transfer(staking.address, initValue);
      await stakingToken.connect(addr1).approve(staking.address, initValue);
      await staking.connect(addr1).stake(initValue);

      await network.provider.send("evm_increaseTime", [600]);
      await network.provider.send("evm_mine");

      await staking.connect(addr1).claim();
      const reward = initValue * percent / 100;
      const balance = await rewardToken.balanceOf(addr1.address);
      expect(balance).to.be.equal(reward);
    });
  });

  describe("unstake", () => {
    it("should return an error when nothing to unstake", async () => {
      const tx = staking.connect(addr1).unstake();
      const reason = 'Value should be positive'
      await expect(tx).to.be.revertedWith(reason)
    });
    it("should return an error to unknown user", async () => {
      const tx = staking.connect(addr1).unstake()
      const reason = 'Value should be positive'
      await expect(tx).to.be.revertedWith(reason)
    });
    it("should throw error if less than freezeTime have passed after staking", async () => {
      await stakingToken.transfer(addr1.address, initValue);
      await rewardToken.transfer(staking.address, initValue);
      await stakingToken.connect(addr1).approve(staking.address, initValue);
      await staking.connect(addr1).stake(initValue);

      const tx = staking.connect(addr1).unstake();
      const reason = 'Wait several minutes'
      await expect(tx).to.be.revertedWith(reason)
    });
    it("should reset amount", async () => {
      await stakingToken.transfer(addr1.address, initValue);
      await rewardToken.transfer(staking.address, initValue);
      await stakingToken.connect(addr1).approve(staking.address, initValue);
      await staking.connect(addr1).stake(initValue);

      await network.provider.send("evm_increaseTime", [freezeTime]);
      await network.provider.send("evm_mine");

      await staking.connect(addr1).unstake();

      await network.provider.send("evm_increaseTime", [freezeTime]);
      await network.provider.send("evm_mine");

      const tx = staking.connect(addr1).unstake();
      const reason = "Value should be positive"
      await expect(tx).to.be.revertedWith(reason)

    });
    it("should be transfer to the correct user", async () => {
      await stakingToken.transfer(addr1.address, initValue);
      await rewardToken.transfer(staking.address, initValue);
      await stakingToken.connect(addr1).approve(staking.address, initValue);
      await staking.connect(addr1).stake(initValue);

      await network.provider.send("evm_increaseTime", [freezeTime]);
      await network.provider.send("evm_mine");

      await staking.connect(addr1).unstake();

      const balance = await stakingToken.balanceOf(addr1.address)
      expect(balance).to.be.equal(initValue)
    });
  });

  describe("Setters", () => {
    describe("setFreezeTime", () => {
      it("should throw error if the user is not an owner", async () => {
        const tx = staking.connect(addr1).setFreezeTime(freezeTime)
        const reason = 'Only owner'
        await expect(tx).to.be.revertedWith(reason)
      });
      it("should change value", async () => {
        const newFreezeTime = freezeTime + 1;
        await staking.setFreezeTime(newFreezeTime)
        const _freezeTime = await staking.freezeTime();
        expect(_freezeTime).to.be.equal(newFreezeTime)
      });
    });
    describe("setPercent", () => {
      it("should throw error if the user is not an owner", async () => {
        const tx = staking.connect(addr1).setPercent(percent)
        const reason = 'Only owner'
        await expect(tx).to.be.revertedWith(reason)
      });
      it("should change value", async () => {
        const newPercent = percent * 2;
        await staking.setPercent(newPercent)
        const _percent = await staking.percent();
        expect(_percent).to.be.equal(newPercent)
      });
    });
  });

  it("should claimed in each 10 minutes", async () => {
    await stakingToken.transfer(addr1.address, initValue);
    await rewardToken.transfer(staking.address, initValue);
    await stakingToken.connect(addr1).approve(staking.address, initValue);
    await staking.connect(addr1).stake(initValue);

    await network.provider.send("evm_increaseTime", [600]);
    await network.provider.send("evm_mine");

    await staking.connect(addr1).claim();
    const reward = initValue * percent / 100;
    const balance = await rewardToken.balanceOf(addr1.address);
    expect(balance).to.be.equal(reward);
  });

  it("should save rewards after staking", async () => {
    await stakingToken.transfer(addr1.address, initValue * 2);
    await rewardToken.transfer(staking.address, initValue);
    await stakingToken.connect(addr1).approve(staking.address, initValue * 2);
    await staking.connect(addr1).stake(initValue);

    await network.provider.send("evm_increaseTime", [600]);
    await network.provider.send("evm_mine");

    await staking.connect(addr1).stake(initValue);

    await staking.connect(addr1).claim();
    const reward = initValue * percent / 100;
    const balance = await rewardToken.balanceOf(addr1.address);
    expect(balance).to.be.equal(reward);
  });

  it("should be reverted when nothing to withdraw", async () => {
    await stakingToken.transfer(addr1.address, initValue);
    await rewardToken.transfer(staking.address, initValue);
    await stakingToken.connect(addr1).approve(staking.address, initValue);
    await staking.connect(addr1).stake(initValue);

    const tx = staking.connect(addr1).claim();
    await expect(tx).to.be.revertedWith("Nothing to withdraw");
  });

  it("should save time after claim", async () => {
    await stakingToken.transfer(addr1.address, initValue);
    await rewardToken.transfer(staking.address, initValue);
    await stakingToken.connect(addr1).approve(staking.address, initValue);
    await staking.connect(addr1).stake(initValue);

    await network.provider.send("evm_increaseTime", [1100]);
    await network.provider.send("evm_mine");

    await staking.connect(addr1).claim();

    await network.provider.send("evm_increaseTime", [100]);
    await network.provider.send("evm_mine");

    await staking.connect(addr1).claim();
    const reward = (initValue * percent / 100) * 2;
    const balance = await rewardToken.balanceOf(addr1.address);
    expect(balance).to.be.equal(reward);
  });


});
