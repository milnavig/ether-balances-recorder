"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var fs_1 = __importDefault(require("fs"));
var web3_1 = __importDefault(require("web3"));
/*
import Scraper from './scraper';

const scraper = new Scraper();
scraper.start();
*/
//let web3 = new Web3("https://cloudflare-eth.com");
var web3 = new web3_1.default(new web3_1.default.providers.HttpProvider(process.env.PROVIDER));
var abiArrayToken = JSON.parse(fs_1.default.readFileSync('./src/assets/abi.json', 'utf-8')); // ABI for the ERC20 token standard
var ethTokens = JSON.parse(fs_1.default.readFileSync('./src/assets/data-tokens.json', 'utf-8')); // parse JSON list with ERC20 tokens
/**
 * @param { Token[] } tokens - List of all ERC20 tokens
 * @return { Promise<void> } - The list of promises
 */
function getBalance(tokens) {
    var promises = [];
    var results = []; // here we push all tokens and their balances
    return new Promise(function (resolve, reject) {
        var _a, _b;
        if (!tokens.length) {
            console.log('Empty tokens list');
            reject();
        }
        promises.push(web3.eth.getBalance((_a = process.env.ADDRESS) === null || _a === void 0 ? void 0 : _a.split('/')[((_b = process.env.ADDRESS) === null || _b === void 0 ? void 0 : _b.split('/').length) - 1]).then(function (wei) {
            var balance = web3.utils.fromWei(wei, 'ether'); // converts any wei value into a ether value
            results.push({ token: 'Ether', balance: +balance });
            console.log("Balance of Ethereum: " + balance + " ETH");
        })); // retrieve balance of Ethereum
        tokens.forEach(function (token) {
            var _a, _b;
            var contract = new web3.eth.Contract(abiArrayToken, token.address);
            var data = contract.methods.balanceOf((_a = process.env.ADDRESS) === null || _a === void 0 ? void 0 : _a.split('/')[((_b = process.env.ADDRESS) === null || _b === void 0 ? void 0 : _b.split('/').length) - 1]).call();
            promises.push(data.then(function (val) {
                var balance = +val / Math.pow(10, token.decimal);
                results.push({ token: token.name, balance: balance });
                console.log("Balance of token " + token.name + ": " + balance);
            }).catch(function (err) { return console.log(err); }));
        }); // get the balance of each ERC20 token at the address
        Promise.all(promises).then(function () {
            results.sort(function (tokenBalance1, tokenBalance2) { return tokenBalance2.balance - tokenBalance1.balance; }); // sort all tokens by their balances
            var result = { timestamp: Date.now(), data: results.filter(function (tokenBalance) { return tokenBalance.balance; }) }; // create new object with a timestamp
            fs_1.default.writeFileSync('./src/balances.json', JSON.stringify(result, null, 4));
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
function trackBalance(tokens, getBalance) {
    getBalance(ethTokens).then(function () {
        setTimeout(function () {
            console.log('Checking for balances');
            trackBalance(tokens, getBalance);
        }, 60000);
    });
}
trackBalance(ethTokens, getBalance);
