// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {LinkTokenInterface} from "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Lottery is VRFV2PlusWrapperConsumerBase, ConfirmedOwner {
	//Chainlink VRF - Direct Funding info for Sepolia Testnet Data
	struct RequestStatus {
		uint256 paid; // amount paid in LINK/ETH
		bool fulfilled;
		uint256[] randomWords;
	}
	uint32 constant callbackGasLimit = 100000;
	uint16 constant requestConfirmations = 3;
	uint32 constant numWords = 1;
	address constant linkAddress = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
	address constant wrapperAddress = 0x195f15F2d49d693cE265b4fB0fdDbE15b1850Cc1;
	uint256[] public requestIds; //past requests Id
	uint256 public lastRequestId;
	mapping(uint256 => RequestStatus) public reqStatus; // requestId --> requestStatus
	event RequestSent(uint256 requestId, uint32 numWords);
	event RequestFulfilled(uint256 requestId, uint256[] randomWords, uint256 payment);
	event RandomNumberHandled(uint256);
	event Received(address, uint256);

	//Lottery data
	uint256 public maxPlayers;
	uint256 public entryFee;
	uint256 public playerCount;
	address payable[] public players;
	bool public isActive;
	event PlayerEntered(address indexed player, uint256 totalPlayers);
	event LotteryClosed(uint256 chosenNumber, address winner);

	constructor(uint256 _maxPlayers, uint256 _entryFee, address _owner)
		ConfirmedOwner(_owner)
		VRFV2PlusWrapperConsumerBase(wrapperAddress)
	{
		maxPlayers = _maxPlayers;
		entryFee = _entryFee;
		playerCount = 0;
		isActive = true;
	}

	function requestRandomWords(bool payWithEth)
		external
		onlyOwner
		returns (uint256)
	{
		bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
		  VRFV2PlusClient.ExtraArgsV1({nativePayment: payWithEth}));
		uint256 requestId;
		uint256 reqPrice;

		//Requesting random number
		if(payWithEth){
			(requestId, reqPrice) = requestRandomnessPayInNative(
				callbackGasLimit,
				requestConfirmations,
				numWords,
				extraArgs
			);
		}
		else {
			(requestId, reqPrice) = requestRandomness(
			    callbackGasLimit,
			    requestConfirmations,
			    numWords,
			    extraArgs
			);
		}

		//Storing request information
		reqStatus[requestId] = RequestStatus({
			paid: reqPrice,
			randomWords: new uint256[](0),
			fulfilled: false
		});
		requestIds.push(requestId);
		lastRequestId = requestId;

		//Notify Dapp that a new request has been done
		emit RequestSent(requestId, numWords);

		return requestId;
	}

	function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords)
		internal
		override
	{
		require(reqStatus[_requestId].paid > 0, "request not found");
		reqStatus[_requestId].fulfilled = true;
		reqStatus[_requestId].randomWords = _randomWords;

		emit RequestFulfilled(
			_requestId,
			_randomWords,
			reqStatus[_requestId].paid
		);

		//Lottery related
		uint256 idx = _randomWords[0] % players.length;
		address payable winner = players[idx];

		// DESCOMENTAR PARA TRANSFERIR ETH:
		(bool success, ) = winner.call{value: address(this).balance}("");
		require(success, "Error when transfering balance");

		// DESCOMENTAR PARA TRANSFERIR LINK:
		// uint256 contractBalance = IERC20(linkAddress).balanceOf(address(this));
		// require(contractBalance > 0, "No LINK to transfer!");
		// require(IERC20(linkAddress).transfer(winner, contractBalance), "LINK transfer failed!");

		emit LotteryClosed(_randomWords[0], winner);
	}

	function getLinkBalance() public view returns (uint256) {
		return IERC20(linkAddress).balanceOf(address(this));
	}

	function getRequestStatus(uint256 _requestId)
		external
		view
		returns (uint256 paid, bool fulfilled, uint256[] memory randomWords)
	{
		require(reqStatus[_requestId].paid > 0, "request not found");
		RequestStatus memory request = reqStatus[_requestId];
		return (request.paid, request.fulfilled, request.randomWords);
	}

	// Allow withdraw of Link tokens from the contract
	function withdrawLink() public onlyOwner {
		LinkTokenInterface link = LinkTokenInterface(linkAddress);
		require(
			link.transfer(msg.sender, link.balanceOf(address(this))),
			"Unable to transfer"
		);
	}

	/// @param amount the amount to withdraw, in wei
	function withdrawNative(uint256 amount) external onlyOwner {
		(bool success, ) = payable(owner()).call{value: amount}("");
		require(success, "withdrawNative failed");
	}

	receive() external payable {
		emit Received(msg.sender, msg.value);
	}



	// Lottery methods and modifiers
	modifier onlyActiveLottery() {
		require(isActive, "Lottery is not active");
		_;
	}

	modifier correctEntryFee() {
		require(msg.value == entryFee, "Incorrect entry fee");
		_;
	}

	modifier notMaxPlayersReached() {
		require(players.length < maxPlayers, "Max players reached");
		_;
	}

	function enter() public payable onlyActiveLottery correctEntryFee notMaxPlayersReached {
		players.push(payable(msg.sender));
		playerCount++;

		// console.log("enter: %s %d", msg.sender, playerCount);
		emit PlayerEntered(msg.sender, playerCount);
	}

	function toggleOnOff() public {
		isActive = !isActive;
	}
}
