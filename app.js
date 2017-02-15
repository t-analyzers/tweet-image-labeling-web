/* expressモジュールをロードし、インスタンス化してappに代入。*/
var express = require("express");
var app = express();

/* listen()メソッドを実行して3000番ポートで待ち受け。*/
var server = app.listen(3000, function(){
    console.log("Node.js is listening to PORT:" + server.address().port);
});

// View EngineにEJSを指定。
app.set('view engine', 'ejs');

// "/"へのGETリクエストでindex.ejsを表示する。拡張子（.ejs）は省略されていることに注意。
app.get("/", function(req, res, next){
    res.render("index", {});
});
app.use(express.static('static'));

// "/api"へのアクセスに対する処理はrestapi.jsで定義。
var restapi = require( './restapi' );
app.use( '/api', restapi );
