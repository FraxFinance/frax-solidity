const path = require('path');
const envPath = path.join(__dirname, '../../../../.env');
require('dotenv').config({ path: envPath });

const BigNumber = require('bignumber.js');
const util = require('util');
const chalk = require('chalk');
const Contract = require('web3-eth-contract');

const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { PERMIT_TYPEHASH, getPermitDigest, getDomainSeparator, sign } = require(path.join(__dirname, '../../../../dist/hardhat/test/openzeppelin/signatures'));

const constants = require(path.join(__dirname, '../../../../dist/types/constants'));
const utilities = require(path.join(__dirname, '../../../../dist/misc/utilities'));

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

// Set provider for all later instances to use
Contract.setProvider('http://127.0.0.1:7545');

global.artifacts = artifacts;
global.web3 = web3;

const hre = require("hardhat");

const {
  shouldBehaveLikeERC20,
  shouldBehaveLikeERC20Transfer,
  shouldBehaveLikeERC20Approve,
} = require('./ERC20.behavior');

const CrossChainCanonical = artifacts.require('CrossChainCanonical');

contract('CrossChainCanonical', function (accounts) {
    // this is the first account that buidler creates
    // https://github.com/nomiclabs/buidler/blob/d399a60452f80a6e88d974b2b9205f4894a60d29/packages/buidler-core/src/internal/core/config/default-config.ts#L41
    console.log("PKEY mini slice: ", (process.env.ROPSTEN_ONE_PKEY).slice(0, 8));
    const pkey_no_prefix = process.env.ROPSTEN_ONE_PKEY.slice(2);
    const ownerPrivateKey = Buffer.from(pkey_no_prefix, 'hex')
    const chainId = 31337 // hardhat

    // For the permit tests
    let [ owner, user ] = accounts

    // For the ERC20 tests
    const [ initialHolder, recipient, anotherAccount, custodianAccount ] = accounts;

    const name = 'My Token';
    const symbol = 'MTKN';
    let token_for_permit;

    const initialSupply = new BN(100);

    beforeEach(async function () {        
        token_for_permit = await CrossChainCanonical.new(name, symbol, owner, initialSupply, owner, []);
        this.token = await CrossChainCanonical.new(name, symbol, initialHolder, initialSupply, custodianAccount, []);
    });

    it('has a name', async function () {
        expect(await this.token.name()).to.equal(name);
    });

    it('has a symbol', async function () {
        expect(await this.token.symbol()).to.equal(symbol);
    });

    it('has 18 decimals', async function () {
        expect(await this.token.decimals()).to.be.bignumber.equal('18');
    });

    it('initializes DOMAIN_SEPARATOR and PERMIT_TYPEHASH correctly', async () => {
        assert.equal(await token_for_permit.PERMIT_TYPEHASH(), PERMIT_TYPEHASH)

        assert.equal(await token_for_permit.DOMAIN_SEPARATOR(), getDomainSeparator(name, token_for_permit.address, chainId))
    })

    it('permits and emits Approval (replay safe)', async () => {
        // Create the approval request
        const approve = {
            owner: owner,
            spender: user,
            value: 100,
        };

        // deadline as much as you want in the future
        const deadline = 100000000000000;

        // Get the user's nonce
        const nonce = new BigNumber(await token_for_permit.nonces(owner)).toNumber();

        // Print some variables
        console.log("name: ", name);
        console.log("token_for_permit.address: ", token_for_permit.address);
        console.log("chainId: ", chainId);
        console.log("approve: ", approve);
        console.log("nonce: ", nonce);
        console.log("deadline: ", deadline);

        // Get the EIP712 digest
        const digest = getPermitDigest(name, token_for_permit.address, chainId, approve, nonce, deadline);

        // Sign it
        // NOTE: Using web3.eth.sign will hash the message internally again which
        // we do not want, so we're manually signing here
        const { v, r, s } = sign(digest, ownerPrivateKey);
        console.log("=========== MANUAL ===========")
        console.log("v: ", v);
        console.log("r: ", r);
        console.log("s: ", s);

        // console.log("=========== WEB3 ===========")
        // console.log("v_web3: ", v_web3);
        // console.log("r_web3: ", r_web3);
        // console.log("s_web3: ", s_web3);

        // Approve it
        const receipt = await token_for_permit.permit(approve.owner, approve.spender, approve.value, deadline, v, r, s);
        const event = receipt.logs[0];

        // It worked!
        assert.equal(event.event, 'Approval')
        assert.equal(await token_for_permit.nonces(owner), 1);
        assert.equal(await token_for_permit.allowance(approve.owner, approve.spender), approve.value);

        // Re-using the same sig doesn't work since the nonce has been incremented
        // on the contract level for replay-protection
        await expectRevert(
        token_for_permit.permit(approve.owner, approve.spender, approve.value, deadline, v, r, s),
        'ERC20Permit: invalid signature'
        );

        // invalid ecrecover's return address(0x0), so we must also guarantee that
        // this case fails
        await expectRevert(
            token_for_permit.permit(
                '0x0000000000000000000000000000000000000000',
                approve.spender,
                approve.value,
                deadline,
                '0x99',
                r,
                s
            ),
            "ECDSA: invalid signature 'v' value"
        );
    })


    shouldBehaveLikeERC20('ERC20', initialSupply, initialHolder, recipient, anotherAccount);

    describe('decrease allowance', function () {
        describe('when the spender is not the zero address', function () {
            const spender = recipient;

            function shouldDecreaseApproval (amount) {
            describe('when there was no approved amount before', function () {
                it('reverts', async function () {
                    await expectRevert(this.token.decreaseAllowance(
                        spender, amount, { from: initialHolder }), 'ERC20: decreased allowance below zero',
                    );
                });
            });

            describe('when the spender had an approved amount', function () {
                const approvedAmount = amount;

                beforeEach(async function () {
                    ({ logs: this.logs } = await this.token.approve(spender, approvedAmount, { from: initialHolder }));
                });

                it('emits an approval event', async function () {
                    const { logs } = await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });

                    expectEvent.inLogs(logs, 'Approval', {
                        owner: initialHolder,
                        spender: spender,
                        value: new BN(0),
                    });
                });

                it('decreases the spender allowance subtracting the requested amount', async function () {
                    await this.token.decreaseAllowance(spender, approvedAmount.subn(1), { from: initialHolder });

                    expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal('1');
                });

                it('sets the allowance to zero when all allowance is removed', async function () {
                    await this.token.decreaseAllowance(spender, approvedAmount, { from: initialHolder });
                    expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal('0');
                });

                it('reverts when more than the full allowance is removed', async function () {
                    await expectRevert(
                        this.token.decreaseAllowance(spender, approvedAmount.addn(1), { from: initialHolder }),
                        'ERC20: decreased allowance below zero',
                    );
                });
            });
            }

            describe('when the sender has enough balance', function () {
                const amount = initialSupply;

                shouldDecreaseApproval(amount);
            });

            describe('when the sender does not have enough balance', function () {
                const amount = initialSupply.addn(1);

                shouldDecreaseApproval(amount);
            });
        });

        describe('when the spender is the zero address', function () {
            const amount = initialSupply;
            const spender = ZERO_ADDRESS;

            it('reverts', async function () {
                await expectRevert(this.token.decreaseAllowance(
                    spender, amount, { from: initialHolder }), 'ERC20: decreased allowance below zero',
                );
            });
        });
    });

    describe('increase allowance', function () {
        const amount = initialSupply;

        describe('when the spender is not the zero address', function () {
            const spender = recipient;

            describe('when the sender has enough balance', function () {
                it('emits an approval event', async function () {
                    const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                    expectEvent.inLogs(logs, 'Approval', {
                    owner: initialHolder,
                    spender: spender,
                    value: amount,
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                        expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await this.token.approve(spender, new BN(1), { from: initialHolder });
                    });

                    it('increases the spender allowance adding the requested amount', async function () {
                        await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                        expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount.addn(1));
                    });
                });
            });

            describe('when the sender does not have enough balance', function () {
                const amount = initialSupply.addn(1);

                it('emits an approval event', async function () {
                    const { logs } = await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                    expectEvent.inLogs(logs, 'Approval', {
                    owner: initialHolder,
                    spender: spender,
                    value: amount,
                    });
                });

                describe('when there was no approved amount before', function () {
                    it('approves the requested amount', async function () {
                        await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                        expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount);
                    });
                });

                describe('when the spender had an approved amount', function () {
                    beforeEach(async function () {
                        await this.token.approve(spender, new BN(1), { from: initialHolder });
                    });

                    it('increases the spender allowance adding the requested amount', async function () {
                        await this.token.increaseAllowance(spender, amount, { from: initialHolder });

                        expect(await this.token.allowance(initialHolder, spender)).to.be.bignumber.equal(amount.addn(1));
                    });
                });
            });
        });

        describe('when the spender is the zero address', function () {
            const spender = ZERO_ADDRESS;

            it('reverts', async function () {
                await expectRevert(
                    this.token.increaseAllowance(spender, amount, { from: initialHolder }), 'ERC20: approve to the zero address',
                );
            });
        });
    });

});