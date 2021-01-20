let fs = require("fs");

try {
    fs.mkdirSync("/tmp/data/");
}
catch(err){}
//fs.writeFileSync("/tmp/data/wmt.json", JSON.stringify({ timestamp: 0, data:{} }));
let data = fs.readFileSync("/tmp/data/wmt", "utf8");
data = JSON.parse(data);
console.log(data);

console.log("> "+data.data.tree);