const fs = require('fs');
const path = require('path');

console.log(__dirname);
console.log(__filename);

fs.readFile(path.join(__filename),'utf8',(err,data)=>{
   fs.writeFile(path.join(__dirname,'hello.js'),data,(err)=>{
    console.log(err);
   })
});
