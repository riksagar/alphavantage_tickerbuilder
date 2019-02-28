"use strict";


function PriceSample(time, open, close, volume){
    return {
        time: time,
        open: open, 
        close: close, 
        volume: volume
    };
}


/**
 * 
 * @param {string} ticker - ticker id used to request price
 * @param {string} name - Stock name/company name 
 * @param {PriceSample[]} prices - Array of price objects for the day.  Expected to be
 * be a list that starts at 9am and extends until 4pm (or the last quote if not 4pm yet)
 * @param {number} prevClose - Price at close of previous day
 * @param {number} time - Time, in milliseconds since epoc, that the stock was last updated. 
 * @param {object} rawData - 
 */
function create(ticker, name, prices, prevClose, time, rawData){

    return {
        _type: "stock_vo",
        metadata: {
            name: name, 
            ticker: ticker
        },
        prices: prices,
        prevClose: prevClose,
        rawData: rawData,
        lastUpdate: time
    };
}

function createWithDefaults(ticker, name){
    if (!ticker || !name) throw new Error("Invalid parameters");
    return create(ticker, name, [], 0, 0, {}); 
}

function fromJSON(json /*string*/){
    let data = JSON.parse(json);
    let ret = createWithDefaults(data.metadata.ticker, data.metadata.name);
    if (!!data.prices) ret.prices = data.prices;
    if (!!data.prevClose) ret.prevClose = data.prevClose;
    if (!!data.rawData) ret.rawData = data.rawData;
    if (!!data.lastUpdate) ret.lastUpdate = data.lastUpdate;

    return ret;
    
}
module.exports = {
    PriceSample: PriceSample,
    create: create,
    fromJSON: fromJSON
};