//https://hardhat.org/ignition/docs/getting-started#overview

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { network, ethers } = require("hardhat");

const TokenModule = buildModule("FactoryModule", (m) => {
  const token = m.contract("LotteryFactory");

  console.log("Deploying to network:", network.name);
  console.log("Provider URL:", ethers.provider.connection);

  return { token };
});

module.exports = TokenModule;
