"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var tress_1 = __importDefault(require("tress"));
var needle_1 = __importDefault(require("needle"));
var node_html_parser_1 = require("node-html-parser");
var url_1 = __importDefault(require("url"));
var SOURCE = 'https://etherscan.io';
// class for scraping websites
var Scraper = /** @class */ (function () {
    function Scraper() {
        this.pages = []; // array of tokens pages
        this.tokens = []; // array of extracted tokens
        this.numberOfPages = 0; // total number of pages to scrape
        this.currentPage = 1; // current page
        this.pagesParser = this.parsePages();
        this.tokensParser = this.parseTokens();
    }
    // a function which returns a queue object for scraping token list pages
    Scraper.prototype.parsePages = function () {
        var _this = this;
        // create a queue object with worker and concurrency 1
        this.pagesParser = (0, tress_1.default)(function (src, callback) {
            var src_url = '';
            for (var key in src) {
                src_url = key;
            }
            needle_1.default.get(src_url, function (err, res) {
                var _a;
                if (err)
                    throw err;
                // parse DOM
                var $ = (0, node_html_parser_1.parse)(res.body);
                $.querySelectorAll('tbody tr').forEach(function (el) {
                    var _a, _b, _c;
                    _this.pages.push({
                        id: (_a = el.querySelector('td:first-child')) === null || _a === void 0 ? void 0 : _a.innerHTML,
                        name: (_b = el.querySelector('.text-primary')) === null || _b === void 0 ? void 0 : _b.innerHTML,
                        href: (_c = el.querySelector('.text-primary')) === null || _c === void 0 ? void 0 : _c.getAttribute('href') // link to ERC20 token page
                    }); // push the information about token pages to pages array
                });
                if (!_this.numberOfPages) {
                    $.querySelectorAll('.page-item > .page-link').forEach(function (el) {
                        var _a;
                        if (el.querySelector('span') && ((_a = el.querySelector('span')) === null || _a === void 0 ? void 0 : _a.innerHTML) === 'Last') {
                            var queryObject = url_1.default.parse(el.getAttribute('href') || '', true).query;
                            _this.numberOfPages = Number(queryObject.p) || 0;
                        }
                    }); // get the total number of pages
                }
                if (_this.numberOfPages >= ++_this.currentPage) {
                    var next_page = SOURCE + '/tokens?ps=100&p=' + String(_this.currentPage); // next page to parse
                    _this.pagesParser.push((_a = {}, _a[next_page] = next_page, _a)); // add item to the queue pagesParser
                }
                callback(err);
            });
        }, 1);
        // a callback that is called when the last item from the queue has been returned from the worker
        this.pagesParser.drain = function () {
            fs_1.default.writeFileSync('./src/assets/data-pages.json', JSON.stringify(_this.pages, null, 4));
            _this.sendRequestWithInterval(_this.pages);
        };
        return this.pagesParser;
    };
    // a function which returns a queue object for scraping token pages
    Scraper.prototype.parseTokens = function () {
        var _this = this;
        this.tokensParser = (0, tress_1.default)(function (src, callback) {
            var src_url = '';
            for (var key in src) {
                src_url = key;
            }
            needle_1.default.get(src_url, function (err, res) {
                var _a, _b;
                if (err)
                    throw err;
                // parse DOM
                var $ = (0, node_html_parser_1.parse)(res.body);
                var name = ((_a = $.querySelector('span.text-secondary')) === null || _a === void 0 ? void 0 : _a.innerHTML) || ''; // the name of token
                var address = src_url.split('/')[src_url.split('/').length - 1] || ''; // the address of token
                var decimal = ((_b = $.querySelector('#ContentPlaceHolder1_trDecimals .col-md-8')) === null || _b === void 0 ? void 0 : _b.innerHTML) || '0'; // the decimal of token
                _this.tokens.push({ name: name, address: address, decimal: parseInt(decimal) }); // push token to array of tokens
                callback(err);
            });
        }, 1);
        // a callback that is called when the last item from the queue has been returned from the worker
        this.tokensParser.drain = function () {
            fs_1.default.writeFileSync('./src/assets/data-tokens.json', JSON.stringify(_this.tokens, null, 4));
        };
        return this.tokensParser;
    };
    Scraper.prototype.sendRequestWithInterval = function (arr) {
        var _a;
        var _this = this;
        if (!arr.length) {
            console.log('Ready! Please, check file data-tokens.json');
            return;
        }
        console.log(arr.length + " tokens left");
        var next_url = SOURCE + arr[arr.length - 1].href;
        this.tokensParser.push((_a = {}, _a[next_url] = next_url, _a)); // add item to the queue tokensParser
        arr.pop();
        setTimeout(function () { return _this.sendRequestWithInterval(arr); }, 1500);
    };
    Scraper.prototype.start = function () {
        var _a;
        // add item to the queue pagesParser
        this.pagesParser.push((_a = {}, _a[SOURCE + '/tokens?ps=100&p=1'] = SOURCE + '/tokens?ps=100&p=1', _a));
    };
    return Scraper;
}());
exports.default = Scraper;
var scraper = new Scraper(); // create an object of Scraper
scraper.start(); // adds the first page to scrape to the queue
