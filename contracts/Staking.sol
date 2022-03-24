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

    mapping(address => User) private _balances;

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
        User memory user = _balances[msg.sender];
        uint256 count = (block.timestamp - user.timestamp) / 600;
        uint256 _amount = (user.amount * percent / 100) * count;
        user.accumulated += _amount;
        user.timestamp = block.timestamp;
        user.stackedAt = block.timestamp;
        user.amount += amount;
        _balances[msg.sender] = user;
    }

    function claim() public {
        User memory user = _balances[msg.sender];
        uint256 count = (block.timestamp - user.timestamp) / 600;
        uint256 amount = (user.amount * percent / 100) * count + user.accumulated;
        require(amount > 0, 'Nothing to withdraw');
        user.timestamp += count * 600;
        user.accumulated = 0;
        rewardToken.safeTransfer(msg.sender, amount);
        _balances[msg.sender] = user;
    }

    function unstake() public {
        User memory sender = _balances[msg.sender];
        require(block.timestamp - sender.stackedAt >= freezeTime, 'Wait several minutes');
        stakingToken.safeTransfer(msg.sender, sender.amount);
        _balances[msg.sender].amount = 0;
    }

    function setFreezeTime(uint _freezeTime) public onlyOwner {
        freezeTime = _freezeTime;
    }

    function setPercent(uint8 _percent) public onlyOwner {
        percent = _percent;
    }
}
