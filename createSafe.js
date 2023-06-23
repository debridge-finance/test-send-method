import {config} from "dotenv-flow";
import DeBridgeGateJson from "./precompiles/DeBridgeGate.json" assert { type: 'json' };
import GnosisSafeProxyFactory from "./precompiles/GnosisSafeProxyFactory.json" assert { type: 'json' };
import GnosisSafeL2 from "./precompiles/GnosisSafeL2.json" assert { type: 'json' };
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


const logger = log4js.getLogger('createSafe');
const chainIdFrom = 56;
const chainIdTo = 137;
const rpc = Web3RpcUrl[chainIdFrom];
const web3 = new Web3(rpc);
const debridgeGateInstance = new web3.eth.Contract(DeBridgeGateJson.abi, "0x43dE2d77BF8027e25dBD179B491e8d64f38398aA");
const targetContractAddress =  "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2"; //GnosisSafeProxyFactory


// const gnosisSafeProxyFactoryInstance = new web3.eth.Contract(GnosisSafeProxyFactory.abi, targetContractAddress);

const privKey = process.env.PRIVATE_KEY;
const account = web3.eth.accounts.privateKeyToAccount(privKey);
const senderAddress = account.address;


// function createProxyWithNonce(
//     address _singleton,
//     bytes memory initializer,
//     uint256 saltNonce
// )
logger.info("This example send cross-chain sendMessage from BNB to Polygon to create safe in polygon for user's wallet");
logger.info(`Create safe multisig for ${senderAddress} with threshold = 1`);
logger.info(`ChainId from: ${chainIdFrom}`);
logger.info(`ChainId to: ${chainIdTo}`);
logger.info(`RPC : ${rpc}`);
logger.info(`senderAddress : ${senderAddress}`);

const fixFee = await debridgeGateInstance.methods.globalFixedNativeFee().call();

const singleton = "0x3e5c63644e683549055b9be8653de26e0b4cd36e";

const setupParameters = {
    _owners: [senderAddress],
    _threshold: '1',
    to: '0x0000000000000000000000000000000000000000',
    data: '0x',
    fallbackHandler: '0xf48f2b2d2a534e402487b3ee7c18c33aec0fe5e4',
    paymentToken: '0x0000000000000000000000000000000000000000',
    payment: '0',
    paymentReceiver: '0x0000000000000000000000000000000000000000'
  };

  const setupAbi = GnosisSafeL2.abi.find((abi) => abi.name === 'setup');
  const safeInitializer = web3.eth.abi.encodeFunctionCall(setupAbi, Object.values(setupParameters));


// function createProxyWithNonce(
//     address _singleton,
//     bytes memory initializer,
//     uint256 saltNonce
// )
const createProxyWithNonceParameters= {
    _singleton: singleton,
    initializer: safeInitializer,
    saltNonce:  Date.now()
};
const createProxyWithNonceAbi = GnosisSafeProxyFactory.abi.find((abi) => abi.name === 'createProxyWithNonce');
const targetContractCalldata =  web3.eth.abi.encodeFunctionCall(createProxyWithNonceAbi, Object.values(createProxyWithNonceParameters));

// gnosisSafeProxyFactoryInstance.methods
//         .createProxyWithNonce(
//             tokenAddress, //address _singleton,
//             safeInitializer, // bytes memory initializer,
//             Date.now() //int256 saltNonce
//         )
//         .encodeABI();


sendMessage(
    fixFee,
    senderAddress,
    chainIdTo,// _chainIdTo
    targetContractAddress,
    targetContractCalldata, 
    0, //flags
    0 //referralCode
).catch(e => logger.error(e))


async function sendMessage(
    nativeAmount,
    senderAddress,
    chainIdTo, //uint256 _chainIdTo,
    targetContractAddress, // bytes memory _targetContractAddress,
    targetContractCalldata, //bytes memory _targetContractCalldata,
    flags, // uint256 _flags,
    referralCode, //uint32 _referralCode,
) {
    logger.info("sendMessage");
    const nonce = await web3.eth.getTransactionCount(senderAddress);
    logger.info("Nonce current: ", nonce);
    const gasPrice = await web3.eth.getGasPrice();
    logger.info("gasPrice: ", gasPrice.toString());
    logger.info("nativeAmount: ", nativeAmount.toString());
    logger.info("targetContractAddress: ", targetContractAddress);
    logger.info("targetContractCalldata: ", targetContractCalldata);
    

    // function sendMessage(
    //     uint256 _chainIdTo,
    //     bytes memory _targetContractAddress,
    //     bytes memory _targetContractCalldata,
    //     uint256 _flags,
    //     uint32 _referralCode
    // )
    const estimateGas = await debridgeGateInstance.methods
        .sendMessage(
            chainIdTo, //uint256 _chainIdTo,
            targetContractAddress, // bytes memory targetContractAddress,
            targetContractCalldata, //bytes memory targetContractCalldata,
            flags, //bool flags,
            referralCode //uint32 _referralCode,
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
            gas: estimateGas,
            value: nativeAmount,
            gasPrice: gasPrice,
            nonce,
            data: debridgeGateInstance.methods
                .sendMessage(
                    chainIdTo, //uint256 _chainIdTo,
                    targetContractAddress, // bytes memory targetContractAddress,
                    targetContractCalldata, //bytes memory targetContractCalldata,
                    flags, //bool flags,
                    referralCode //uint32 _referralCode,
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