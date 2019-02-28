"use strict";

let StockVO = require("./stock_vo");
let StatusVO = require("./status_vo");

let fs = require("fs");

let config = {
    LOCATION: "/tmp/stock/data",
    STATFILE: "status", 
    STOCKPREFIX: "sto_"
};

let NULL_STAT = {

};

function check(){
    let exists = false;
    let dirStat;
    try {
        dirStat = fs.statSync(config.LOCATION);
    }
    catch(errDir){
        console.log("No stat directory, will need to create");
    }

    if (!!dirStat && !dirStat.isDirectory) throw new Error("Needs to be a directory");

    let cfgStat;
    try {
        cfgStat = fs.statSync(config.LOCATION+"/"+config.STATFILE);
        exists = true;
    }
    catch(errFile){
        console.log("No stat file, will need to create");
    }

    if (!!cfgStat && !cfgStat.isFile) throw new Error("Need config file");

    return exists;
}

function setup(){
    let pathItems = config.LOCATION.split("/");

    var buildPath = "";
    while (pathItems.length){
        buildPath += "/";
        buildPath += pathItems.shift();


        var testStat;
        try {
            testStat = fs.statSync(buildPath);
            if (!testStat) throw new Error("no dir");
        }
        catch (err){
            fs.mkdirSync(buildPath);
            testStat = fs.statSync(buildPath);
        }   
            
        if (!testStat && !testStat.isDirectory()) throw new Error("Path not doable");
    }

    writeStatus(NULL_STAT);
}

function writeStatus(status){
    let statFile;
    try {
        statFile = fs.openSync(config.LOCATION+"/"+config.STATFILE, "w");
        if ("object" === typeof status){
            //TODO validate keys
            status = JSON.stringify(status);
        }
        else {
            throw new Error("cannot serialize that!");

        }
        fs.writeSync(statFile, status);

    }
    catch(err){
        if (statFile) fs.closeSync(statFile);
        throw err;
    }

    fs.closeSync(statFile);
    return true;
}


function writeStock(info){
    if (!info || !info.metadata || !info.metadata.ticker) throw new Error("Invalid stock symbol");

    let filename = config.LOCATION+"/"+config.STOCKPREFIX+info.metadata.ticker.toLowerCase();
    let stockFile;
    try {
        stockFile = fs.openSync(filename, "w");
        if ("object" === typeof info) {
            if ("function" === info.toJSON) {
                info = info.toJSON();
            }
            else {
                //TODO validate keys
                info = JSON.stringify(info, null, 4);
            }
        }
        else {
            throw new Error("cannot serialize that!");
        }
        fs.writeSync(stockFile, info);

    }
    catch(err){
        if (stockFile) fs.closeSync(stockFile);
        throw err;
    }

    fs.closeSync(stockFile);

    return true;
}

function readStock(id){
    if (!id || ("string" !== typeof id)) throw new Error("Invalid stock symbol");


    let filename = config.LOCATION+"/"+config.STOCKPREFIX+id.toLowerCase();
    let stockvo = fs.readFileSync(filename, "utf8");

    if ("string" === typeof stockvo){
        stockvo = StockVO.fromJSON(stockvo);
    }
    else {
        throw new Error("unexpected object format");
    }
    return stockvo;
}

function readStatus(){
    let filename = config.LOCATION+"/"+config.STATFILE;
    let statusvo = fs.readFileSync(filename, "utf8");

    if ("string" === typeof statusvo){
        statusvo = StatusVO.fromJSON(statusvo);
    }
    else {
        throw new Error("Unexpected object format");
    }

    return statusvo;
}

/*
function config(param){
    config = params;
}
*/


module.exports = {
    check: check,
    setup: setup,
    writeStatus: writeStatus,
    writeStock: writeStock,
    readStock: readStock,
    readStatus: readStatus
};