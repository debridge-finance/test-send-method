require("dotenv-flow").config();
const { toWei } = require("web3-utils");
const Web3 = require("web3");
const web3 = new Web3(process.env.PROVIDER);
const DeBridgeGateAbi = require("./precompiles/DeBridgeGate.json").abi;

const debridgeGateAddderss = process.env.DEBRIDGEGATE_ADDRESS;
const tokenAddress = process.env.TOKEN_ADDRESS;
const privKey = process.env.PRIVATE_KEY;
const senderAddress = process.env.SENDER_ADDRESS;

const log4js = require('log4js');
const debridgeGateInstance = new web3.eth.Contract(DeBridgeGateAbi, debridgeGateAddderss);

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

const logger = log4js.getLogger('multisig');
logger.info(`PROVIDER: ${process.env.PROVIDER}`);
(async () => {
    try {
        //TODO: need to create approve to spend token before send !!!
        await testSend(
            toWei("0.01"), // fix fee for transfer
            "0x2ce407ed308faddcffbfd9eec241bb698d29aadf",//address _tokenAddress,
            toWei("0.001"), // token _amount
            42,// _chainIdTo kovan
            senderAddress, //_receiver
            "0x", // _permit
            false, //_useAssetFee
            1, //_referralCode
            "0x" //_autoParams
            );
    } catch (e) {
        console.log(e);
    }
})();


async function testSend (
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
    let tx =
    {
        from: senderAddress,
        to: debridgeGateAddderss,
        gas: 300000,
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