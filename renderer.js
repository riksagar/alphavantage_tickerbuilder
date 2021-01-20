"use strict";

const MAX_QUOTES_PER_PAGE = 9;
const PAGE_HEIGHT = 10;


let FS = require("fs");
let DataStore = require("./datastore");
let StockList = require("./stocks.json");

let DisplayUtil = require("pcduinotickerbuilder/display_util");
let ScrollTicker = require("pcduinotickerbuilder/widget/scroll_ticker");
let Seperator = require("pcduinotickerbuilder/widget/seperator");
let SdffBuilder = require("pcduinotickerbuilder/sdff_builder");

const SEPERATOR_PLACEHOLDER = Seperator.makeSeperator(Seperator.Style.SOLID)
let columnData = [SEPERATOR_PLACEHOLDER];
let pausePoints = [0];

for (let quoteIndex = 0, sepScrollThumb = 0; quoteIndex < StockList.length; ++sepScrollThumb, quoteIndex += MAX_QUOTES_PER_PAGE){
    let count = StockList.length - quoteIndex;
    if (count > MAX_QUOTES_PER_PAGE){
        count = MAX_QUOTES_PER_PAGE;
    }

    let pageColumns = buildQuotePage(StockList, quoteIndex, count);

    columnData.push.apply(columnData, pageColumns);
    pausePoints.push(columnData.length);

    columnData.push(SEPERATOR_PLACEHOLDER);
}

let displayBuilder = DisplayUtil.DisplayBuilder.init()
    .setDisplay(DisplayUtil.DisplayBuilder.makeDisplay(columnData.length, PAGE_HEIGHT));

columnData.forEach((col, idx)=>{
    console.log("Adding column " + idx);
    displayBuilder.addColumn(col);
});
let display = displayBuilder.build();

ScrollTicker.updateDisplayWithTickerOverlay(display);

// Write the seperators now, so they are not truncated by the 'scroll ticker'
pausePoints.forEach((pauseCol, index) => {
    let thumb = index;
    let sep;
    if (0 === index){
        sep = Seperator.makeSeperator(Seperator.Style.SOLID);
    }
    else {
        --thumb;
        thumb &= 5;
        sep = Seperator.makeSeperator(Seperator.Style.SCROLLBAR, { position: thumb });
    }

    display.columnData[pauseCol] = sep; 
});


let sdffDispObj = SdffBuilder.serializeDisplay(display);
let sdffDispBuffer = Buffer.from(sdffDispObj);

let scriptBuilder = DisplayUtil.ScriptBuilder
    .init()
    .setScript(DisplayUtil.ScriptBuilder.makeScript(DisplayUtil.Script.Flags.repeat))
    .addAction(DisplayUtil.ScriptBuilder.makeScriptPositionAction(0))
    .addAction(DisplayUtil.ScriptBuilder.makeScriptPauseAction(1000))

let pastPausePoint = pausePoints.shift();
while(0 !== pausePoints.length){
    let scrollCount = pastPausePoint;
    pastPausePoint = pausePoints.shift();
    scrollCount = pastPausePoint - scrollCount;
    scriptBuilder.addAction(DisplayUtil.ScriptBuilder.makeScriptScrollAction(1, scrollCount-5, 200));
    scriptBuilder.addAction(DisplayUtil.ScriptBuilder.makeScriptPauseAction(1000));
    scriptBuilder.addAction(DisplayUtil.ScriptBuilder.makeScriptScrollAction(1, 5, 200));
    scriptBuilder.addAction(DisplayUtil.ScriptBuilder.makeScriptPauseAction(1000));
}

let script = scriptBuilder.build();
let sdffScriptObj = SdffBuilder.serializeScript(script);
let sdffScriptBuffer = Buffer.from(sdffScriptObj);


let hFile = FS.openSync("/tmp/display", "w");
FS.writeSync(hFile, sdffDispBuffer, 0, sdffDispBuffer.byteLength);
FS.writeSync(hFile, sdffScriptBuffer, 0, sdffScriptBuffer.byteLength);
FS.closeSync(hFile);






function buildQuotePage(stockList, stockStartIdx, stockCount){
    let pageColData = [];

    let colRow = 0;
    let iq = stockStartIdx;
    let endQ = stockStartIdx+stockCount;
    while ( (iq < stockList.length) && (iq !== endQ) ) {
        let pageCols = 0;
        let stockSymbol = stockList[iq][0];
        console.log("Reading data for "+stockSymbol);
    
        let stockData = DataStore.readStock(stockSymbol);
        pageCols = Math.max(stockData.prices.length, pageCols);
        while(pageCols > pageColData.length){
            let newRow = [];
            for (let ri=0; PAGE_HEIGHT !== ri; ++ri){
                newRow.push(DisplayUtil.Display.PixelState.OFF);
            }
            pageColData.push(newRow);
        }
    
        let priceDayOpen = stockData.prevClose;
        for (let p = 0; p !== stockData.prices.length; ++p){
            let priceClose = stockData.prices[p].close;
    
            let priceDelta = priceClose - priceDayOpen;
            let pixelState = (0 === priceDelta)
                ?DisplayUtil.Display.PixelState.OFF
                :(priceDelta < 0)
                    ?DisplayUtil.Display.PixelState.RED
                    :DisplayUtil.Display.PixelState.GREEN;
            console.log("Price Open: "+priceDayOpen+"; current price: "+priceClose+"; state: "+pixelState);
            
            let col = pageColData[p];
            col[colRow] = pixelState;
        }

        ++iq;
        ++colRow;
    }

    return pageColData;
}
