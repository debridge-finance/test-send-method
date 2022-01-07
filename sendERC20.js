import {config} from "dotenv-flow";
import Web3 from "web3";
import DeBridgeGateJson from "./precompiles/DeBridgeGate.json";
import IERC20Json from "@openzeppelin/contracts/build/contracts/IERC20.json"
import log4js from "log4js";
import web3Utils from "web3-utils";
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
            default: { appenders: ['out'], level: 'debug' }
        }
    }
);

const logger = log4js.getLogger('sendERC20');


const tokenAddress = process.env.TOKEN_ADDRESS;
const chainIdFrom = process.env.CHAIN_ID_FROM;
const chainIdTo = process.env.CHAIN_ID_TO;
const amount = process.env.AMOUNT;
const rpc = Web3RpcUrl[chainIdFrom];
const web3 = new Web3(rpc);
const debridgeGateAddress = process.env.DEBRIDGEGATE_ADDRESS;
const debridgeGateInstance = new web3.eth.Contract(DeBridgeGateJson.abi, debridgeGateAddress);
const tokenInstance = new web3.eth.Contract(IERC20Json.abi, tokenAddress);

const privKey = process.env.PRIVATE_KEY;
const account = web3.eth.accounts.privateKeyToAccount(privKey);
const senderAddress =  account.address;

logger.info(`ChainId from: ${chainIdFrom}`);
logger.info(`ChainId to: ${chainIdTo}`);
logger.info(`Amount: ${amount}`);
logger.info(`RPC : ${rpc}`);
logger.info(`senderAddress : ${senderAddress}`);

const main = async () => {
    await approve();
    await send(
        toWei("0.01"), // fix fee for transfer
        tokenAddress,//address _tokenAddress,
        toWei(amount), // token _amount
        chainIdTo,// _chainIdTo
        senderAddress, //_receiver
        "0x", // _permit
        false, //_useAssetFee
        0, //_referralCode
        "0x" //_autoParams
    );
}

main().catch(e => console.error(e));

async function approve() {
    logger.info(`Approving token ${tokenAddress}, amount: ${amount}`);
    const nonce = await web3.eth.getTransactionCount(senderAddress);
    logger.info("Approve nonce current", nonce);
    const gasPrice = await web3.eth.getGasPrice();
    logger.info("Approve gasPrice", gasPrice.toString());

    const estimateGas = await tokenInstance.methods
        .approve(debridgeGateAddress, toWei(amount))
        .estimateGas({from: senderAddress})
    ;

    logger.info("Approve estimateGas", estimateGas.toString());

    const tx = {
            from: senderAddress,
            to: tokenAddress,
            gas: estimateGas,
            value: 0,
            gasPrice,
            nonce,
            data: tokenInstance.methods.approve(debridgeGateAddress, toWei(amount)).encodeABI(),
        };

    logger.info("Approve tx", tx);
    const signedTx = await web3.eth.accounts.signTransaction(tx, privKey);
    logger.info("Approve signed tx", signedTx);

    let result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    logger.info("Approve result", result);
}

async function send(
    fixNativeFee, // fix fee for transfer
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
    logger.info("Send nonce current", nonce);
    const gasPrice = await web3.eth.getGasPrice();
    logger.info("Send gasPrice", gasPrice.toString());
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
            value: fixNativeFee
        });

    logger.info("Send estimateGas", estimateGas.toString());

    const tx =
    {
        from: senderAddress,
        to: debridgeGateAddress,
        gas: estimateGas,
        value: fixNativeFee,
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

    logger.info("Send tx", tx);
    const signedTx = await web3.eth.accounts.signTransaction(tx, privKey);
    logger.info("Send signed tx", signedTx);

    let result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    logger.info("Send result", result);

    const logs = result.logs.find(l=>l.address===debridgeGateAddress);
    const submissionId = logs.data.substring(0, 66);
    logger.info(`SUBMISSION ID ${submissionId}`);
    logger.info("Success");
}