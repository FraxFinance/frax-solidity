const {constants, BigNumber, utils} = require('ethers');

// https://github.com/ethers-io/ethers.js/blob/master/packages/bignumber/src.ts/bignumber.ts
const BIG6 = BigNumber.from("1000000");
const BIG18 = BigNumber.from("1000000000000000000");

const PERMIT_TYPEHASH = utils.keccak256(
    utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

function getDomainSeparator(name, tokenAddress) {
    return utils.keccak256(
        utils.defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
            [
                utils.keccak256(utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
                utils.keccak256(utils.toUtf8Bytes(name)),
                utils.keccak256(utils.toUtf8Bytes('1')),
                1,
                tokenAddress
            ]
        )
    )
}

async function getApprovalDigest(
    token,
    approve,
    nonce,
    deadline
) {
    const name = await token.name()
    const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
    return utils.keccak256(
        utils.solidityPack(
            ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
            [
                '0x19',
                '0x01',
                DOMAIN_SEPARATOR,
                utils.keccak256(
                    utils.defaultAbiCoder.encode(
                        ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
                        [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
                    )
                )
            ]
        )
    )
}

function getCreate2Address(
    factoryAddress,
    [tokenA, tokenB],
    bytecode
) {
    const [token0, token1] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA]
    const create2Inputs = [
        '0xff',
        factoryAddress,
        utils.keccak256(utils.solidityPack(['address', 'address'], [token0, token1])),
        utils.keccak256(bytecode)
    ]
    const sanitizedInputs = `0x${create2Inputs.map(i => i.slice(2)).join('')}`
    return utils.getAddress(`0x${utils.keccak256(sanitizedInputs).slice(-40)}`)
}

function encodePrice(reserve0, reserve1) {
    return [reserve1.mul(bigNumberify(2).pow(112)).div(reserve0), reserve0.mul(bigNumberify(2).pow(112)).div(reserve1)]
}

function expandTo18Decimals(amount) {
    return utils.parseUnits(`${amount.toLocaleString('fullwide', {useGrouping: false})}`, 18);
}

function bigNumberify(amount) {
    return utils.parseUnits(`${amount.toLocaleString('fullwide', {useGrouping: false})}`, 0);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    BIG6,
    BIG18,
    getApprovalDigest,
    getCreate2Address,
    encodePrice,
    expandTo18Decimals,
    bigNumberify,
    sleep
}