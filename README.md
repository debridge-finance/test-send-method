# deBridge sendETH/sendERC20/Claim method demo
This repository demonstrates how to call send/claim methods of deBridge smart contract <br />
1. ```yarn install``` <br />
2. Configure .env file use .env.testnet / .env.mainnet as example<br />
Required to set
```
PRIVATE_KEY=""
SENDER_ADDRESS=""
```
3. ```node .\sendETH.js``` to send ETH <br />
Approve spending limit for deBridgeGate smart contract before transfer ERC20:<br />
then you can run 
```node .\sendERC20.js``` to send ETH <br />
Find your submission in our explorers
https://testnet-explorer.debridge.finance/
https://mainnet-explorer.debridge.finance/
4. Claim ```node .\claim.js submissionId``` set submissionId as command args
