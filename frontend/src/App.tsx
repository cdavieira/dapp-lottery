import { useState } from 'react'
import { ProviderMenu } from './components/Provider';
import { ethers } from 'ethers';
import factoryABI from './LotteryFactory.json';
import lotteryABI from './Lottery.json';
import './App.css'

// const factoryAddr = '0xfa656FA514b9087B55f70e8FDa65085A12f318F9';
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
  async function EnterLottery(contract: ethers.Contract){
    await contract.enter();
  }

  async function CloseLottery(contract: ethers.Contract){
    await contract.requestRandomWords(true);
  }

  const lotteryDivs = props.lotteries.map((data) => {
    return (
      <div key={data.address} className={'lottery-card'}>
	<p>{`At address: ${data.address}`}</p>
	<p>{`Players: ${data.playerCount}/${data.maxPlayers}`}</p>
	<p>{`Fee: ${data.entryFee} ETH`}</p>
	<p>{`ETH Balance: ${data.ethBalance} ETH`}</p>
	<p>{`Link Balance: ${data.linkBalance} LINK`}</p>
	<button onClick={() => EnterLottery(data.contract)}>Enter lottery</button>
	<button onClick={() => CloseLottery(data.contract)}>Close lottery</button>
      </div>
    );
  });

  return (
    <div className={'lottery-container'}>
      {lotteryDivs}
    </div>
  );
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
  playerCount: BigInt
  maxPlayers: BigInt
  entryFee: BigInt //ETH
  open: boolean
  ethBalance: BigInt
  linkBalance: BigInt
};

function App() {
  //React state
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [lotteries, setLotteries] = useState<Array<LotteryData>>([]);

  //Component callbacks
  async function chooseProvider(provider: EIP1193Provider){
    const webprovider = new ethers.BrowserProvider(provider);
    //creating readonly instance of the factory contract, only 'pure' and 'view' methods can be called
    const factory = new ethers.Contract(factoryAddr, factoryABI.abi, webprovider);
    const details: LotteriesDetails = await factory.getLotteriesDetails();
    const preLotteries = Array(details[0].length).fill(null);

    let contract: ethers.Contract;
    let signer: ethers.JsonRpcSigner;
    let address: string;
    let creatorAddr: string;
    for(let i=0; i<preLotteries.length; i++){
      address = details[0][i];
      creatorAddr = details[4][i];
      signer = await webprovider.getSigner(creatorAddr);
      contract = new ethers.Contract(address, lotteryABI.abi, signer);
      preLotteries[i] = {
	contract: contract,
	address: address,
	maxPlayers: details[1][i],
	entryFee: details[2][i],
	playerCount: details[3][i],
	creator: creatorAddr,
	open: await contract.isActive(),
	ethBalance: await contract.getBalance(),
	linkBalance: await contract.getLinkBalance(),
      };
      contract.on(
	'PlayerEntered',
	(playerAddr, playerCount) => {
	  console.log(`New player ${playerAddr} entered in lottery ${preLotteries[i].address}`);
	  console.log('Reload the page to see this');
	  preLotteries[i].playerCount = playerCount;
	}
      );
      contract.on(
	'LotteryClosed',
	(chosenNumber, winnerAddr) => {
	  console.log(`Lottery ${preLotteries[i].address} has been closed`);
	  console.log('Reload the page to see this');
	  preLotteries[i].open = false;
	}
      );
    }

    //TODO
    // console.log('Lotteries pre loaded: ', preLotteries);

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

  async function createLottery(_maxPlayers: BigInt, _entryFee: BigInt, _signerAddr: string){
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

  async function createLotteryListener(creatorAddr: string, lotteryAddr: string, maxPlayers: BigInt, entryFee: BigInt){
      if(provider === null){
	console.log('createLotteryListener exited for', creatorAddr, lotteryAddr);
	return ;
      }

      const lotteriesCopy = lotteries.slice();
      const signer = await provider.getSigner(creatorAddr);
      const contract = new ethers.Contract(lotteryAddr, lotteryABI.abi, signer);
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

      //TODO
      console.log('Contract just created', data);

      lotteriesCopy.push(data);
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
  )
}

export default App
