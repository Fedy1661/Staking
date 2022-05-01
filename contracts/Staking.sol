// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Staking {
    using SafeERC20 for IERC20;
    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    uint256 public freezeTime;
    uint256 public percent;

    address public immutable owner;

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

    event Stake(address indexed _owner, uint256 _amount);
    event Unstake(address indexed _owner, uint256 _amount);
    event Claim(address indexed _owner, uint256 _amount);


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

        emit Stake(msg.sender, amount);
    }

    function claim() public {
        User storage sender = userStruct[msg.sender];

        uint256 rewardQuantity = (block.timestamp - sender.timestamp) / 600;
        uint256 rewardAmount = (sender.amount * percent / 100) * rewardQuantity + sender.accumulated;

        rewardToken.safeTransfer(msg.sender, rewardAmount);

        delete sender.accumulated;
        sender.timestamp = sender.timestamp + rewardQuantity * 600;

        emit Claim(msg.sender, rewardAmount);
    }

    function unstake() public {
        User storage sender = userStruct[msg.sender];

        require(block.timestamp - sender.stackedAt >= freezeTime, 'Wait several minutes');

        stakingToken.safeTransfer(msg.sender, sender.amount);

        uint256 rewardQuantity = (block.timestamp - sender.timestamp) / 600;
        uint256 rewardAmount = (sender.amount * percent / 100) * rewardQuantity;
        sender.accumulated = sender.accumulated + rewardAmount;
        delete sender.amount;

        emit Unstake(msg.sender, sender.amount);
    }

    function setFreezeTime(uint256 _freezeTime) public onlyOwner {
        freezeTime = _freezeTime;
    }

    function setPercent(uint256 _percent) public onlyOwner {
        percent = _percent;
    }
}
