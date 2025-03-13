// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Lottery.sol";

contract LotteryFactory {
    address[] public lotteries;
    mapping(address => address) public lotteryCreators;

    event LotteryCreated(
        address indexed creator,
        address indexed lotteryAddress,
        uint256 maxPlayers,
        uint256 entryFee);

    function createLottery(uint256 _maxPlayers, uint256 _entryFee, address _owner) public {
        Lottery newContract = new Lottery(_maxPlayers, _entryFee, _owner);
        address lotteryAddress = address(newContract);
        
        lotteries.push(lotteryAddress);
        lotteryCreators[lotteryAddress] = _owner;
        
        emit LotteryCreated(_owner, lotteryAddress, _maxPlayers, _entryFee);
    }

    function getLotteriesDetails() external view returns (
        address[] memory, 
        uint256[] memory, 
        uint256[] memory, 
        uint256[] memory, 
        address[] memory
    ) {
        uint256 count = lotteries.length;
        address[] memory addresses = new address[](count);
        uint256[] memory maxPlayersList = new uint256[](count);
        uint256[] memory entryFees = new uint256[](count);
        uint256[] memory playerCounts = new uint256[](count);
        address[] memory creators = new address[](count);

        for (uint256 i = 0; i < count; i++) {
            Lottery lottery = Lottery(payable(lotteries[i]));
            addresses[i] = lotteries[i];
            maxPlayersList[i] = lottery.getMaxPlayers();
            entryFees[i] = lottery.getEntryFee();
            playerCounts[i] = lottery.playerCount();
            creators[i] = lotteryCreators[lotteries[i]];
        }

        return (addresses, maxPlayersList, entryFees, playerCounts, creators);
    }
}
