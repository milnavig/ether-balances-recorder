import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import Web3 from 'web3';

//let web3 = new Web3("https://cloudflare-eth.com");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.PROVIDER!));

interface Token {
    name: string,
    address: string,
    decimal: number
}

interface TokenBalance {
    token: string,
    balance: number
}

const abiArrayToken = JSON.parse(fs.readFileSync('./src/assets/abi.json', 'utf-8')); // ABI for the ERC20 token standard
const ethTokens: Token[] = JSON.parse(fs.readFileSync('./src/assets/data-tokens.json', 'utf-8')); // parse JSON list with ERC20 tokens from https://etherscan.io/tokens
ethTokens.push(...JSON.parse(fs.readFileSync('./src/assets/additional-tokens.json', 'utf-8'))); // push array list with additional tokens

/**
 * @param { Token[] } tokens - List of all ERC20 tokens
 * @return { Promise<void> } - The list of promises
 */
function getBalance(tokens: Token[]): Promise<void> {
    const promises: Promise<void>[] = [];
    const results: TokenBalance[] = []; // here we push all tokens with their balances

    return new Promise((resolve, reject) => {
        if (!tokens.length) {
            console.log('Empty tokens list');
            reject();
        }

        promises.push(
            web3.eth.getBalance(process.env.ADDRESS?.split('/')[process.env.ADDRESS?.split('/').length - 1]!).then(wei => {
                let balance: string = web3.utils.fromWei(wei, 'ether'); // converts any wei value into a ether value
                results.push({token: 'Ether', balance: +balance});
                console.log(`Balance of Ethereum: ${balance} ETH`);
            })
        ); // retrieve balance of Ethereum
    
        tokens.forEach((token: Token) => {
            const contract = new web3.eth.Contract(abiArrayToken, token.address);
            let data = contract.methods.balanceOf(process.env.ADDRESS?.split('/')[process.env.ADDRESS?.split('/').length - 1]).call();
            promises.push(
                data.then(function(val: string) {

                    let balance = +val / Math.pow(10, token.decimal);
                    results.push({token: token.name, balance});
                    console.log(`Balance of token ${token.name}: ${balance}`);
                    
                }).catch((err: Error) => console.log(err))
            );
        }); // get the balance of each ERC20 token at the address
        
        Promise.all(promises).then(() => {
            results.sort((tokenBalance1: TokenBalance, tokenBalance2: TokenBalance) => tokenBalance2.balance - tokenBalance1.balance); // sort all tokens by their balances
            let result = {timestamp: Date.now(), data: results.filter((tokenBalance: TokenBalance) => tokenBalance.balance)}; // create new object with a timestamp
            fs.writeFileSync('./src/balances.json', JSON.stringify(result, null, 4));
            console.log('Finished. Balances are written to /src/balances.json');
            resolve();
        }); // wait when all promises resolve and write results to file
    });
}

/**
 * @param { Token[] } tokens - List of all ERC20 tokens
 * @param { (a: Token[]) => Promise<void> } getBalance - function which extract balances of tokens at specific wallet address
 * @return { undefined }
 */
function trackBalance(tokens: Token[], getBalance: (a: Token[]) => Promise<void>) {
    getBalance(ethTokens).then(() => {
        setTimeout(() => {
            console.log('Checking for balances');
            trackBalance(tokens, getBalance);
        }, 60000);
    });
}

trackBalance(ethTokens, getBalance);