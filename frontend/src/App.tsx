import { useState } from 'react'
import { ProviderMenu } from './components/Provider';
import { ethers } from 'ethers';
import factoryABI from './LotteryFactory.json';
import lotteryABI from './Lottery.json';
import './App.css'

const contractAddr = '0xfa656FA514b9087B55f70e8FDa65085A12f318F9';

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
    {value: maxPlayers, setter: setMaxPlayers, label: 'maxPlayers', placeholder: '10'},
    {value: minFee, setter: setMinFee, label: 'minFee', placeholder: '100000000000000000 wei'},
    {value: ownerAddr, setter: setOwnerAddr, label: 'ownerAddress', placeholder: '0x106808f0C3F7241Bae984285699A6eD2348C5530'}
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
      <button type="submit"> Criar loteria </button>
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
	<p>{`Lottery at ${data.address}, ${data.playerCount}/${data.maxPlayers} players, ${data.entryFee} ETH`}</p>
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
};

function App() {
  //React state
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [lotteries, setLotteries] = useState<Array<LotteryData>>([]);

  //Component callbacks
  async function chooseProvider(provider: EIP1193Provider){
    const webprovider = new ethers.BrowserProvider(provider);
    //creating readonly instance of the factory contract, only 'pure' and 'view' methods can be called
    const factory = new ethers.Contract(contractAddr, factoryABI.abi, webprovider);
    const details: LotteriesDetails = await factory.getLotteriesDetails();
    const preLotteries = Array(details[0].length).fill(null);

    for(let i=0; i<preLotteries.length; i++){
      preLotteries[i] = {
	contract: new ethers.Contract(details[0][i], lotteryABI.abi, await webprovider.getSigner(details[4][i])),
	address: details[0][i],
	maxPlayers: details[1][i],
	entryFee: details[2][i],
	playerCount: details[3][i],
	creator: details[4][i],
      };
    }

    //TODO
    console.log('Lotteries pre loaded: ', preLotteries);

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
    const factory = new ethers.Contract(contractAddr, factoryABI.abi, signer);
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
      const data: LotteryData = {
	contract: new ethers.Contract(lotteryAddr, lotteryABI.abi, signer),
	creator: creatorAddr,
	address: lotteryAddr,
	playerCount: 0n,
	maxPlayers: maxPlayers,
	entryFee: entryFee
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
