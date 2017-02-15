var express = require( 'express' );
var router = express.Router();
var bodyParser = require('body-parser');
// urlencodedとjsonを初期化する
router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.json());

var ObjectID = require('mongodb').ObjectID;
// MongoDB用ファイルを指定
var collection = require( './mongo' );
var COL_TWEETS = 'tweets';
var COL_LABELS = 'img_labels';


// For Cross Origin
router.all( '/*', function ( req, res, next ) {
    res.contentType( 'json' );
    res.header( 'Access-Control-Allow-Origin', '*' );
    next();
} );

// GET 
// tweetsの件数を返す
router.get( '/tweets/count/', function ( req, res ) {
    collection(COL_TWEETS).count(
	function(err, count){
	    console.log(count);
	    res.send(String(count));
	}
    );
} );

// GET 
// Collection: COL_TWEETSを_idで検索し、一致したtweetを返す。
router.get( '/tweets/:_id', function ( req, res ) {
    //console.log(req.params.id)
    collection(COL_TWEETS).findOne(
		{"_id": new ObjectID(req.params._id) },
		{},
		function(err, tw){
			res.send(tw);
		});
} );

// GET 
// Collection: COL_TWEETSをdateで指定した日付(日本時間)で検索する。
// 一致したツイートの中にentities.media.media_urlを含み、
// かつ、まだCollection: COL_LABELSに含まれていないツイートを抽出して返す。
router.get( '/tweets/img/date/:date', function ( req, res ) {
    console.log(req.params.date)
	var strDate = req.params.date;
	var strStartDate = strDate.substring(0,4)+"-"+ strDate.substring(4,6)+"-"+strDate.substring(6,8)+"T"+"00:00:00+09:00";
	console.log(new Date(strStartDate));
	var strEndDate = strDate.substring(0,4)+"-"+ strDate.substring(4,6)+"-"+strDate.substring(6,8)+"T"+"23:59:59+09:00";
	console.log(new Date(strEndDate));

    collection(COL_TWEETS).find(
			{"created_datetime":{$gt: new Date(strStartDate), $lt: new Date(strEndDate)}}
		).project(
			{'_id':1,'created_datetime':1 , 
            	'retweet_count': 1, 'id_str': 1, 'user': 1, 'text': 1, 'entities':1,
            	'retweeted_status': 1, 'negaposi':1, 'hash_match':1}
		).toArray(
			function(err, tws){
				var rlts = [];
				for(var i=0; i<tws.length; i++ ){
					var tw = tws[i];

					var rlt = {
						'twid': String(tw._id),
						'created_datetime':tw.created_datetime,
						'retweet_count':tw.retweet_count,
						'id': tw.id_str,
						'user.screen_name': tw.user.screen_name,
						'text':tw.text
					};

					//media_urlが見つかったら返却対象
//					var tmp = tw.entities;
					var tmp = tw.entities.media;
					if(tmp != undefined){
//						tmp = tmp.media;
//						if(tmp != undefined){
							var m_url = tmp[0].media_url;
							//当該URLが新規の場合は返却対象とする(rltsに入れる)
							if(is_existed_in_tweets(m_url, rlts) == false){
								rlt['media_url'] = m_url;
								rlts.push(rlt);
							}
//						}
					}
				}

				//rltsに含まれるURLがCOL_LABELSに含まれていないもののみ抽出して返す
				Promise.all(rlts.map(function(tw){
					//tw内のURLがCOL_LABELSに含まれているかどうかチェックし、{'tweet':tw, 'exist': true or false}で返す
					return exist_check_in_labels(tw);
				})).then(function(results){
					//exist: falseのtweetのみtweetsに格納する。
					var tweets = [];
					for(var i in results){
						if(results[i]["exist"]==false){
							tweets.push(results[i]["tweet"]);
						}
					}

					//tweetsを返す
					res.send(tweets);
				});

			});
});

//tweets内にurlが含まれているかどうかチェックし、true or falseを返す
function is_existed_in_tweets(url, tweets){
	var is_existed = false;
	//
	for(var i=0; i<tweets.length; i++){
		if(url == tweets[i].media_url){
			is_existed = true;
			break;
		}
	}
	return is_existed;
}

//tweet内のURLがCOL_LABELSに含まれているかどうかチェックしtrue or falseで返す
function is_exist_in_labels(tweet){
	return new Promise(function(resolve, reject){
			var is_existed = false;
			var cnt = 0;
			//
			collection(COL_LABELS).find({"url": tweet.media_url}).toArray(
				function(err, r){
					if(err){
						reject(err);
					}else{
						cnt = r.length;
						if(cnt != 0){
							is_existed = true;
						}
						resolve(is_existed);
					}
				}
			);
	});
}

//tweet内のURLがCOL_LABELSに含まれているかどうかチェックし、{'tweet':tw, 'exist': true or false}で返す
function exist_check_in_labels(tweet){
	return new Promise(function(resolve, reject){
			var is_existed = false;
			var cnt = 0;
			//
			collection(COL_LABELS).find({"url": tweet.media_url}).toArray(
				function(err, r){
					if(err){
						reject(err);
					}else{
						cnt = r.length;
						if(cnt != 0){
							is_existed = true;
						}
						resolve({"tweet": tweet, "exist": is_existed});
					}
				}
			);
	});
}

// POST
// postされたlabel内のURLがCOL_LABELSに含まれているかどうかチェックし、
// 含まれていない場合はinsertする。結果は{'result': XX}で返す。
router.post('/img_label',function(req,res){
	var label = req.body;
	collection(COL_LABELS).findOne(
		{"url": req.body['url']},{},
		function(err,lbl){
			if(err){//errがnull以外の場合 -> mongodbでエラーになった
				res.send("{'result':"+ err +"}");
			}else if(lbl){ //lblがnull以外の場合 -> すでに存在している
				res.send("{'result': 'exist'}");
			}else{
				collection(COL_LABELS).insertOne(
					label,
					{'forceServerObjectId':true},
					function(err, r){
						res.send("{'result':"+ r.result.ok +"}");
					}
				);	
			}
		}
	);
});

// router.post('/img_label',function(req,res){
// 	//console.log(req.body);
// 	//console.log(req.body['_id']);
// 	var label = req.body;
// 	collection(COL_TWEETS).findOne(
// 		{"_id": new ObjectID(req.body['_id']) },{},
// 		function(err, tw){
// 			console.log(tw);
// 			delete label.twid;
// 			collection(COL_LABELS).insertOne(
// 				label,
// 				{'forceServerObjectId':true},
// 				function(err, r){
// 					res.send("{'result':"+ r.result.ok +"}");
// 				}
// 			);		
// 		}
// 	);
// });

//GET find tweet
// router.get( '/tweets/:user/:id', function ( req, res ) {
//     var user = req.params.user;
// 	var id = req.params.id;
// 	//console.log("user:" + user + "   id:" + id);
// 	collection(COL_TWEETS).find(
// 		{"user.screen_name": user, "id_str": id}).toArray(function(err, tws){
// 			var tw = tws[0];
// 			var rlt = {
// 				'created_datetime':tw.created_datetime,
// 				'retweet_count':tw.retweet_count,
// 				'id': tw.id_str,
// 				'user.screen_name': tw.user.screen_name,
// 				'text':tw.text
// 			};		
// 			res.send(rlt);
// 		});
// 	}
// );


module.exports = router;
