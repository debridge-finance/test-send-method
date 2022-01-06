import {Contract, ethers} from "ethers";
import {abi as DeBridgeGateAbi} from "./precompiles/DeBridgeGate.json";
import {DeBridgeGate} from "./typechain-types/DeBridgeGate";
import {config} from 'dotenv-flow';
import * as log4js from 'log4js';
import {Web3RpcUrls} from "./providers";

config();
log4js.configure({
    // TODO use same config for both send and claim
    appenders: {out: {type: 'stdout'}},
    categories: {default: {appenders: ['out'], level: 'debug'}}
})

const {DEBRIDGEGATE_ADDRESS, PRIVATE_KEY, SENDER_ADDRESS, PROVIDER_ID} = process.env as {
    DEBRIDGEGATE_ADDRESS: string,
    PRIVATE_KEY: string,
    SENDER_ADDRESS: string,
    // TODO use value from console
    PROVIDER_ID: string,
};
// TODO why multisig?
const logger = log4js.getLogger('multisig');
const isProviderKnown = Object.keys(Web3RpcUrls).includes(PROVIDER_ID);
if (!isProviderKnown) {
    logger.error(`Provider with id ${PROVIDER_ID} not found.`);
    process.exit(1);
}
const providerUrl = Web3RpcUrls[PROVIDER_ID];
logger.info(`PROVIDER: ${providerUrl}`);

const provider = ethers.providers.getDefaultProvider(providerUrl);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);
const deBridgeGate = new Contract(DEBRIDGEGATE_ADDRESS, DeBridgeGateAbi, signer) as DeBridgeGate;

const testClaim = async (...args: Parameters<DeBridgeGate["claim"]>): Promise<void> => {
    const [_debridgeId, _amount, _chainIdFrom, _receiver, _nonce, _signatures, _autoParams] = args;
    logger.info("Test claim");

    const nonce = await provider.getTransactionCount(SENDER_ADDRESS);
    logger.info("Nonce current", nonce);

    const gasPrice = await provider.getGasPrice();
    logger.info("gasPrice", gasPrice.toString());

    logger.info({
        _debridgeId, _amount, _chainIdFrom, _receiver, _nonce, _signatures, _autoParams
    });

    const tx = await deBridgeGate.claim(...args);
    // TODO is it safe? no private info? is readable? not too much info?
    logger.info(JSON.stringify(tx));

    const receipt = await tx.wait();
    logger.info(receipt);
}

// testClaim().catch(e => console.error(e))