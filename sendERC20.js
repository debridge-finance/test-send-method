require("dotenv-flow").config();
const { toWei } = require("web3-utils");
const Web3 = require("web3");
const DeBridgeGateAbi = require("./precompiles/DeBridgeGate.json").abi;

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


const log4js = require('log4js');
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
const debridgeGateAddderss = process.env.DEBRIDGEGATE_ADDRESS;
const debridgeGateInstance = new web3.eth.Contract(DeBridgeGateAbi, debridgeGateAddderss);

const privKey = process.env.PRIVATE_KEY;
const senderAddress = process.env.SENDER_ADDRESS;

logger.info(`ChainId from: ${chainIdFrom}`);
logger.info(`ChainId to: ${chainIdTo}`);
logger.info(`Amount: ${amount}`);
logger.info(`RPC : ${rpc}`);

(async () => {
    try {
        //TODO: need to create approve to spend token before send !!!
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
    } catch (e) {
        console.log(e);
    }
})();


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
    let nonce = await web3.eth.getTransactionCount(senderAddress);
    logger.info("Nonce current", nonce);
    gasPrice = await web3.eth.getGasPrice();
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
            value: fixNativeFee
        });

    logger.info("estimateGas", estimateGas.toString());

    let tx =
    {
        from: senderAddress,
        to: debridgeGateAddderss,
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




    logger.info(JSON.stringify(tx));
    const signedTx = await web3.eth.accounts.signTransaction(tx, privKey);
    logger.info(signedTx);
    logger.info(JSON.stringify(signedTx));

    let result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    logger.info(JSON.stringify(result));
}