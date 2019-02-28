"use strict";

let TEST_DATE_STRING;// = "2019-2-14 3:00:00";
let STOCK_DATE_TIMESTAMP;

(function(){
    let now;
    if ("string" !== typeof TEST_DATE_STRING){
        now = new Date();
        if (now.getHours() < 10){
            // Too early to show quotes from today.  Show yesterday
            now = now.getTime();
            now -= 24*60*60*1000; 
        }
    }
    else {
        now = new Date(TEST_DATE_STRING);
    }

    STOCK_DATE_TIMESTAMP = now;
    console.log("Using stocks from time: "+new Date(STOCK_DATE_TIMESTAMP));
})();

let StockVO = require("./stock_vo");
let StatusVO = require("./status_vo");
let alphavantage = require("./alphavantage");
let datastore = require("./datastore");


//console.debug = function(){};

// Controls how frequently we run
const REQUEST_INTERVAL = 30*1000;
// How many stocks to refresh each time we're run
const BATCH_SIZE = 5;
// How many seconds to wait between requests in a batch
const BATCH_INTERVAL = 30*1000;

const STOCK_UPDATE_INTERVAL = 60*10*1000;

const QUOTE_TIME_WINDOW = 5*60*1000;


if (!console.debug) console.debug = console.log;

let now = Date.now();
let status = getStatus();
if (null === status){
    initialize();
}
else {
    let doPoll = false;
    let nextStock = status.lastUpdate.index;
    if (Number.isNaN(nextStock)){
        // haven't read any yet

        nextStock = 0;
        doPoll = true;
    }
    else {
        if (now > status.lastUpdate.time+REQUEST_INTERVAL){
            ++nextStock;
            if (nextStock >= status.stocks.length){
                nextStock = 0;
            }

            doPoll = true;

        }
    }
    if (!doPoll){
        console.log("Not getting stock info.");
    }
    else {
        
        let batchTimer = BATCH_INTERVAL + (0|(5000*Math.random()));
        console.log("Time to get some stock info.  Starting in: " + batchTimer);

        setTimeout(function(){
            updateStockBatch(status, nextStock);
        }, batchTimer);        
    }
}


function updateStockBatch(status, index, count){
    let ticker = status.stocks[index];
    count = count || 0;
    let skip = false;
    try {
        let stockVO = datastore.readStock(ticker);
        if (Date.now() < (stockVO.lastUpdate + STOCK_UPDATE_INTERVAL)){
            skip = true;
        }
    }
    catch(err){
        console.error(err.message);
    }

    if (!skip){
        getStockData(ticker, handleUpdate); 
    }
    else {
        console.log("Not updating stock prices for "+ticker);
        handleUpdate();
    }
        
    function handleUpdate(resp){
        if (!skip && !!resp){
            processStockData(ticker, resp);
        }

        if (!!resp || skip){
            status.lastUpdate.time = Date.now();
            status.lastUpdate.index = index;
            datastore.writeStatus(status);

            ++count;
            if (count >= BATCH_SIZE){
                console.log("Done updating this batch of stocks");
            }
            else {
                ++index;
                if (index === status.stocks.length){
                    index = 0;
                }

                let batchTimer = BATCH_INTERVAL + (1000*(5*Math.random()|0));
                console.log("Time to next update: "+batchTimer);
                setTimeout(function(){
                    updateStockBatch(status, index, count);
                }, batchTimer);
            }
        }
    }

}


function getStatus(){
    var ret = null;

    try {
        ret = datastore.readStatus();
    }
    catch(err){ 
    }

    return ret;
}

function getStockData(ticker, cb){
    console.log("Fetching stock info: "+ticker);

    try {
        alphavantage.getStockDailyQuote(ticker, onDoneDaily)
    }
    catch(err){
        console.log("Problem getting stock closing price: "+err.message);
        onDone(null);
    }

    function onDoneDaily(dailyResp){
        try {
            alphavantage.getStockQuote(ticker, function(resp){
                onDone(dailyResp, resp);
            });
        }
        catch(err){
            console.log("Problem getting stock quote: "+err.message);
            onDone(null);
        }
    }

    function onDone(dailyResp, intraResp){
        let resp;
        if ( (null === dailyResp) || (null === intraResp) ){
            resp = null;
        }
        else {
            resp = {
                daily: dailyResp,
                intraday: intraResp            
            };  
        }

        cb(resp);
    }
}

function processStockData(ticker, svrresp){
    //console.log("SERVER RESP" +JSON.stringify(svrresp, null, 4));

    let closeData = filterAndMapServerDailyResponse(svrresp.daily);

    let data = filterAndMapServerResponse(svrresp.intraday);
    let prices = [];

    if (!data || !Array.isArray(data)) throw new Error("No Price data");

    console.log("ticker: "+ticker+" has "+data.length+" quotes");


    for (let quoteIndex = 0; quoteIndex !== data.length; ++quoteIndex){
        let quoteTime = data[quoteIndex].timestamp;
        let quoteOpenPrice = data[quoteIndex].quote.open;
        let quoteClosePrice = data[quoteIndex].quote.close;
        let quoteVolume = data[quoteIndex].quote.volume;
        quoteOpenPrice = Number.parseFloat(quoteOpenPrice);
        quoteClosePrice = Number.parseFloat(quoteClosePrice);
        quoteVolume = Number.parseFloat(quoteVolume);
        let price = StockVO.PriceSample(quoteTime, quoteOpenPrice, quoteClosePrice, quoteVolume);
        prices.push(price);
    }

    console.debug("Prices: "+JSON.stringify(prices));

    let stockData = datastore.readStock(ticker);
    stockData.prices = prices;
    stockData.lastUpdate = Date.now();
    stockData.prevClose = Number.parseFloat(closeData.quote.close);
    stockData.rawData = svrresp;
    datastore.writeStock(stockData);
}

function filterAndMapServerDailyResponse(data){
    console.log(JSON.stringify(data, null, 3));

    let respKeys = Object.keys(data);

    let series = respKeys
        .filter(function(item){
            return (0 === item.indexOf("Time Series"));
        })
        .reduce(function(acc, item){
            return data[item];
        }, null);
//    console.log(series);

    let now = new Date(STOCK_DATE_TIMESTAMP);
    now.setHours(15, 0, 0, 0);
    now = now.getTime();
    respKeys = Object.keys(series);
    let daily = respKeys
        .map(key=>{
            let dateInfo = key.split("-");
            let date = new Date(key);
            date.setHours(15, 0, 0, 0);
            date.setFullYear(dateInfo[0], dateInfo[1]-1, dateInfo[2])

            let quote = {};
            Object.keys(series[key]).forEach((qItem)=>{
                if (-1 !== qItem.indexOf("open")){
                    quote.open = series[key][qItem];
                }
                else if (-1 !== qItem.indexOf("close")){
                    quote.close = series[key][qItem];
                } 
                else if (-1 !== qItem.indexOf("high")){
                    quote.high = series[key][qItem];
                } 
                else if (-1 !== qItem.indexOf("low")){
                    quote.low = series[key][qItem];
                } 
                else if (-1 !== qItem.indexOf("volume")){
                    quote.volume = series[key][qItem];
                } 
            })

            return {
                dateString: key, 
                timestamp: date.getTime(),
                quote: quote
            };
        })
        .sort((a,b)=>{
            return (a.timestamp<b.timestamp)?1:-1;
        })
        .reduce((acc, item, idx)=>{
            //console.log(JSON.stringify(item, null, 3));
            if (null !== acc) return acc;
            if (item.timestamp >= now) return null;
            console.log("returning item "+idx+" as yesterday");
            return item; 
        }, null);

    //console.log(""+JSON.stringify(daily));

    return daily;
}


function filterAndMapServerResponse(data){
    
    let respKeys = Object.keys(data);
    //console.log(respKeys);


    // limit object to stock price info (no meta)
    let series = respKeys
        .filter(function(item){
            if (0 === item.indexOf("Time Series")){
                return true;
            }
            // Filter results in an array with one item.
        })
        .reduce(function(acc, item){
            return data[item];
        }, {});

    //console.debug(series);

    let now = new Date(STOCK_DATE_TIMESTAMP);
    let cutoff = now;
    cutoff.setHours(8,0,0,0);
    let cutoffBeginTimestamp = cutoff.getTime();
    cutoff.setHours(23, 0, 0, 0);
    let cutoffEndTimestamp = cutoff.getTime();

    // Filter stock data to be only today's info
    let filteredSeries = Object.keys(series)
        .map( item => {
            let t = new Date(item);

            let quote = {};
            Object.keys(series[item]).forEach((qItem)=>{
                if (-1 !== qItem.indexOf("open")){
                    quote.open = series[item][qItem];
                }
                else if (-1 !== qItem.indexOf("close")){
                    quote.close = series[item][qItem];
                } 
                else if (-1 !== qItem.indexOf("high")){
                    quote.high = series[item][qItem];
                } 
                else if (-1 !== qItem.indexOf("low")){
                    quote.low = series[item][qItem];
                } 
                else if (-1 !== qItem.indexOf("volume")){
                    quote.volume = series[item][qItem];
                } 
            })

            return {
                timestamp: t.getTime(),
                timeInfo: t.toDateString()+" "+t.toTimeString(),
                quote: quote
            }
        })
        .sort( (a,b) => ((a.timestamp < b.timestamp)?-1:+1) )
        .filter(function(item){
            console.log(item);
            return ( (item.timestamp > cutoffBeginTimestamp)
                && (item.timestamp < cutoffEndTimestamp) );
        });

    console.debug("FILTERED SERIES: "+JSON.stringify(filteredSeries, null, 4));


    return filteredSeries;
}


function initialize(){
    console.log("Initializing");
    datastore.setup();
    let stockList = require("./stocks.json");
    let stockTickers = [];
    stockList.forEach(item => {
        let stock = StockVO.create(item[0], item[1]);
        stockTickers.push(item[0]);
        datastore.writeStock(stock);
    });

    let status = StatusVO.create(stockTickers, Number.NaN, 0);
    datastore.writeStatus(status);
}