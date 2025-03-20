# dapp-lottery
A descentralized application which allows a user to create multiple lotteries,
which can be then entered by other people.

Each lottery can only be closed by its own creator.

Once closed, one of the participants for that lottery will be chosen and will
take the prize (in ETH)

The randomness is ensured by Chainlink!

## how to run locally
For linux:
```
cd /path/to/this/repo
cd blockchain
yarn
yarn run compile
cd ../frontend
yarn
yarn dev
# check http://localhost:5173 in your favorite browser :^)
```
