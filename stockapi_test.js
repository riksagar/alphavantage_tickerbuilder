"use strict";


let fs = require("fs");
let https = require("https");

// TODO: read from config file
let API_KEY = "RNJ8MA6V42VCMCFH";


let request = {
    "function": "TIME_SERIES_INTRADAY", 
    "interval": "30min",
    "apikey": API_KEY,
    "symbol": "WMT"
};

/*
var d = new Date("2018-10-04 15:50:00");
console.log(d.toISOString());
*/

let URL_BASE = "https://www.alphavantage.co/query?";

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
            //console.log(msg);
            
            processServerResponse(JSON.parse(msg));
        });
    }
}

var d = {
    "Meta Data": {
        "1. Information": "Intraday (5min) open, high, low, close prices and volume",
        "2. Symbol": "WMT",
        "3. Last Refreshed": "2018-10-05 15:55:00",
        "4. Interval": "5min",
        "5. Output Size": "Compact",
        "6. Time Zone": "US/Eastern"
    },
    "Time Series (5min)": {
        "2018-10-05 15:55:00": {
            "1. open": "93.3900",
            "2. high": "93.4100",
            "3. low": "93.2750",
            "4. close": "93.3100",
            "5. volume": "329434"
        },
        "2018-10-05 15:50:00": {
            "1. open": "93.2400",
            "2. high": "93.4100",
            "3. low": "93.2150",
            "4. close": "93.4100",
            "5. volume": "149718"
        },
        "2018-10-05 15:45:00": {
            "1. open": "93.2000",
            "2. high": "93.2350",
            "3. low": "93.1700",
            "4. close": "93.2350",
            "5. volume": "218821"
        },
        "2018-10-05 15:40:00": {
            "1. open": "93.1200",
            "2. high": "93.2500",
            "3. low": "93.1200",
            "4. close": "93.2000",
            "5. volume": "123160"
        }
    }
};
processServerResponse(d);

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

    //let now = new Date();
    let now = new Date("2018-10-05 3:00:00");
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

}



function ErrorType(code){
    return new Error(code);
}

ErrorType.SERVER_RESPONSE = 1;



//https.get(url, handleHttpResponse);


