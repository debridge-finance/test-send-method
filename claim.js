import {config} from "dotenv-flow";
import Web3 from "web3";
import DeBridgeGateJson from "./precompiles/DeBridgeGate.json";
import log4js from "log4js";
import {getSubmission, getSubmissionConfirmations} from "./apiService.js";

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

const logger = log4js.getLogger('claim');

const privKey = process.env.PRIVATE_KEY;
const account = new Web3().eth.accounts.privateKeyToAccount(privKey);
const senderAddress =  account.address;
logger.info(`senderAddress : ${senderAddress}`);

const {DEBRIDGEGATE_ADDRESS, API_ENDPOINT} = process.env;
if (process.argv.length !== 3) {
    logger.error('Add submission id args');
}
const SUBMISSION_ID = process.argv[2];
logger.info(`SUBMISSION_ID : ${SUBMISSION_ID}`);

(async () => {
    try {
        //get submission
        const submission = await getSubmission(SUBMISSION_ID, API_ENDPOINT);
        if (!submission) {
            logger.error(`Submission not found`);
            return;
        }
        //get validator's confirmations
        const confirmationsResponse = await _checkConfirmation(SUBMISSION_ID, process.env.MIN_CONFIRMATIONS);
        if (!confirmationsResponse.isConfirmed) {
            logger.error(`Submission is not confirmed`);
            return;
        }
        // check that submission is not used
        const chainIdTo = submission.chainToId;
        const rpc = Web3RpcUrl[chainIdTo];
        const web3 = new Web3(rpc);

        const debridgeGateInstance = new web3.eth.Contract(DeBridgeGateJson.abi, DEBRIDGEGATE_ADDRESS);
        const isSubmissionUsed = await debridgeGateInstance.methods.isSubmissionUsed(SUBMISSION_ID).call();

        if (isSubmissionUsed) {
            logger.error(`Submission already used`);
            return;
        }

        let mergedSignatures = '0x';
        for (const confiramtion of confirmationsResponse.confirmations) {
            mergedSignatures += confiramtion.signature.substring(2, confiramtion.signature.length);
        }

        const autoParamsFrom = await _packSubmissionAutoParamsFrom(web3, submission.nativeSender, submission.rawAutoparams);

        await claim(
            web3,
            debridgeGateInstance,
            submission.debridgeId,
            submission.amount,
            submission.eventOriginChainId,
            submission.receiver,
            submission.nonce,
            mergedSignatures,
            autoParamsFrom,
        );
    } catch (e) {
        console.log(e);
    }
})();


async function claim(
    web3,
    debridgeGateInstance,
    debridgeId, //bytes32 _debridgeId,
    amount, // uint256 _amount,
    chainIdFrom, //uint256 _chainIdFrom,
    receiver, // address _receiver,
    subNonce, // uint256 _nonce
    signatures, //bytes calldata _signatures,
    autoParams, //bytes calldata _autoParams
) {
    logger.info("Test claim");
    let nonce = await web3.eth.getTransactionCount(senderAddress);
    logger.info("Nonce current", nonce);
    const gasPrice = await web3.eth.getGasPrice();
    logger.info("gasPrice", gasPrice.toString());
    logger.info({
        debridgeId, //bytes32 _debridgeId,
        amount, // uint256 _amount,
        chainIdFrom, //uint256 _chainIdFrom,
        receiver, // address _receiver,
        nonce, // uint256 _nonce
        signatures, //bytes calldata _signatures,
        autoParams, //bytes calldata _autoParams
    });


    const estimateGas = await debridgeGateInstance.methods
    .claim(
        debridgeId, //bytes32 _debridgeId,
        amount, // uint256 _amount,
        chainIdFrom, //uint256 _chainIdFrom,
        receiver, // address _receiver,
        subNonce, // uint256 _nonce
        signatures, //bytes calldata _signatures,
        autoParams, //bytes calldata _autoParams
    )
    .estimateGas({
        from: senderAddress
    });

    logger.info("estimateGas", estimateGas.toString());

    const tx =
    {
        from: senderAddress,
        to: DEBRIDGEGATE_ADDRESS,
        gas: estimateGas,
        value: 0,
        gasPrice: gasPrice,
        nonce,
        data: debridgeGateInstance.methods
            // function claim(
            //     bytes32 _debridgeId,
            //     uint256 _amount,
            //     uint256 _chainIdFrom,
            //     address _receiver,
            //     uint256 _nonce,
            //     bytes calldata _signatures,
            //     bytes calldata _autoParams
            // )
            .claim(
                debridgeId, //bytes32 _debridgeId,
                amount, // uint256 _amount,
                chainIdFrom, //uint256 _chainIdFrom,
                receiver, // address _receiver,
                subNonce, // uint256 _nonce
                signatures, //bytes calldata _signatures,
                autoParams, //bytes calldata _autoParams
            )
            .encodeABI(),
    };

    logger.info("Tx", tx);
    const signedTx = await web3.eth.accounts.signTransaction(tx, privKey);
    logger.info("Signed tx", signedTx);

    const result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    logger.info("Result", result);
    logger.info("Success");
}


async function _checkConfirmation(submissionId, minConfirmations) {
    const confirmations = await getSubmissionConfirmations(submissionId, API_ENDPOINT);
    return {
        isConfirmed: (confirmations.length >= minConfirmations),
        confirmations,
    }
}


async function _packSubmissionAutoParamsFrom(web3, nativeSender, autoParams) {
    if (autoParams !== '0x' && autoParams !== '') {
        const decoded = web3.eth.abi.decodeParameters(
            ['tuple(uint256,uint256, bytes, bytes)'], autoParams
        );
        logger.info(`autoParams: ${autoParams}, decoded: ${decoded}`);
        const encoded = web3.eth.abi.encodeParameter(
            'tuple(uint256,uint256, address, bytes, bytes)',
            [decoded[0][0], decoded[0][1], decoded[0][2], decoded[0][3], nativeSender]
        );
        logger.info(`encoded: ${encoded}`);
        return encoded;
    }
    return '0x';
}
