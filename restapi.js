var express = require( 'express' );
var router = express.Router();
var bodyParser = require('body-parser');
// urlencodedとjsonを初期化する
router.use(bodyParser.urlencoded({extended: true}));
router.use(bodyParser.json());

var ObjectID = require('mongodb').ObjectID;
// MongoDB用ファイルを指定
var collection = require( './mongo' );
// Twitter APIで取得したツイートが保存されているCollection名
var COL_TWEETS = 'tweets';
// 教師データを保存する先のCollection名
var COL_LABELS = 'img_labels';

// For Cross Origin(クロスオリジン制限を外す)
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
    collection(COL_TWEETS).findOne(
		{"_id": new ObjectID(req.params._id) },
		{},
		function(err, tw){
			res.send(tw);
		}
	);
} );

// GET 
// date : YYYYMMDD
// COL_TWEETSをdateで指定した日付(日本時間)で検索する。
// 一致したツイートの中にentities.media.media_urlを含み、
// かつ、まだCollection: COL_LABELSに含まれていないツイートを抽出して返す。
router.get( '/tweets/img/date/:date', function ( req, res ) {
//    console.log(req.params.date)
	var strDate = req.params.date;
	var strStartDate = strDate.substring(0,4)+"-"+ strDate.substring(4,6)+"-"+strDate.substring(6,8)+"T"+"00:00:00+09:00";
//	console.log(new Date(strStartDate));
	var strEndDate = strDate.substring(0,4)+"-"+ strDate.substring(4,6)+"-"+strDate.substring(6,8)+"T"+"23:59:59+09:00";
//	console.log(new Date(strEndDate));

    collection(COL_TWEETS).find(
			{"created_datetime":{$gt: new Date(strStartDate), $lt: new Date(strEndDate)}}
		).project(
			{'_id':1,'created_datetime':1 , 
            	'retweet_count': 1, 'id_str': 1, 'user': 1, 'text': 1, 'entities':1,
            	'retweeted_status': 1, 'negaposi':1, 'hash_match':1, 'labels':1}
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

					//labelsが見つかったら追加
					var labels = tw.labels;
					if(labels != undefined){
						rlt['labels'] = labels;
					}

					//media_urlが見つかったら返却対象
					var tmp = tw.entities.media;
					if(tmp != undefined){
						var m_url = tmp[0].media_url;
						//当該URLが新規の場合は返却対象とする(rltsに入れる)
						if(is_existed_in_tweets(m_url, rlts) == false){
							rlt['media_url'] = m_url;
							rlts.push(rlt);
						}
					}
				}

				//rltsに含まれるURLがCOL_LABELSに含まれるかどうかチェックし、含まれている場合はその分類ラベルを付加して返す
				Promise.all(rlts.map(function(tw){
					return add_labels_if_exist(tw);
				})).then(function(results){
					res.send(results);
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

//tweet内のURLがCOL_LABELSに含まれているかどうかチェックし、
//含まれていた場合はそのannotationをtweetに追加して返す
function add_labels_if_exist(tweet){
	return new Promise(function(resolve, reject){
			var cnt = 0;
			collection(COL_LABELS).find({"url": tweet.media_url}).toArray(
				function(err, r){
					if(err){
						reject(err);
					}else{
						cnt = r.length;
						if(cnt != 0){
							tweet["labeled"] = r[0].annotation;
						}
						resolve(tweet);
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
		function(err,found_record){
			if(err){//errがnull以外の場合 -> mongodbでエラーになった
				res.send({'result':　err});
			}else if(found_record){ //found_recordがnull以外の場合 -> すでに存在している -> updateする
				collection(COL_LABELS).updateMany({"id": label["id"]},{$set: {"annotation": label["annotation"]}},
					function(err, r){
						res.send({"result": r.result.ok, "num": r.result.n});
					});
			}else{
				//found_recordがnull -> 存在しないのでinsertする
				collection(COL_LABELS).insertOne(
					label,
					{'forceServerObjectId':true},
					function(err, r){
						res.send({"result": r.result.ok});
					}
				);	
			}
		}
	);
});

module.exports = router;
