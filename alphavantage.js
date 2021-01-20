"use strict";

let credentials = require("./alphavantage_credentials.json");
let https = require("https");



let URL_BASE = "https://www.alphavantage.co/query?";

let REQUEST_INTRADAY = {
    "function": "TIME_SERIES_INTRADAY", 
    "interval": "30min",
    "apikey": credentials["api-key"],
    "symbol": null
};

//TODO use this...
let REQUEST_DAILY = {
    "function": "TIME_SERIES_DAILY",
    "apikey": credentials["api-key"],
    "symbol": null
};


function getStockQuote(ticker, cb){
    if ("function" !== typeof cb) throw ErrorType(ErrorType.INVALID_ARGUMENT);

    let request = REQUEST_INTRADAY;
    request.symbol = ticker.toLowerCase();

    let urlParams = [];
    for (let key in request){
        if (!request.hasOwnProperty(key)) return;
        urlParams.push([key, request[key]].join("="));
    }
    let url = URL_BASE+urlParams.join("&");

    function handleHttpResponse(resp){
        let data = [];
        console.log("Got response: " + resp.statusCode);
        if ("200" == resp.statusCode){
            resp.on("readable", (stream) => {
                let bb = resp.read();
                data.push(bb);
            });
            resp.on("end", ()=>{
                let msg = data.join("");
                //console.debug(msg);

                let stockData = {};
                try {
                    stockData = JSON.parse(msg);
                }
                catch(err){
                    console.error("Failed to parse server response: "+err.message);
                }
                cb(stockData);
                //processServerResponse(JSON.parse(msg));
            });
        }
    }
    

    /*
    function processServerResponse(data){
        if (!data) throw ErrorType(ErrorType.SERVER_RESPONSE);
    
        let respKeys = Object.keys(data);
        console.log(respKeys);
        let series = respKeys
            .filter(function(item){
                if (0 === item.indexOf("Time Series")){
                    return true;
                }
            })
            .reduce(function(acc, item){
                return data[item];
            }, {});
    
        console.log(series);
    
        let now = new Date();
        let todayDateInfo = [now.getFullYear(), 1+now.getMonth(), now.getDate()]; 
        console.log("Today is " + todayDateInfo);
        let filteredSeries = Object.keys(series)
            .filter(function(item){
                console.log(item);
                let dateInfo = item.split(" ")[0].split("-");
                dateInfo = dateInfo.map( item => parseInt(item));
                return (
                    (todayDateInfo[1] === dateInfo[1])
                        && (todayDateInfo[2] === dateInfo[2]) );
            })
            .map( item => {
                let t = new Date(item);
                return {
                    timestamp: t.getTime(),
                    timeInfo: t.toTimeString(),
                    quote: series[item]
                }
            })
            .sort( (a,b) => ((a.timestamp < b.timestamp)?-1:+1) );
    
        console.log(filteredSeries);
    
        cb(filteredSeries);
    }
    */
    
    https.get(url, handleHttpResponse);
}

function getStockDailyQuote(ticker, cb){
    if ("function" !== typeof cb) throw ErrorType(ErrorType.INVALID_ARGUMENT);

    let request = REQUEST_DAILY;

    request.symbol = ticker.toLowerCase();

    let urlParams = [];
    for (let key in request){
        if (!request.hasOwnProperty(key)) return;
        urlParams.push([key, request[key]].join("="));
    }
    let url = URL_BASE+urlParams.join("&");

    function handleHttpResponse(resp){
        let data = [];
        console.log("Got response: " + resp.statusCode);
        if ("200" == resp.statusCode){
            resp.on("readable", (stream) => {
                let bb = resp.read();
                data.push(bb);
            });
            resp.on("end", ()=>{
                let msg = data.join("");
                //console.debug(msg);

                let stockData = {};
                try {
                    stockData = JSON.parse(msg);
                }
                catch(err){
                    console.error("Failed to parse server response: "+err.message);
                }
                cb(stockData);
                //processServerResponse(JSON.parse(msg));
            });
        }
    }
    
    https.get(url, handleHttpResponse);
}



function ErrorType(code){
    return new Error(code);
}

ErrorType.SERVER_RESPONSE = 1;
ErrorType.INVALID_ARGUMENT = 2;


module.exports = {
    ErrorType: ErrorType,
    getStockQuote: getStockQuote, 
    getStockDailyQuote: getStockDailyQuote
};