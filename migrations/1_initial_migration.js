const Migrations = artifacts.require("Util/Migrations");

module.exports = function(deployer, network, accounts) {

  console.log("ACCOUNTS");
  console.log(accounts);

  deployer.deploy(Migrations);
};
