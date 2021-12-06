"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDomainSeparator = exports.getPermitDigest = exports.PERMIT_TYPEHASH = exports.sign = void 0;
const utils_1 = require("ethers/lib/utils");
const ethereumjs_util_1 = require("ethereumjs-util");
const sign = (digest, privateKey) => {
    return ethereumjs_util_1.ecsign(Buffer.from(digest.slice(2), 'hex'), privateKey);
};
exports.sign = sign;
exports.PERMIT_TYPEHASH = utils_1.keccak256(utils_1.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'));
function getPermitDigest(name, address, chainId, approve, nonce, deadline) {
    const DOMAIN_SEPARATOR = getDomainSeparator(name, address, chainId);
    return utils_1.keccak256(utils_1.solidityPack(['bytes1', 'bytes1', 'bytes32', 'bytes32'], [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        utils_1.keccak256(utils_1.defaultAbiCoder.encode(['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'], [exports.PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline])),
    ]));
}
exports.getPermitDigest = getPermitDigest;
function getDomainSeparator(name, contractAddress, chainId) {
    return utils_1.keccak256(utils_1.defaultAbiCoder.encode(['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'], [
        utils_1.keccak256(utils_1.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        utils_1.keccak256(utils_1.toUtf8Bytes(name)),
        utils_1.keccak256(utils_1.toUtf8Bytes('1')),
        chainId,
        contractAddress,
    ]));
}
exports.getDomainSeparator = getDomainSeparator;
//# sourceMappingURL=signatures.js.map