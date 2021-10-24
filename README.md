# Test task

It is a program that records the balances of all tokens and Ether from the Ethereum blockchain at certain address.

## Description

First of all, I tried to find the list of ERC20 tokens with their contract addresses for this task. Unfortunately, all existing JSON files were out of date so I decided to scrape this data from [https://etherscan.io/tokens](https://etherscan.io/tokens). The scraping program works slowly, because I faced with the problem that [https://etherscan.io/](https://etherscan.io/) website throttle requests. Next, I loop through all token contracts, and call their balanceOf(address) function. The balances are written to src/balances.json and are updating every minute.

## Usage
To run the program:
```bash
npm run balances
```
To run the program which scrapes tokens data from [https://etherscan.io/tokens](https://etherscan.io/tokens):
```bash
npm run scraper
```