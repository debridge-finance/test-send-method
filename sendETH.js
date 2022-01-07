import {config} from "dotenv-flow";
import DeBridgeGateJson from "./precompiles/DeBridgeGate.json";
import log4js from "log4js";
import web3Utils from "web3-utils";
import Web3 from "web3";
const {toWei} = web3Utils;

config();

const Web3RpcUrl = {
    1: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // //ETH Mainnet
    42: 'https://kovan.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // //Kovan
    56: 'https://bsc-dataseed.binance.org/', // //BSC
    97: 'https://data-seed-prebsc-1-s1.binance.org:8545/', // //BSC Testnet
    128: 'https://http-mainnet.hecochain.com', // //Heco
    256: 'https://http-testnet.hecochain.com', // //Heco Testnet
    137: 'https://matic-mainnet.chainstacklabs.com', // //polygon
    80001: 'https://rpc-mumbai.maticvigil.com', // //polygon Testnet
    42161: 'https://arb1.arbitrum.io/rpc', // //arbitrum
    421611: 'https://rinkeby.arbitrum.io/rpc', // //arbitrum Testnet
};

log4js.configure(
    {
        appenders: {
            out: {
                type: 'stdout'
            }
        },
        categories: {
            default: {appenders: ['out'], level: 'debug'}
        }
    }
);

const logger = log4js.getLogger('sendETH');
const chainIdFrom = process.env.CHAIN_ID_FROM;
const chainIdTo = process.env.CHAIN_ID_TO;
const amount = process.env.AMOUNT;
const rpc = Web3RpcUrl[chainIdFrom];
const web3 = new Web3(rpc);
const debridgeGateAddress = process.env.DEBRIDGEGATE_ADDRESS;
const debridgeGateInstance = new web3.eth.Contract(DeBridgeGateJson.abi, debridgeGateAddress);

const privKey = process.env.PRIVATE_KEY;
const account = web3.eth.accounts.privateKeyToAccount(privKey);
const senderAddress = account.address;

logger.info(`ChainId from: ${chainIdFrom}`);
logger.info(`ChainId to: ${chainIdTo}`);
logger.info(`Amount: ${amount}`);
logger.info(`RPC : ${rpc}`);
logger.info(`senderAddress : ${senderAddress}`);

send(
    toWei(amount), // native amount for transfer
    "0x0000000000000000000000000000000000000000",//address _tokenAddress,
    toWei(amount), // token _amount
    chainIdTo,// _chainIdTo
    senderAddress, //_receiver
    "0x", // _permit
    false, //_useAssetFee
    0, //_referralCode
    "0x" //_autoParams
).catch(e => console.error(e))


async function send(
    nativeAmount, // native amount for transfer
    tokenAddress, //address _tokenAddress,
    amount, // uint256 _amount,
    chainIdTo, //uint256 _chainIdTo,
    receiver, // bytes memory _receiver,
    permit, //bytes memory _permit,
    useAssetFee, //bool _useAssetFee,
    referralCode, //uint32 _referralCode,
    autoParams// bytes calldata _autoParams
) {
    logger.info("Test send");
    const nonce = await web3.eth.getTransactionCount(senderAddress);
    logger.info("Nonce current", nonce);
    const gasPrice = await web3.eth.getGasPrice();
    logger.info("gasPrice", gasPrice.toString());
    logger.info({
        tokenAddress, //address _tokenAddress,
        amount, // uint256 _amount,
        chainIdTo, //uint256 _chainIdTo,
        receiver, // bytes memory _receiver,
        permit, //bytes memory _permit,
        useAssetFee, //bool _useAssetFee,
        referralCode, //uint32 _referralCode,
        autoParams// bytes calldata _autoParams
    });

    const estimateGas = await debridgeGateInstance.methods
        .send(
            tokenAddress, //address _tokenAddress,
            amount, // uint256 _amount,
            chainIdTo, //uint256 _chainIdTo,
            receiver, // bytes memory _receiver,
            permit, //bytes memory _permit,
            useAssetFee, //bool _useAssetFee,
            referralCode, //uint32 _referralCode,
            autoParams// bytes calldata _autoParams
        )
        .estimateGas({
            from: senderAddress,
            value: nativeAmount
        });

    logger.info("estimateGas", estimateGas.toString());

    const tx =
        {
            from: senderAddress,
            to: debridgeGateAddress,
            gas: 300000,
            value: nativeAmount,
            gasPrice: gasPrice,
            nonce,
            data: debridgeGateInstance.methods
                .send(
                    tokenAddress, //address _tokenAddress,
                    amount, // uint256 _amount,
                    chainIdTo, //uint256 _chainIdTo,
                    receiver, // bytes memory _receiver,
                    permit, //bytes memory _permit,
                    useAssetFee, //bool _useAssetFee,
                    referralCode, //uint32 _referralCode,
                    autoParams// bytes calldata _autoParams
                )
                .encodeABI(),
        };

    logger.info("Tx", tx);
    const signedTx = await web3.eth.accounts.signTransaction(tx, privKey);
    logger.info("Signed tx", signedTx);

    const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    logger.info("Result", result);
    const logs = result.logs.find(l => l.address === debridgeGateAddress);
    const submissionId = logs.data.substring(0, 66);
    logger.info(`SUBMISSION ID ${submissionId}`);
    logger.info("Success");
}