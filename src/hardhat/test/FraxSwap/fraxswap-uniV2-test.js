const {expect} = require("chai");
const {ethers} = require("hardhat");
const {constants, BigNumber, utils} = require('ethers');
const {ecsign} = require('ethereumjs-util');
const {
    bigNumberify,
    expandTo18Decimals,
    encodePrice,
    getCreate2Address,
    getApprovalDigest
} = require('./utilities');

const UniV2TWAMMPair = require('../../artifacts/contracts/Uniswap_V2_TWAMM/core/UniV2TWAMMPair.sol/UniV2TWAMMPair');

const MINIMUM_LIQUIDITY = utils.parseUnits(`${1000}`, 0);

describe("UniswapV2 Tests", function () {

    const {AddressZero} = constants;

    describe("Core Tests - UniV2TWAMMPair", function () {

        let owner
        let user1
        let user2
        let user3

        let token0
        let token1
        let factory
        let pair

        async function addLiquidity(pair, token0, token1, user1, token0Amount, token1Amount) {
            await token0.connect(user1).transfer(pair.address, token0Amount)
            await token1.connect(user1).transfer(pair.address, token1Amount)
            await pair.connect(user1).mint(user1.address)

            // const longTermOrderAmount = expandTo18Decimals(1);
            // await token0.connect(user2).approve(pair.address, longTermOrderAmount)
            // await pair.connect(user2).longTermSwapFromAToB(longTermOrderAmount, 10)
        }

        beforeEach(async function () {
            const signers = await ethers.getSigners();
            owner = signers[0];
            user1 = signers[1];
            user2 = signers[2];
            user3 = signers[3];

            const setupCnt = await setupContracts();
            token0 = setupCnt.token0;
            token1 = setupCnt.token1;
            factory = setupCnt.factory;
            pair = setupCnt.pair;

        });

        it("mint", async function () {

            const token0Amount = expandTo18Decimals(1)
            const token1Amount = expandTo18Decimals(4)
            await token0.connect(user1).transfer(pair.address, token0Amount)
            await token1.connect(user1).transfer(pair.address, token1Amount)

            const expectedLiquidity = expandTo18Decimals(2)
            await expect(pair.connect(user1).mint(user1.address))
                .to.emit(pair, 'Transfer')
                .withArgs(AddressZero, AddressZero, MINIMUM_LIQUIDITY)
                .to.emit(pair, 'Transfer')
                .withArgs(AddressZero, user1.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
                .to.emit(pair, 'Sync')
                .withArgs(token0Amount, token1Amount)
                .to.emit(pair, 'Mint')
                .withArgs(user1.address, token0Amount, token1Amount)

            expect(await pair.totalSupply()).to.eq(expectedLiquidity)
            expect(await pair.balanceOf(user1.address)).to.eq(expectedLiquidity.sub(MINIMUM_LIQUIDITY))
            expect(await token0.balanceOf(pair.address)).to.eq(token0Amount)
            expect(await token1.balanceOf(pair.address)).to.eq(token1Amount)
            const reserves = await pair.getReserves()
            expect(reserves[0]).to.eq(token0Amount)
            expect(reserves[1]).to.eq(token1Amount)

        });

        it('swap:token0', async () => {

            const token0Amount = expandTo18Decimals(5)
            const token1Amount = expandTo18Decimals(10)
            await addLiquidity(pair, token0, token1, user1, token0Amount, token1Amount)

            const swapAmount = expandTo18Decimals(1)
            const expectedOutputAmount = bigNumberify('1662497915624478906')
            await token0.connect(user1).transfer(pair.address, swapAmount)
            await expect(pair.connect(user1).swap(0, expectedOutputAmount, user1.address, '0x'))
                .to.emit(token1, 'Transfer')
                .withArgs(pair.address, user1.address, expectedOutputAmount)
                .to.emit(pair, 'Sync')
                .withArgs(token0Amount.add(swapAmount), token1Amount.sub(expectedOutputAmount))
                .to.emit(pair, 'Swap')
                .withArgs(user1.address, swapAmount, 0, 0, expectedOutputAmount, user1.address)

            const reserves = await pair.getReserves()
            expect(reserves[0]).to.eq(token0Amount.add(swapAmount))
            expect(reserves[1]).to.eq(token1Amount.sub(expectedOutputAmount))
            expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.add(swapAmount))
            expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.sub(expectedOutputAmount))
            const totalSupplyToken0 = await token0.totalSupply()
            const totalSupplyToken1 = await token1.totalSupply()
            expect(await token0.balanceOf(user1.address)).to.eq(totalSupplyToken0.sub(token0Amount).sub(swapAmount))
            expect(await token1.balanceOf(user1.address)).to.eq(totalSupplyToken1.sub(token1Amount).add(expectedOutputAmount))
        });

        it('swap:token1', async () => {

            const token0Amount = expandTo18Decimals(5)
            const token1Amount = expandTo18Decimals(10)
            await addLiquidity(pair, token0, token1, user1, token0Amount, token1Amount)

            const swapAmount = expandTo18Decimals(1)
            const expectedOutputAmount = bigNumberify('453305446940074565')
            await token1.connect(user1).transfer(pair.address, swapAmount)
            await expect(pair.connect(user1).swap(expectedOutputAmount, 0, user1.address, '0x'))
                .to.emit(token0, 'Transfer')
                .withArgs(pair.address, user1.address, expectedOutputAmount)
                .to.emit(pair, 'Sync')
                .withArgs(token0Amount.sub(expectedOutputAmount), token1Amount.add(swapAmount))
                .to.emit(pair, 'Swap')
                .withArgs(user1.address, 0, swapAmount, expectedOutputAmount, 0, user1.address)

            const reserves = await pair.getReserves()
            expect(reserves[0]).to.eq(token0Amount.sub(expectedOutputAmount))
            expect(reserves[1]).to.eq(token1Amount.add(swapAmount))
            expect(await token0.balanceOf(pair.address)).to.eq(token0Amount.sub(expectedOutputAmount))
            expect(await token1.balanceOf(pair.address)).to.eq(token1Amount.add(swapAmount))
            const totalSupplyToken0 = await token0.totalSupply()
            const totalSupplyToken1 = await token1.totalSupply()
            expect(await token0.balanceOf(user1.address)).to.eq(totalSupplyToken0.sub(token0Amount).add(expectedOutputAmount))
            expect(await token1.balanceOf(user1.address)).to.eq(totalSupplyToken1.sub(token1Amount).sub(swapAmount))
        });

        it('swap:gas', async () => {

            const token0Amount = expandTo18Decimals(5)
            const token1Amount = expandTo18Decimals(10)
            await addLiquidity(pair, token0, token1, user1, token0Amount, token1Amount)

            // ensure that setting price{0,1}CumulativeLast for the first time doesn't affect our gas math

            await network.provider.send("evm_mine");
            // await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)

            await pair.sync()

            const swapAmount = expandTo18Decimals(1)
            const expectedOutputAmount = bigNumberify('453305446940074565')
            await token1.connect(user1).transfer(pair.address, swapAmount)

            await network.provider.send("evm_mine");
            // await mineBlock(provider, (await provider.getBlock('latest')).timestamp + 1)

            const tx = await pair.connect(user1).swap(expectedOutputAmount, 0, user1.address, '0x')
            const receipt = await tx.wait()
            // expect(receipt.gasUsed).to.eq(73462) // previous gas usage
            expect(parseInt(receipt.gasUsed)).to.be.lessThan(200000)
        });

        it('burn', async () => {

            const token0Amount = expandTo18Decimals(3)
            const token1Amount = expandTo18Decimals(3)
            await addLiquidity(pair, token0, token1, user1, token0Amount, token1Amount)

            const expectedLiquidity = expandTo18Decimals(3)
            await pair.connect(user1).transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
            await expect(pair.connect(user1).burn(user1.address))
                .to.emit(pair, 'Transfer')
                .withArgs(pair.address, AddressZero, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
                .to.emit(token0, 'Transfer')
                .withArgs(pair.address, user1.address, token0Amount.sub(1000))
                .to.emit(token1, 'Transfer')
                .withArgs(pair.address, user1.address, token1Amount.sub(1000))
                .to.emit(pair, 'Sync')
                .withArgs(1000, 1000)
                .to.emit(pair, 'Burn')
                .withArgs(user1.address, token0Amount.sub(1000), token1Amount.sub(1000), user1.address)

            expect(await pair.balanceOf(user1.address)).to.eq(0)
            expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY)
            expect(await token0.balanceOf(pair.address)).to.eq(1000)
            expect(await token1.balanceOf(pair.address)).to.eq(1000)
            const totalSupplyToken0 = await token0.totalSupply()
            const totalSupplyToken1 = await token1.totalSupply()
            expect(await token0.balanceOf(user1.address)).to.eq(totalSupplyToken0.sub(1000))
            expect(await token1.balanceOf(user1.address)).to.eq(totalSupplyToken1.sub(1000))
        });

        it('price{0,1}CumulativeLast', async () => {
            const token0Amount = expandTo18Decimals(3)
            const token1Amount = expandTo18Decimals(3)
            await addLiquidity(pair, token0, token1, user1, token0Amount, token1Amount)

            const blockTimestamp = (await pair.getReserves())[2]

            await network.provider.send("evm_setNextBlockTimestamp", [blockTimestamp + 1]);
            // await mineBlock(provider, blockTimestamp + 1)

            await pair.sync()

            const initialPrice = encodePrice(token0Amount, token1Amount)
            expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0])
            expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1])
            expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 1)

            const swapAmount = expandTo18Decimals(3)
            await token0.connect(user1).transfer(pair.address, swapAmount)

            await network.provider.send("evm_setNextBlockTimestamp", [blockTimestamp + 10]);
            // await mineBlock(provider, blockTimestamp + 10)

            // swap to a new price eagerly instead of syncing
            await pair.connect(user1).swap(0, expandTo18Decimals(1), user1.address, '0x') // make the price nice

            expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0].mul(10))
            expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1].mul(10))
            expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 10)

            await network.provider.send("evm_setNextBlockTimestamp", [blockTimestamp + 20]);
            // await mineBlock(provider, blockTimestamp + 20)

            await pair.sync()

            const newPrice = encodePrice(expandTo18Decimals(6), expandTo18Decimals(2))
            expect(await pair.price0CumulativeLast()).to.eq(initialPrice[0].mul(10).add(newPrice[0].mul(10)))
            expect(await pair.price1CumulativeLast()).to.eq(initialPrice[1].mul(10).add(newPrice[1].mul(10)))
            expect((await pair.getReserves())[2]).to.eq(blockTimestamp + 20)
        });

        it('feeTo:off', async () => {
            const token0Amount = expandTo18Decimals(1000)
            const token1Amount = expandTo18Decimals(1000)
            await addLiquidity(pair, token0, token1, user1, token0Amount, token1Amount)

            const swapAmount = expandTo18Decimals(1)
            const expectedOutputAmount = bigNumberify('996006981039903216')
            await token1.connect(user1).transfer(pair.address, swapAmount)
            await pair.connect(user1).swap(expectedOutputAmount, 0, user1.address, '0x')
            const expectedLiquidity = expandTo18Decimals(1000)
            await pair.connect(user1).transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
            await pair.connect(user1).burn(user1.address)
            expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY)
        })

        it('feeTo:on', async () => {
            await factory.setFeeTo(user2.address)

            const token0Amount = expandTo18Decimals(1000)
            const token1Amount = expandTo18Decimals(1000)
            await addLiquidity(pair, token0, token1, user1, token0Amount, token1Amount)

            const swapAmount = expandTo18Decimals(1)
            const expectedOutputAmount = bigNumberify('996006981039903216')
            await token1.connect(user1).transfer(pair.address, swapAmount)
            await pair.connect(user1).swap(expectedOutputAmount, 0, user1.address, '0x')

            const expectedLiquidity = expandTo18Decimals(1000)
            await pair.connect(user1).transfer(pair.address, expectedLiquidity.sub(MINIMUM_LIQUIDITY))
            await pair.connect(user1).burn(user1.address)
            expect(await pair.totalSupply()).to.eq(MINIMUM_LIQUIDITY.add('249750499251388'))
            expect(await pair.balanceOf(user2.address)).to.eq('249750499251388')

            // using 1000 here instead of the symbolic MINIMUM_LIQUIDITY because the amounts only happen to be equal...
            // ...because the initial liquidity amounts were equal
            expect(await token0.balanceOf(pair.address)).to.eq(bigNumberify(1000).add('249501683697445'))
            expect(await token1.balanceOf(pair.address)).to.eq(bigNumberify(1000).add('250000187312969'))
        })

    });

    describe("Core Tests - UniV2TWAMMFactory", function () {

        const TEST_ADDRESSES = [
            '0x1000000000000000000000000000000000000000',
            '0x2000000000000000000000000000000000000000'
        ]

        let owner
        let user1
        let user2

        let token0
        let token1
        let factory
        let pair

        async function createPair(tokens) {
            const create2Address = getCreate2Address(factory.address, tokens, UniV2TWAMMPair.bytecode)
            await expect(factory.createPair(...tokens))
                .to.emit(factory, 'PairCreated')
                .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, bigNumberify(1))

            await expect(factory.createPair(...tokens)).to.be.reverted // UniswapV2: PAIR_EXISTS
            await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted // UniswapV2: PAIR_EXISTS
            expect(await factory.getPair(...tokens)).to.eq(create2Address)
            expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
            expect(await factory.allPairs(0)).to.eq(create2Address)
            expect(await factory.allPairsLength()).to.eq(1)

            const pair = new ethers.Contract(create2Address, UniV2TWAMMPair.abi).connect(owner);
            expect(await pair.factory()).to.eq(factory.address)
            expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
            expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
        }

        beforeEach(async function () {
            const signers = await ethers.getSigners();
            owner = signers[0];
            user1 = signers[1];
            user2 = signers[2];

            const setupCnt = await setupContracts(false);
            token0 = setupCnt.token0;
            token1 = setupCnt.token1;
            factory = setupCnt.factory;
            pair = setupCnt.pair;

        });

        it('feeTo, feeToSetter, allPairsLength', async () => {
            expect(await factory.feeTo()).to.eq(AddressZero)
            expect(await factory.feeToSetter()).to.eq(owner.address)
            expect(await factory.allPairsLength()).to.eq(0)
        })

        it('createPair', async () => {
            await createPair(TEST_ADDRESSES)
        })

        it('createPair:reverse', async () => {
            await createPair(TEST_ADDRESSES.slice().reverse())
        })

        it('createPair:gas', async () => {
            const tx = await factory.createPair(...TEST_ADDRESSES)
            const receipt = await tx.wait()
            // expect(receipt.gasUsed).to.eq(2512920) // previous gas usage
            expect(parseInt(receipt.gasUsed)).to.be.lessThan(5000000)
        })

        it('setFeeTo', async () => {
            await expect(factory.connect(user2).setFeeTo(user2.address)).to.be.reverted;//'UniswapV2: FORBIDDEN')
            await factory.setFeeTo(user1.address)
            expect(await factory.feeTo()).to.eq(user1.address)
        })

        it('setFeeToSetter', async () => {
            await expect(factory.connect(user2).setFeeToSetter(user2.address)).to.be.reverted;//'UniswapV2: FORBIDDEN')
            await factory.setFeeToSetter(user2.address)
            expect(await factory.feeToSetter()).to.eq(user2.address)
            await expect(factory.setFeeToSetter(user1.address)).to.be.reverted;//'UniswapV2: FORBIDDEN')
        })
    });

    describe("Core Tests - UniswapV2ERC20", function () {

        let owner
        let user1
        let user2

        let token

        const TOTAL_SUPPLY = expandTo18Decimals(10000)
        const TEST_AMOUNT = expandTo18Decimals(10)

        beforeEach(async function () {
            const signers = await ethers.getSigners();
            owner = signers[0];
            user1 = signers[1];
            user2 = signers[2];

            const TOKEN = await ethers.getContractFactory("contracts/Uniswap_V2_TWAMM/core/test/ERC20CoreTest.sol:ERC20CoreTest")
            token = await TOKEN.connect(user1).deploy(TOTAL_SUPPLY)
            await token.deployed();

        });

        it('name, symbol, decimals, totalSupply, balanceOf, DOMAIN_SEPARATOR, PERMIT_TYPEHASH', async () => {
            const name = await token.name()
            expect(name).to.eq('FraxSwap V1')
            expect(await token.symbol()).to.eq('FS-V1')
            expect(await token.decimals()).to.eq(18)
            expect(await token.totalSupply()).to.eq(TOTAL_SUPPLY)
            expect(await token.balanceOf(user1.address)).to.eq(TOTAL_SUPPLY)
            expect(await token.DOMAIN_SEPARATOR()).to.eq(
                utils.keccak256(
                    utils.defaultAbiCoder.encode(
                        ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
                        [
                            utils.keccak256(
                                utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
                            ),
                            utils.keccak256(utils.toUtf8Bytes(name)),
                            utils.keccak256(utils.toUtf8Bytes('1')),
                            network.config.chainId, // dynamically set the chainId for the test
                            token.address
                        ]
                    )
                )
            )
            expect(await token.PERMIT_TYPEHASH()).to.eq(
                utils.keccak256(utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'))
            )
        })

        it('approve', async () => {
            await expect(token.approve(user2.address, TEST_AMOUNT))
                .to.emit(token, 'Approval')
                .withArgs(user1.address, user2.address, TEST_AMOUNT)
            expect(await token.allowance(user1.address, user2.address)).to.eq(TEST_AMOUNT)
        })

        it('transfer', async () => {
            await expect(token.transfer(user2.address, TEST_AMOUNT))
                .to.emit(token, 'Transfer')
                .withArgs(user1.address, user2.address, TEST_AMOUNT)
            expect(await token.balanceOf(user1.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
            expect(await token.balanceOf(user2.address)).to.eq(TEST_AMOUNT)
        })

        it('transfer:fail', async () => {
            await expect(token.transfer(user2.address, TOTAL_SUPPLY.add(1))).to.be.reverted // ds-math-sub-underflow
            await expect(token.connect(user2).transfer(user1.address, 1)).to.be.reverted // ds-math-sub-underflow
        })

        it('transferFrom', async () => {
            await token.approve(user2.address, TEST_AMOUNT)
            await expect(token.connect(user2).transferFrom(user1.address, user2.address, TEST_AMOUNT))
                .to.emit(token, 'Transfer')
                .withArgs(user1.address, user2.address, TEST_AMOUNT)
            expect(await token.allowance(user1.address, user2.address)).to.eq(0)
            expect(await token.balanceOf(user1.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
            expect(await token.balanceOf(user2.address)).to.eq(TEST_AMOUNT)
        })

        it('transferFrom:max', async () => {
            await token.approve(user2.address, constants.MaxUint256)
            await expect(token.connect(user2).transferFrom(user1.address, user2.address, TEST_AMOUNT))
                .to.emit(token, 'Transfer')
                .withArgs(user1.address, user2.address, TEST_AMOUNT)
            expect(await token.allowance(user1.address, user2.address)).to.eq(constants.MaxUint256)
            expect(await token.balanceOf(user1.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
            expect(await token.balanceOf(user2.address)).to.eq(TEST_AMOUNT)
        })

        // TODO: fix this test
        // it('permit', async () => {
        //     const nonce = await token.nonces(user1.address)
        //     const deadline = constants.MaxUint256
        //     const digest = await getApprovalDigest(
        //         token,
        //         {owner: user1.address, spender: user2.address, value: TEST_AMOUNT},
        //         nonce,
        //         deadline
        //     )
        //
        //     const {v, r, s} = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(user1.privateKey.slice(2), 'hex'))
        //
        //     await expect(token.permit(user1.address, user2.address, TEST_AMOUNT, deadline, v, hexlify(r), hexlify(s)))
        //         .to.emit(token, 'Approval')
        //         .withArgs(user1.address, user2.address, TEST_AMOUNT)
        //     expect(await token.allowance(user1.address, user2.address)).to.eq(TEST_AMOUNT)
        //     expect(await token.nonces(user1.address)).to.eq(bigNumberify(1))
        // })
    });

    describe("Periphery Tests - UniV2TWAMMRouter", function () {

        async function addLiquidity(router, user1, DTT, DTTAmount, WETHAmount) {
            await DTT.connect(user1).approve(router.address, constants.MaxUint256)
            await router.connect(user1).addLiquidityETH(
                DTT.address,
                DTTAmount,
                DTTAmount,
                WETHAmount,
                user1.address,
                constants.MaxUint256,
                {value: WETHAmount}
            )

            // const pairAddress = await factory.getPair(DTT.address, WETH.address);
            // pair = new ethers.Contract(pairAddress, UniV2TWAMMPair.abi).connect(owner);

            // const longTermOrderAmount = expandTo18Decimals(1);
            // await token0.connect(user2).approve(pair.address, longTermOrderAmount)
            // await pair.connect(user2).longTermSwapFromAToB(longTermOrderAmount, 10)
        }

        let owner
        let user1
        let user2
        let user3

        let token0
        let token1
        let factory
        let router

        beforeEach(async function () {
            const signers = await ethers.getSigners();
            owner = signers[0];
            user1 = signers[1];
            user2 = signers[2];
            user3 = signers[3];

            const setupCnt = await setupContracts(false, false);
            token0 = setupCnt.token0;
            token1 = setupCnt.token1;
            router = setupCnt.router;
        });

        describe("UniV2TWAMMRouter", function () {

            it('quote', async () => {
                expect(await router.quote(bigNumberify(1), bigNumberify(100), bigNumberify(200))).to.eq(bigNumberify(2))
                expect(await router.quote(bigNumberify(2), bigNumberify(200), bigNumberify(100))).to.eq(bigNumberify(1))
                await expect(router.quote(bigNumberify(0), bigNumberify(100), bigNumberify(200))).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INSUFFICIENT_AMOUNT'
                )
                await expect(router.quote(bigNumberify(1), bigNumberify(0), bigNumberify(200))).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INSUFFICIENT_LIQUIDITY'
                )
                await expect(router.quote(bigNumberify(1), bigNumberify(100), bigNumberify(0))).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INSUFFICIENT_LIQUIDITY'
                )
            })

            it('getAmountOut', async () => {
                expect(await router.getAmountOut(bigNumberify(2), bigNumberify(100), bigNumberify(100))).to.eq(bigNumberify(1))
                await expect(router.getAmountOut(bigNumberify(0), bigNumberify(100), bigNumberify(100))).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INSUFFICIENT_INPUT_AMOUNT'
                )
                await expect(router.getAmountOut(bigNumberify(2), bigNumberify(0), bigNumberify(100))).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INSUFFICIENT_LIQUIDITY'
                )
                await expect(router.getAmountOut(bigNumberify(2), bigNumberify(100), bigNumberify(0))).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INSUFFICIENT_LIQUIDITY'
                )
            })

            it('getAmountIn', async () => {
                expect(await router.getAmountIn(bigNumberify(1), bigNumberify(100), bigNumberify(100))).to.eq(bigNumberify(2))
                await expect(router.getAmountIn(bigNumberify(0), bigNumberify(100), bigNumberify(100))).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INSUFFICIENT_OUTPUT_AMOUNT'
                )
                await expect(router.getAmountIn(bigNumberify(1), bigNumberify(0), bigNumberify(100))).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INSUFFICIENT_LIQUIDITY'
                )
                await expect(router.getAmountIn(bigNumberify(1), bigNumberify(100), bigNumberify(0))).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INSUFFICIENT_LIQUIDITY'
                )
            })

            it('getAmountsOut', async () => {
                await token0.connect(user1).approve(router.address, constants.MaxUint256)
                await token1.connect(user1).approve(router.address, constants.MaxUint256)
                await router.connect(user1).addLiquidity(
                    token0.address,
                    token1.address,
                    bigNumberify(10000),
                    bigNumberify(10000),
                    0,
                    0,
                    user1.address,
                    constants.MaxUint256
                )

                await expect(router.getAmountsOut(bigNumberify(2), [token0.address])).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INVALID_PATH'
                )
                const path = [token0.address, token1.address]
                expect(await router.getAmountsOut(bigNumberify(2), path)).to.deep.eq([bigNumberify(2), bigNumberify(1)])
            })

            it('getAmountsIn', async () => {
                await token0.connect(user1).approve(router.address, constants.MaxUint256)
                await token1.connect(user1).approve(router.address, constants.MaxUint256)
                await router.connect(user1).addLiquidity(
                    token0.address,
                    token1.address,
                    bigNumberify(10000),
                    bigNumberify(10000),
                    0,
                    0,
                    user1.address,
                    constants.MaxUint256
                )

                await expect(router.getAmountsIn(bigNumberify(1), [token0.address])).to.be.revertedWith(
                    'UniV2TWAMMLibrary: INVALID_PATH'
                )
                const path = [token0.address, token1.address]
                expect(await router.getAmountsIn(bigNumberify(1), path)).to.deep.eq([bigNumberify(2), bigNumberify(1)])
            })

        });

        describe("fee-on-transfer tokens", function () {

            let DTT
            let WETH
            let pair

            beforeEach(async function () {

                const setupCnt = await setupContracts(false, true);
                token0 = setupCnt.token0;
                token1 = setupCnt.token1;
                factory = setupCnt.factory;
                router = setupCnt.router;

                DTT = setupCnt.deflatingERC20;
                WETH = setupCnt.weth9;

                await factory.createPair(DTT.address, WETH.address);
                const pairAddress = await factory.getPair(DTT.address, WETH.address);
                pair = new ethers.Contract(pairAddress, UniV2TWAMMPair.abi).connect(owner);
            });

            afterEach(async function () {
                // expect(await provider.getBalance(router.address)).to.eq(0)
            })

            it('removeLiquidityETHSupportingFeeOnTransferTokens', async () => {
                const DTTAmount = expandTo18Decimals(1)
                const ETHAmount = expandTo18Decimals(4)
                await addLiquidity(router, user1, DTT, DTTAmount, ETHAmount)

                const DTTInPair = await DTT.balanceOf(pair.address)
                const WETHInPair = await WETH.balanceOf(pair.address)
                const liquidity = await pair.balanceOf(user1.address)
                const totalSupply = await pair.totalSupply()
                const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply)
                const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply)

                await pair.connect(user1).approve(router.address, constants.MaxUint256)
                await router.connect(user1).removeLiquidityETHSupportingFeeOnTransferTokens(
                    DTT.address,
                    liquidity,
                    NaiveDTTExpected,
                    WETHExpected,
                    user1.address,
                    constants.MaxUint256
                )
            })

            it('removeLiquidityETHWithPermitSupportingFeeOnTransferTokens', async () => {
                // TODO: fix this test
                // const DTTAmount = expandTo18Decimals(1)
                //     .mul(100)
                //     .div(99)
                // const ETHAmount = expandTo18Decimals(4)
                // await addLiquidity(DTTAmount, ETHAmount)
                //
                // const expectedLiquidity = expandTo18Decimals(2)
                //
                // const nonce = await pair.nonces(user1.address)
                // const digest = await getApprovalDigest(
                //     pair,
                //     { owner: user1.address, spender: router.address, value: expectedLiquidity.sub(MINIMUM_LIQUIDITY) },
                //     nonce,
                //     constants.MaxUint256
                // )
                // const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(wallet.privateKey.slice(2), 'hex'))
                //
                // const DTTInPair = await DTT.balanceOf(pair.address)
                // const WETHInPair = await WETH.balanceOf(pair.address)
                // const liquidity = await pair.balanceOf(wallet.address)
                // const totalSupply = await pair.totalSupply()
                // const NaiveDTTExpected = DTTInPair.mul(liquidity).div(totalSupply)
                // const WETHExpected = WETHInPair.mul(liquidity).div(totalSupply)
                //
                // await pair.approve(router.address, MaxUint256)
                // await router.removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
                //     DTT.address,
                //     liquidity,
                //     NaiveDTTExpected,
                //     WETHExpected,
                //     wallet.address,
                //     MaxUint256,
                //     false,
                //     v,
                //     r,
                //     s,
                //     overrides
                // )
            })

            describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {

                const DTTAmount = expandTo18Decimals(5)
                    .mul(100)
                    .div(99)
                const ETHAmount = expandTo18Decimals(10)
                const amountIn = expandTo18Decimals(1)

                beforeEach(async function () {
                    await addLiquidity(router, user1, DTT, DTTAmount, ETHAmount)
                });

                it('DTT -> WETH', async () => {
                    await DTT.connect(user1).approve(router.address, constants.MaxUint256)

                    await router.connect(user1).swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        amountIn,
                        0,
                        [DTT.address, WETH.address],
                        user1.address,
                        constants.MaxUint256
                    )
                })

                // WETH -> DTT
                it('WETH -> DTT', async () => {
                    await WETH.connect(user1).deposit({value: amountIn}) // mint WETH
                    await WETH.connect(user1).approve(router.address, constants.MaxUint256)

                    await router.connect(user1).swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        amountIn,
                        0,
                        [WETH.address, DTT.address],
                        user1.address,
                        constants.MaxUint256
                    )
                })
            })

            // ETH -> DTT
            it('swapExactETHForTokensSupportingFeeOnTransferTokens', async () => {
                const DTTAmount = expandTo18Decimals(10)
                    .mul(100)
                    .div(99)
                const ETHAmount = expandTo18Decimals(5)
                const swapAmount = expandTo18Decimals(1)
                await addLiquidity(router, user1, DTT, DTTAmount, ETHAmount)

                await router.connect(user1).swapExactETHForTokensSupportingFeeOnTransferTokens(
                    0,
                    [WETH.address, DTT.address],
                    user1.address,
                    constants.MaxUint256,
                    {
                        value: swapAmount
                    }
                )
            })

            // DTT -> ETH
            it('swapExactTokensForETHSupportingFeeOnTransferTokens', async () => {
                const DTTAmount = expandTo18Decimals(5)
                    .mul(100)
                    .div(99)
                const ETHAmount = expandTo18Decimals(10)
                const swapAmount = expandTo18Decimals(1)

                await addLiquidity(router, user1, DTT, DTTAmount, ETHAmount)
                await DTT.connect(user1).approve(router.address, constants.MaxUint256)

                await router.connect(user1).swapExactTokensForETHSupportingFeeOnTransferTokens(
                    swapAmount,
                    0,
                    [DTT.address, WETH.address],
                    user1.address,
                    constants.MaxUint256
                )
            })

        });

        describe('fee-on-transfer tokens: reloaded', () => {

            let DTT;
            let DTT2;

            beforeEach(async function () {


                const setupCnt = await setupContracts(false, true);
                token0 = setupCnt.token0;
                token1 = setupCnt.token1;
                factory = setupCnt.factory;
                router = setupCnt.router;

                DTT = await (await ethers.getContractFactory(
                    "contracts/Uniswap_V2_TWAMM/periphery/test/DeflatingERC20.sol:DeflatingERC20"
                )).deploy(expandTo18Decimals(10000));
                await DTT.transfer(user1.address, expandTo18Decimals(10000));

                DTT2 = await (await ethers.getContractFactory(
                    "contracts/Uniswap_V2_TWAMM/periphery/test/DeflatingERC20.sol:DeflatingERC20"
                )).deploy(expandTo18Decimals(10000));
                await DTT2.transfer(user1.address, expandTo18Decimals(10000));

                await factory.createPair(DTT.address, DTT2.address);
                const pairAddress = await factory.getPair(DTT.address, DTT2.address);
                pair = new ethers.Contract(pairAddress, UniV2TWAMMPair.abi).connect(owner);
            })

            afterEach(async function () {
                // expect(await provider.getBalance(router.address)).to.eq(0)
            })

            async function addLiquidity(router, user1, DTTAmount, DTT2Amount) {
                await DTT.connect(user1).approve(router.address, constants.MaxUint256)
                await DTT2.connect(user1).approve(router.address, constants.MaxUint256)
                await router.connect(user1).addLiquidity(
                    DTT.address,
                    DTT2.address,
                    DTTAmount,
                    DTT2Amount,
                    DTTAmount,
                    DTT2Amount,
                    user1.address,
                    constants.MaxUint256
                )
            }

            describe('swapExactTokensForTokensSupportingFeeOnTransferTokens', () => {
                const DTTAmount = expandTo18Decimals(5)
                    .mul(100)
                    .div(99)
                const DTT2Amount = expandTo18Decimals(5)
                const amountIn = expandTo18Decimals(1)

                beforeEach(async () => {
                    await addLiquidity(router, user1, DTTAmount, DTT2Amount)
                })

                it('DTT -> DTT2', async () => {
                    await DTT.connect(user1).approve(router.address, constants.MaxUint256)

                    await router.connect(user1).swapExactTokensForTokensSupportingFeeOnTransferTokens(
                        amountIn,
                        0,
                        [DTT.address, DTT2.address],
                        user1.address,
                        constants.MaxUint256
                    )
                })
            })
        })
    })

    describe("Periphery Tests - ExampleComputeLiquidityValue", function () {
        let owner
        let user1
        // let user2
        // let user3

        let token0
        let token1
        let factory
        let router
        let pair
        let computeLiquidityValue;

        beforeEach(async function () {
            const signers = await ethers.getSigners();
            owner = signers[0];
            user1 = signers[1];
            // user2 = signers[2];
            // user3 = signers[3];

            const setupCnt = await setupContracts(true, false);
            token0 = setupCnt.token0;
            token1 = setupCnt.token1;
            factory = setupCnt.factory;
            router = setupCnt.router;
            pair = setupCnt.pair;

            const ComputeLiquidityValue = await ethers.getContractFactory("ExampleComputeLiquidityValue");
            computeLiquidityValue = await ComputeLiquidityValue.deploy(factory.address);
        });

        beforeEach('mint some liquidity for the pair at 1:100 (100 shares minted)', async () => {
            await token0.connect(user1).transfer(pair.address, expandTo18Decimals(10))
            await token1.connect(user1).transfer(pair.address, expandTo18Decimals(1000))
            await pair.mint(user1.address)
            expect(await pair.totalSupply()).to.eq(expandTo18Decimals(100))
        });

        it('correct factory address', async () => {
            expect(await computeLiquidityValue.factory()).to.eq(factory.address)
        });

        describe('#getLiquidityValue', () => {
            it('correct for 5 shares', async () => {
                const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValue(
                    token0.address,
                    token1.address,
                    expandTo18Decimals(5)
                )
                expect(token0Amount).to.eq('500000000000000000')
                expect(token1Amount).to.eq('50000000000000000000')
            })
            it('correct for 7 shares', async () => {
                const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValue(
                    token0.address,
                    token1.address,
                    expandTo18Decimals(7)
                )
                expect(token0Amount).to.eq('700000000000000000')
                expect(token1Amount).to.eq('70000000000000000000')
            })

            it('correct after swap', async () => {
                await token0.connect(user1).approve(router.address, constants.MaxUint256)
                await router.connect(user1).swapExactTokensForTokens(
                    expandTo18Decimals(10),
                    0,
                    [token0.address, token1.address],
                    user1.address,
                    constants.MaxUint256
                )
                const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValue(
                    token0.address,
                    token1.address,
                    expandTo18Decimals(7)
                )
                expect(token0Amount).to.eq('1400000000000000000')
                expect(token1Amount).to.eq('35052578868302453680')
            })

            describe('fee on', () => {
                beforeEach('turn on fee', async () => {
                    await factory.setFeeTo(user1.address)
                })

                // this is necessary to cause kLast to be set
                beforeEach('mint more liquidity to address zero', async () => {
                    await token0.connect(user1).transfer(pair.address, expandTo18Decimals(10))
                    await token1.connect(user1).transfer(pair.address, expandTo18Decimals(1000))
                    await pair.mint(constants.AddressZero)
                    expect(await pair.totalSupply()).to.eq(expandTo18Decimals(200))
                })

                it('correct after swap', async () => {
                    await token0.connect(user1).approve(router.address, constants.MaxUint256)
                    await router.connect(user1).swapExactTokensForTokens(
                        expandTo18Decimals(20),
                        0,
                        [token0.address, token1.address],
                        user1.address,
                        constants.MaxUint256
                    )
                    const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValue(
                        token0.address,
                        token1.address,
                        expandTo18Decimals(7)
                    )
                    expect(token0Amount).to.eq('1399824934325735058')
                    expect(token1Amount).to.eq('35048195651620807684')
                })
            })

            describe('#getReservesAfterArbitrage', () => {
                it('1/400', async () => {
                    const [reserveA, reserveB] = await computeLiquidityValue.getReservesAfterArbitrage(
                        token0.address,
                        token1.address,
                        1,
                        400
                    )
                    expect(reserveA).to.eq('5007516917298542016')
                    expect(reserveB).to.eq('1999997739838173075192')
                })
                it('1/200', async () => {
                    const [reserveA, reserveB] = await computeLiquidityValue.getReservesAfterArbitrage(
                        token0.address,
                        token1.address,
                        1,
                        200
                    )
                    expect(reserveA).to.eq('7081698338256310291')
                    expect(reserveB).to.eq('1413330640570018326894')
                })
                it('1/100 (same price)', async () => {
                    const [reserveA, reserveB] = await computeLiquidityValue.getReservesAfterArbitrage(
                        token0.address,
                        token1.address,
                        1,
                        100
                    )
                    expect(reserveA).to.eq('10000000000000000000')
                    expect(reserveB).to.eq('1000000000000000000000')
                })
                it('1/50', async () => {
                    const [reserveA, reserveB] = await computeLiquidityValue.getReservesAfterArbitrage(
                        token0.address,
                        token1.address,
                        1,
                        50
                    )
                    expect(reserveA).to.eq('14133306405700183269')
                    expect(reserveB).to.eq('708169833825631029041')
                })
                it('1/25', async () => {
                    const [reserveA, reserveB] = await computeLiquidityValue.getReservesAfterArbitrage(
                        token0.address,
                        token1.address,
                        1,
                        25
                    )
                    expect(reserveA).to.eq('19999977398381730752')
                    expect(reserveB).to.eq('500751691729854201595')
                })
                it('25/1', async () => {
                    const [reserveA, reserveB] = await computeLiquidityValue.getReservesAfterArbitrage(
                        token0.address,
                        token1.address,
                        25,
                        1
                    )
                    expect(reserveA).to.eq('500721601459041764285')
                    expect(reserveB).to.eq('20030067669194168064')
                })
                it('works with large numbers for the price', async () => {
                    const [reserveA, reserveB] = await computeLiquidityValue.getReservesAfterArbitrage(
                        token0.address,
                        token1.address,
                        constants.MaxUint256.div(1000),
                        constants.MaxUint256.div(1000)
                    )
                    // diff of 30 bips
                    expect(reserveA).to.eq('100120248075158403008')
                    expect(reserveB).to.eq('100150338345970840319')
                })
            })

            describe('#getLiquidityValue', () => {
                describe('fee is off', () => {
                    it('produces the correct value after arbing to 1:105', async () => {
                        const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                            token0.address,
                            token1.address,
                            1,
                            105,
                            expandTo18Decimals(5)
                        )
                        expect(token0Amount).to.eq('488683612488266114') // slightly less than 5% of 10, or 0.5
                        expect(token1Amount).to.eq('51161327957205755422') // slightly more than 5% of 100, or 5
                    })

                    it('produces the correct value after arbing to 1:95', async () => {
                        const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                            token0.address,
                            token1.address,
                            1,
                            95,
                            expandTo18Decimals(5)
                        )
                        expect(token0Amount).to.eq('512255881944227034') // slightly more than 5% of 10, or 0.5
                        expect(token1Amount).to.eq('48807237571060645526') // slightly less than 5% of 100, or 5
                    })

                    it('produces correct value at the current price', async () => {
                        const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                            token0.address,
                            token1.address,
                            1,
                            100,
                            expandTo18Decimals(5)
                        )
                        expect(token0Amount).to.eq('500000000000000000')
                        expect(token1Amount).to.eq('50000000000000000000')
                    })

                    it('gas current price', async () => {
                        expect(
                            parseInt(await computeLiquidityValue.getGasCostOfGetLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                100,
                                expandTo18Decimals(5)
                            ))
                        ).to.be.lessThan(25000)
                    })

                    it('gas higher price', async () => {
                        expect(
                            parseInt(await computeLiquidityValue.getGasCostOfGetLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                105,
                                expandTo18Decimals(5)
                            ))
                        ).to.be.lessThan(25000)
                    })

                    it('gas lower price', async () => {
                        expect(
                            parseInt(await computeLiquidityValue.getGasCostOfGetLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                95,
                                expandTo18Decimals(5)
                            ))
                        ).to.be.lessThan(25000)
                    })

                    describe('after a swap', () => {
                        beforeEach('swap to ~1:25', async () => {
                            await token0.connect(user1).approve(router.address, constants.MaxUint256)
                            await router.connect(user1).swapExactTokensForTokens(
                                expandTo18Decimals(10),
                                0,
                                [token0.address, token1.address],
                                user1.address,
                                constants.MaxUint256
                            )
                            const [reserve0, reserve1] = await pair.getReserves()
                            expect(reserve0).to.eq('20000000000000000000')
                            expect(reserve1).to.eq('500751126690035052579') // half plus the fee
                        })

                        it('is roughly 1/25th liquidity', async () => {
                            const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                25,
                                expandTo18Decimals(5)
                            )

                            expect(token0Amount).to.eq('1000000000000000000')
                            expect(token1Amount).to.eq('25037556334501752628')
                        })

                        it('shares after arbing back to 1:100', async () => {
                            const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                100,
                                expandTo18Decimals(5)
                            )

                            expect(token0Amount).to.eq('501127678536722155')
                            expect(token1Amount).to.eq('50037429168613534246')
                        })
                    })
                })

                describe('fee is on', () => {
                    beforeEach('turn on fee', async () => {
                        await factory.setFeeTo(user1.address)
                    })

                    // this is necessary to cause kLast to be set
                    beforeEach('mint more liquidity to address zero', async () => {
                        await token0.connect(user1).transfer(pair.address, expandTo18Decimals(10))
                        await token1.connect(user1).transfer(pair.address, expandTo18Decimals(1000))
                        await pair.mint(constants.AddressZero)
                        expect(await pair.totalSupply()).to.eq(expandTo18Decimals(200))
                    })

                    describe('no fee to be collected', () => {
                        it('produces the correct value after arbing to 1:105', async () => {
                            const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                105,
                                expandTo18Decimals(5)
                            )
                            expect(token0Amount).to.eq('488680839243189328') // slightly less than 5% of 10, or 0.5
                            expect(token1Amount).to.eq('51161037620273529068') // slightly more than 5% of 100, or 5
                        })

                        it('produces the correct value after arbing to 1:95', async () => {
                            const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                95,
                                expandTo18Decimals(5)
                            )
                            expect(token0Amount).to.eq('512252817918759166') // slightly more than 5% of 10, or 0.5
                            expect(token1Amount).to.eq('48806945633721895174') // slightly less than 5% of 100, or 5
                        })

                        it('produces correct value at the current price', async () => {
                            const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                100,
                                expandTo18Decimals(5)
                            )
                            expect(token0Amount).to.eq('500000000000000000')
                            expect(token1Amount).to.eq('50000000000000000000')
                        })
                    })

                    it('gas current price', async () => {
                        expect(
                            parseInt(await computeLiquidityValue.getGasCostOfGetLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                100,
                                expandTo18Decimals(5)
                            ))
                        ).to.be.lessThan(50000)
                    })

                    it('gas higher price', async () => {
                        expect(
                            parseInt(await computeLiquidityValue.getGasCostOfGetLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                105,
                                expandTo18Decimals(5)
                            ))
                        ).to.be.lessThan(50000)
                    })

                    it('gas lower price', async () => {
                        expect(
                            parseInt(await computeLiquidityValue.getGasCostOfGetLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                95,
                                expandTo18Decimals(5)
                            ))
                        ).to.be.lessThan(50000)
                    })

                    describe('after a swap', () => {
                        beforeEach('swap to ~1:25', async () => {
                            await token0.connect(user1).approve(router.address, constants.MaxUint256)
                            await router.connect(user1).swapExactTokensForTokens(
                                expandTo18Decimals(20),
                                0,
                                [token0.address, token1.address],
                                user1.address,
                                constants.MaxUint256
                            )
                            const [reserve0, reserve1] = await pair.getReserves()
                            expect(reserve0).to.eq('40000000000000000000')
                            expect(reserve1).to.eq('1001502253380070105158') // half plus the fee
                        })

                        it('is roughly 1:25', async () => {
                            const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                25,
                                expandTo18Decimals(5)
                            )

                            expect(token0Amount).to.eq('999874953089810756')
                            expect(token1Amount).to.eq('25034425465443434060')
                        })

                        it('shares after arbing back to 1:100', async () => {
                            const [token0Amount, token1Amount] = await computeLiquidityValue.getLiquidityValueAfterArbitrageToPrice(
                                token0.address,
                                token1.address,
                                1,
                                100,
                                expandTo18Decimals(5)
                            )

                            expect(token0Amount).to.eq('501002443792372662')
                            expect(token1Amount).to.eq('50024924521757597314')
                        })
                    })
                })
            })
        });
    });
});

async function setupContracts(createPair = true, deployDTT = false) {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy token0/token1 token and distribute
    const DummyToken = await ethers.getContractFactory("contracts/Uniswap_V2_TWAMM/periphery/test/ERC20PeriTest.sol:ERC20PeriTest");
    let token0 = await DummyToken.deploy(expandTo18Decimals(10000));
    let token1 = await DummyToken.deploy(expandTo18Decimals(10000));
    const weth9 = await (await ethers.getContractFactory("WETH9")).deploy();

    let deflatingERC20;
    if (deployDTT) {
        deflatingERC20 = await (await ethers.getContractFactory(
            "contracts/Uniswap_V2_TWAMM/periphery/test/DeflatingERC20.sol:DeflatingERC20"
        )).deploy(expandTo18Decimals(10000));
        await deflatingERC20.transfer(user1.address, expandTo18Decimals(10000));
    }

    if (token1.address.toUpperCase() < token0.address.toUpperCase()) {
        var temp = token1;
        token1 = token0;
        token0 = temp;
    }
    await token0.transfer(user1.address, expandTo18Decimals(10000));
    await token1.transfer(user1.address, expandTo18Decimals(10000));
    // await token0.transfer(user2.address, expandTo18Decimals(10000));
    // await token1.transfer(user2.address, expandTo18Decimals(10000));
    // await token0.transfer(user3.address, "10000000000000000000");
    // await token1.transfer(user3.address, "10000000000000000000");

    const FraxswapFactory = await ethers.getContractFactory("UniV2TWAMMFactory");
    const factory = await FraxswapFactory.deploy(owner.address);
    await factory.deployed();

    let pair;
    if (createPair) {
        await factory.createPair(token0.address, token1.address);
        const pairAddress = await factory.getPair(token0.address, token1.address);
        pair = new ethers.Contract(pairAddress, UniV2TWAMMPair.abi).connect(owner);
    }

    const FraxswapRouter = await ethers.getContractFactory("UniV2TWAMMRouter");
    const router = await FraxswapRouter.deploy(factory.address, weth9.address);
    await router.deployed();

    return {
        token0,
        token1,
        weth9,
        deflatingERC20,
        factory,
        pair,
        router
    }
}
