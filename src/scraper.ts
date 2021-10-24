/* This script scrapes information about ERC20 tokens from https://etherscan.io/tokens */

import fs from 'fs';
import tress from 'tress';
import needle from 'needle';
import {parse} from 'node-html-parser';
import url from 'url';

const SOURCE = 'https://etherscan.io';

interface Page {
    id: string | undefined,
    name: string | undefined,
    href: string | undefined
}

interface Token {
    name: string,
    address: string,
    decimal: number
}

// class for scraping websites
export default class Scraper {
    pages: Page[] = []; // array of tokens pages
    tokens: Token[] = []; // array of extracted tokens
    numberOfPages: number = 0; // total number of pages to scrape
    currentPage: number = 1; // current page
    pagesParser: tress.TressStatic; // a queue object
    tokensParser: tress.TressStatic; // a queue object

    constructor() {
        this.pagesParser = this.parsePages();
        this.tokensParser = this.parseTokens();
    }

    // a function which returns a queue object for scraping token list pages
    parsePages() {
        // create a queue object with worker and concurrency 1
        this.pagesParser = tress((src, callback) => {
            let src_url: string = '';
            for (let key in src) {
                src_url = key;
            }
        
            needle.get(src_url, (err, res) => { // get the page
                if (err) throw err;
        
                // parse DOM
                let $ = parse(res.body);
        
                $.querySelectorAll('tbody tr').forEach(el => {
                    this.pages.push({
                        id: el.querySelector('td:first-child')?.innerHTML, // id of ERC20 token
                        name: el.querySelector('.text-primary')?.innerHTML, // name of ERC20 token
                        href: el.querySelector('.text-primary')?.getAttribute('href') // link to ERC20 token page
                    }); // push the information about token pages to pages array
        
                });
        
                if (!this.numberOfPages) {
                    $.querySelectorAll('.page-item > .page-link').forEach(el => { 
                        if (el.querySelector('span') && el.querySelector('span')?.innerHTML === 'Last') {
                            const queryObject = url.parse(el.getAttribute('href') || '', true).query;
                            this.numberOfPages = Number(queryObject.p) || 0;
                        }
                    }); // get the total number of pages
                }
        
                if (this.numberOfPages >= ++this.currentPage) {
                    let next_page: string = SOURCE + '/tokens?ps=100&p=' + String(this.currentPage); // next page to parse
                    this.pagesParser.push({[next_page]: next_page}); // add item to the queue pagesParser
                }
        
                callback(err);
            });
        }, 1);

        // a callback that is called when the last item from the queue has been returned from the worker
        this.pagesParser.drain = () => {
            fs.writeFileSync('./src/assets/data-pages.json', JSON.stringify(this.pages, null, 4));
            this.sendRequestWithInterval(this.pages);
        }

        return this.pagesParser;
    }

    // a function which returns a queue object for scraping token pages
    parseTokens() {
        this.tokensParser = tress((src, callback) => {
            let src_url: string = '';
            for (let key in src) {
                src_url = key;
            }
        
            needle.get(src_url, (err, res) => { // get the page
                if (err) throw err;
        
                // parse DOM
                let $ = parse(res.body);
        
                let name = $.querySelector('span.text-secondary')?.innerHTML || ''; // the name of token
                let address = src_url.split('/')[src_url.split('/').length - 1] || ''; // the address of token
                let decimal = $.querySelector('#ContentPlaceHolder1_trDecimals .col-md-8')?.innerHTML || '0'; // the decimal of token
        
                this.tokens.push({name, address, decimal: parseInt(decimal)}); // push token to array of tokens
        
                callback(err);
            });
        }, 1);
        
        // a callback that is called when the last item from the queue has been returned from the worker
        this.tokensParser.drain = () => {
            fs.writeFileSync('./src/assets/data-tokens.json', JSON.stringify(this.tokens, null, 4));
        }

        return this.tokensParser;
    }

    sendRequestWithInterval(arr: Page[]) {
        if (!arr.length) {
            console.log('Ready! Please, check file data-tokens.json');
            return;
        }
        console.log(`${arr.length} tokens left`);
        let next_url: string = SOURCE + arr[arr.length - 1].href;
        this.tokensParser.push({[next_url]: next_url}); // add item to the queue tokensParser
        arr.pop();
        setTimeout(() => this.sendRequestWithInterval(arr), 1500);
    }

    start() {
        // add item to the queue pagesParser
        this.pagesParser.push({[SOURCE + '/tokens?ps=100&p=1']: SOURCE + '/tokens?ps=100&p=1'});
    }
}

const scraper = new Scraper(); // create an object of Scraper
scraper.start(); // adds the first page to scrape to the queue