// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./SafeERC20.sol";

contract Staking {
    using SafeERC20 for IERC20;
    IERC20 public stakingToken;
    IERC20 public rewardToken;

    uint public freezeTime;
    uint8 public percent;

    address public owner;

    struct User {
        uint256 amount;
        uint256 timestamp;
        uint256 stackedAt;
        uint256 accumulated;
    }

    mapping(address => User) private userStruct;

    modifier onlyOwner {
        require(msg.sender == owner, 'Only owner');
        _;
    }


    constructor(address _stakingToken, address _rewardsToken, uint _freezeTime, uint8 _percent){
        owner = msg.sender;
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardsToken);
        freezeTime = _freezeTime;
        percent = _percent;
    }

    function stake(uint256 amount) public {
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        User storage sender = userStruct[msg.sender];

        uint256 rewardQuantity = (block.timestamp - sender.timestamp) / 600;

        sender.accumulated = (sender.amount * percent / 100) * rewardQuantity;
        sender.timestamp = block.timestamp;
        sender.stackedAt = block.timestamp;
        sender.amount = sender.amount + amount;
    }

    function claim() public {
        User storage sender = userStruct[msg.sender];

        uint256 rewardQuantity = (block.timestamp - sender.timestamp) / 600;
        uint256 rewardAmount = (sender.amount * percent / 100) * rewardQuantity;

        rewardToken.safeTransfer(msg.sender, rewardAmount + sender.accumulated);

        delete sender.accumulated;
        sender.timestamp = sender.timestamp + rewardQuantity * 600;
    }

    function unstake() public {
        User storage sender = userStruct[msg.sender];

        require(block.timestamp - sender.stackedAt >= freezeTime, 'Wait several minutes');

        stakingToken.safeTransfer(msg.sender, sender.amount);

        uint256 rewardQuantity = (block.timestamp - sender.timestamp) / 600;
        uint256 rewardAmount = (sender.amount * percent / 100) * rewardQuantity;
        sender.accumulated = sender.accumulated + rewardAmount;
        delete sender.amount;
    }

    function setFreezeTime(uint _freezeTime) public onlyOwner {
        freezeTime = _freezeTime;
    }

    function setPercent(uint8 _percent) public onlyOwner {
        percent = _percent;
    }
}
