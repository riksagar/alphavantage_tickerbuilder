"use strict";
function create(stockList/*string[]*/, lastUpdateIndex/*number*/, lastUpdateTime/*number*/){

    return {
        _type: "status_vo",
        stocks: stockList, 
        lastUpdate: {
            index: lastUpdateIndex,
            time: lastUpdateTime
        }
    }
}

function createWithDefaults(){
    return create([], Number.NaN, 0);

}

function fromJSON(str){
    let data = JSON.parse(str);
    let ret = createWithDefaults();

    if (data.stocks && Array.isArray(data.stocks)){
        data.stocks.forEach(item => {
            if ("string" === typeof item){
                ret.stocks.push(item);
            }
        });
    }

    if (data.lastUpdate){
        if ("number" === typeof data.lastUpdate.index){
            ret.lastUpdate.index = data.lastUpdate.index;
        }
        if ("number" === typeof data.lastUpdate.time) {
            ret.lastUpdate.time = data.lastUpdate.time;
        }
    }

    return ret;
}

module.exports = {
    create: create,
    fromJSON: fromJSON
};