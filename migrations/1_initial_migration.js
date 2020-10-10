const Migrations = artifacts.require("Util/Migrations");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
};
