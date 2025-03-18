//https://docs.metamask.io/wallet/tutorials/react-dapp-local-state/
//https://docs.metamask.io/wallet/how-to/connect/
//https://eips.ethereum.org/EIPS/eip-6963
//https://eips.ethereum.org/EIPS/eip-1193
//https://react.dev/reference/react/useSyncExternalStore
//https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener



import { useSyncExternalStore } from 'react';
import injectProviderLogo from '/unknown.svg'



//Types

type ProviderMenuParams = {
	setProvider: (prov: EIP1193Provider) => void
};



//Module state

let detectedProviders: Array<EIP6963ProviderDetail> = [];

const providerStore = {
	getSnapshot: () => detectedProviders,

	subscribe(update: () => void){
		function addProvider(e: EIP6963AnnounceProviderEvent){
			const uuid = e.detail.info.uuid;
			for(let i=0; i<detectedProviders.length; i++){
				if(detectedProviders[i].info.uuid === uuid){
					return ;
				}
			}
			detectedProviders = [...detectedProviders, e.detail];
			update();
		}
		window.addEventListener('eip6963:announceProvider', addProvider);
		window.dispatchEvent(new Event('eip6963:requestProvider'));
		return () => window.removeEventListener('eip6963:announceProvider', addProvider);
	}
};




//Function

function ProviderMenu(params: ProviderMenuParams) {
	const providers = useSyncExternalStore(providerStore.subscribe, providerStore.getSnapshot);
	const hasInjectedProvider = 'ethereum' in window ? true : false; //legacy method
	const hasDetectedProvider = providers.length !== 0; //newer method (eip6963 compliant)
	const providerAvailable = hasInjectedProvider || hasDetectedProvider;
	const [width, height] = [96, 96]; //px, px

	if(providerAvailable === false){
		return <p> No provider detected... </p>
	}

	const injectedProviderButton = (
		<>
			<button onClick={() => params.setProvider(window.ethereum)}>
			<img
			src={injectProviderLogo}
			width={width}
			height={height}
			alt={'Injected Provider'}/>
			</button>
			<p> Injected Provider </p>
		</>
	);

	const detectedProviderList = providers.map(
		(detail) => {
			return (
				<div key={detail.info.uuid}>
				<button onClick={() => params.setProvider(detail.provider)}>
					<img
						src={detail.info.icon}
						width={width}
						height={height}
						alt={detail.info.name}
					/>
				</button>
				<p> {detail.info.name} </p>
				</div>
			)
		}
	);

	return (
		<div id="provider-menu">
		<p> Select a provider: </p>
		{ hasInjectedProvider && injectedProviderButton }
		{ hasDetectedProvider && detectedProviderList }
		</div>
	);
}

export {
	ProviderMenu,
};
