import { useState, useRef } from 'react'
import { ProviderMenu } from './components/Provider';
import { ethers } from 'ethers';
import factoryABI from './LotteryFactory.json';
import lotteryABI from './Lottery.json';
import './App.css'

const factoryAddr = '0x41604169696E57E7351CEDa7977A4Bb9A6C80FA2';

function TextInput(props: {
	id: string,
	name: string,
	value: string,
	label: string,
	setter: React.Dispatch<React.SetStateAction<string>>,
	placeholder: string
})
{
	const hasLabel = props.label != "";
	return (
	      <>
		      { hasLabel && <label htmlFor={props.name}> {props.label} </label> }
		      <input
			      id={props.id}
			      name={props.name}
			      type="text"
			      value={props.value}
			      onChange={(event) => props.setter(event.target.value)}
			      placeholder={props.placeholder}
		      />
	      </>
	)
}

type CreateLotteryBtnItem = {
	value: string,
	setter: React.Dispatch<React.SetStateAction<string>>
	label: string,
	placeholder: string
};
function CreateLotteryBtn(props: { submitHandler: (text: Array<string>) => void })
{
	const [maxPlayers, setMaxPlayers] = useState('');
	const [minFee, setMinFee] = useState('');
	const [ownerAddr, setOwnerAddr] = useState('');
	const texts: Array<CreateLotteryBtnItem> = [
		{value: maxPlayers, setter: setMaxPlayers, label: 'Max players', placeholder: '10'},
		{value: minFee, setter: setMinFee, label: 'Min fee', placeholder: '100000000000000000'},
		{value: ownerAddr, setter: setOwnerAddr, label: 'Owner address', placeholder: '0x0'}
	];

	function submitHandlerWrapper(e){
		e.preventDefault();
		const values = texts.map((t) => t.value);
		props.submitHandler(values);
	}

	const textInputs = texts.map((t, idx) => {
		return (
			<TextInput
				name={'createLotteryForm'}
				key={idx}
				id={`createLotteryTextInput${idx}`}
				value={t.value}
				setter={t.setter}
				label={t.label}
				placeholder={t.placeholder}
			/>
		)
	});

	return (
		<form onSubmit={submitHandlerWrapper}>
			{textInputs}
			<button type="submit"> Create lottery </button>
		</form>
	)
}


function LotteryGrid(props: {lotteries: Array<LotteryData>}){
	async function EnterLottery(contract: ethers.Contract, fee: BigInt){
		try{
			const tx = await contract.enter({
				// value: ethers.parseEther("0.01")
				value: fee,
			});
			await tx.wait();
		}
		catch(err: any){
			console.error(err);
		}
	}

	async function CloseLottery(contract: ethers.Contract){
		try{
			const tx = await contract.requestRandomWords(true, {
				gasLimit: ethers.parseUnits("3000000", "wei")
			});
			await tx.wait();
		}
		catch(err: any){
			if(err.receipt.from != (await contract.owner())){
				console.log("You are not the owner");
			}
			console.error(err);
		}
	}

	const activeLotteries = props.lotteries.filter((lottery) => lottery.open === true);
	const lotteryDivs = activeLotteries.map((data) => {
		return (
			<div key={data.address} className={'lottery-card'}>
			<p>{`At address: ${data.address}`}</p>
			<p>{`Creator: ${data.creator}`}</p>
			<p>{`Players: ${data.playerCount}/${data.maxPlayers}`}</p>
			<p>{`Fee: ${data.entryFee} Wei`}</p>
			// <p>{`ETH Balance: ${data.ethBalance} Wei`}</p>
			// <p>{`Link Balance: ${data.linkBalance} LINK`}</p>
			<button onClick={() => EnterLottery(data.contract, data.entryFee)}>Enter lottery</button>
			<button onClick={() => CloseLottery(data.contract)}>Close lottery</button>
			</div>
		);
	});

	return <div className={'lottery-container'}> {lotteryDivs} </div> ;
}


type LotteriesDetails = [
	string[], // address[]
	bigint[], // uint256[]
	bigint[], // uint256[]
	bigint[], // uint256[]
	string[]  // address[]
];

type LotteryData = {
	contract: ethers.Contract
	creator: string
	address: string
	playerCount: bigint
	maxPlayers: bigint
	entryFee: bigint //ETH
	open: boolean
	ethBalance: bigint
	linkBalance: bigint
};

function App() {
	//React state
	const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
	const [lotteries, setLotteries] = useState<Array<LotteryData>>([]);
	const contractsCache = useRef<{address: string, contract: ethers.Contract}[]>([]);

	function searchContract(addr: string) {
		return contractsCache.current.find((contract) => contract.address === addr)?.contract;
	}

	//Component callbacks
	async function chooseProvider(provider: EIP1193Provider){
		const webprovider = new ethers.BrowserProvider(provider);

		//creating readonly instance of the factory contract, only 'pure' and 'view' methods can be called
		const factory = new ethers.Contract(factoryAddr, factoryABI.abi, webprovider);
		const details: LotteriesDetails = await factory.getLotteriesDetails();
		const preLotteries = Array(details[0].length).fill(null);

		let contract: ethers.Contract | undefined;
		let signer: ethers.JsonRpcSigner;
		let contractAddr: string;
		let creatorAddr: string;
		for(let i=0; i<preLotteries.length; i++){
			contractAddr = details[0][i];
			creatorAddr = details[4][i];
			contract = searchContract(contractAddr);
			if(contract === undefined){
				console.log("Prefetch: creating", contractAddr);
				signer = await webprovider.getSigner();
				contract = new ethers.Contract(contractAddr, lotteryABI.abi, signer);
				contract.on(
					'PlayerEntered',
					(address: string, totalPlayers: bigint) => {
						console.log(`Lottery ${contractAddr}: ${address} just entered, totaling ${totalPlayers} players`);
						const updatePrevLotteries = (prevLotteries: LotteryData[]) => prevLotteries.map(lottery => {
							return lottery.address === contractAddr ?
							  {...lottery, playerCount: totalPlayers, ethBalance: lottery.ethBalance + lottery.entryFee} : lottery;
						});
						setLotteries(updatePrevLotteries);
					}
				)
				contract.on(
					'LotteryClosed',
					(chosenNumber: bigint, winnerAddr: string) => {
						console.log(`Lottery ${contractAddr}: ${winnerAddr} just won!`);
						const updatePrevLotteries = (prevLotteries: LotteryData[]) => prevLotteries.map(lottery => {
							return lottery.address === contractAddr ?
							  {...lottery, open: false} : lottery;
						});
						setLotteries(updatePrevLotteries);
					}
				);
				contract.on(
					'Received',
					(address: string, value: bigint) => {
						let v = value.toString();
						console.log(`Lottery ${contractAddr}: received ${v} ETH from ${address}`);
						const updatePrevLotteries = (prevLotteries: LotteryData[]) => prevLotteries.map(lottery => {
							return lottery.address === contractAddr ?  {...lottery, ethBalance: lottery.ethBalance + value } : lottery;
						});
						setLotteries(updatePrevLotteries);
					}
				)
				contractsCache.current.push({address: contractAddr, contract: contract});
			}
			preLotteries[i] = {
				contract: contract,
				address: contractAddr,
				maxPlayers: details[1][i],
				entryFee: details[2][i],
				playerCount: details[3][i],
				creator: creatorAddr,
				open: await contract.isActive(),
				ethBalance: await contract.getBalance(),
				linkBalance: await contract.getLinkBalance(),
			};
		}

		setProvider(webprovider);
		setLotteries(preLotteries);
	}

	function changeProvider(){
		setProvider(null);
		setLotteries([]);
	}

	function createLotteryHandler(values: Array<string>){
		let _maxPlayers = BigInt(values[0]);
		let _entryFee = BigInt(values[1]);
		let _signerAddr = values[2];
		createLottery(_maxPlayers, _entryFee, _signerAddr);
	}

	async function createLottery(_maxPlayers: bigint, _entryFee: bigint, _signerAddr: string){
		if(provider === null){
			return null;
		}
		const signer = await provider.getSigner(_signerAddr);
		const factory = new ethers.Contract(factoryAddr, factoryABI.abi, signer);
		factory.on(
			'LotteryCreated',
			(creator, addr, maxplayers, fee) => createLotteryListener(creator, addr, maxplayers, fee)
		);
		await factory.createLottery(_maxPlayers, _entryFee, _signerAddr);
	}

	async function createLotteryListener(creatorAddr: string, lotteryAddr: string, maxPlayers: bigint, entryFee: bigint){
		if(provider === null){
			console.log('createLotteryListener exited for', creatorAddr, lotteryAddr);
			return ;
		}

		let contract = searchContract(lotteryAddr);
		if(contract === undefined){
			console.log("Creation: creating", lotteryAddr);
			const signer = await provider.getSigner(creatorAddr);
			contract = new ethers.Contract(lotteryAddr, lotteryABI.abi, signer);
			contract.on(
				'PlayerEntered',
				(address: string, totalPlayers: bigint) => {
					console.log(`Lottery ${lotteryAddr}: ${address} just entered, totaling ${totalPlayers} players`);
					const updatePrevLotteries = (prevLotteries: LotteryData[]) => prevLotteries.map(lottery => {
						return lottery.address === lotteryAddr ?
						  {...lottery, playerCount: totalPlayers, ethBalance: lottery.ethBalance + lottery.entryFee} : lottery;
					});
					setLotteries(updatePrevLotteries);
				}
			)
			contract.on(
				'LotteryClosed',
				(chosenNumber: bigint, winnerAddr: string) => {
					console.log(`Lottery ${lotteryAddr}: ${winnerAddr} just won!`);
					const updatePrevLotteries = (prevLotteries: LotteryData[]) => prevLotteries.map(lottery => {
						return lottery.address === lotteryAddr ?  {...lottery, open: false} : lottery;
					});
					setLotteries(updatePrevLotteries);
				}
			);
			contract.on(
				'Received',
				(address: string, value: bigint) => {
					let v = value.toString();
					console.log(`Lottery ${lotteryAddr}: received ${v} ETH from ${address}`);
					const updatePrevLotteries = (prevLotteries: LotteryData[]) => prevLotteries.map(lottery => {
						return lottery.address === lotteryAddr ?  {...lottery, ethBalance: lottery.ethBalance + value } : lottery;
					});
					setLotteries(updatePrevLotteries);
				}
			)
			contractsCache.current.push({address: lotteryAddr, contract: contract});
		}

		const data: LotteryData = {
			contract: contract,
			creator: creatorAddr,
			address: lotteryAddr,
			playerCount: 0n,
			maxPlayers: maxPlayers,
			entryFee: entryFee,
			open: await contract.isActive(),
			ethBalance: await contract.getBalance(),
			linkBalance: await contract.getLinkBalance(),
		};
		const lotteriesCopy = lotteries.slice();
		lotteriesCopy.push(data);
		console.log('Contract just created', data);
		setLotteries(lotteriesCopy);
	}

	// Component Logic
	const providerChosen = provider !== null;
	const hasLotteries = lotteries.length !== 0;

	// Components
	const providerMenu = <ProviderMenu setProvider={(provider) => chooseProvider(provider)}/>;
	const changeProviderBtn = <button onClick={changeProvider}> Change provider </button>;
	const createLotteryBtn = <CreateLotteryBtn submitHandler={createLotteryHandler}/>;
	const lotteryGrid = <LotteryGrid lotteries={lotteries}/>

	//Final Component
	return (
		<>
			{ !providerChosen && providerMenu }
			{ providerChosen && changeProviderBtn }
			{ providerChosen && createLotteryBtn }
			{ hasLotteries && lotteryGrid}
		</>
	);
}

export default App
