let datastore = require("./datastore");
let StatusVO = require("./status_vo");
let StockVO = require("./stock_vo");


console.log("Checking datastore ... "+datastore.check());

console.log("will attempt to create new datastore");
datastore.setup();
console.log("All done!");

let status = StatusVO.create(["wmt", "hpq"]);

datastore.writeStatus(status);

let stock = StockVO.create("WMT", "Walmart");
datastore.writeStock(stock);
let read_stock = datastore.readStock("wmt");
console.log(typeof read_stock+" "+JSON.stringify(read_stock, null, 4));

let read_status = datastore.readStatus();
console.log("status: "+JSON.stringify(read_status, null, 4));

datastore.writeStatus(read_status);
read_status = datastore.readStatus();
console.log("status: "+JSON.stringify(read_status, null, 4));


read_status.stocks.forEach(stockTicker=>{
    let astock = datastore.readStock(stockTicker);
    console.log("Stock: <"+stockTicker+"> "+JSON.stringify(astock.metadata));
});
