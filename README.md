# test-send-method
This program call send method in debridge contract <br />
It's conigureted to transfer deWETH token from BSC to Kovan network  <br />
To send other tokens change <br />
```
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
```

1. Approve to spend tokens for DEBRIDGEGATE_ADDRESS="0x68D936Cb4723BdD38C488FD50514803f96789d2D"
2. Configure .env (cp .env.example .env)
3. yarn install
4. node .\send.js for start

