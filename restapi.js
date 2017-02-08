var express = require( 'express' );
var router = express.Router();
var ObjectID = require('mongodb').ObjectID;
// MongoDB用ファイルを指定
var collection = require( './mongo' );
var COL = 'tweets';

// For Cross Origin
router.all( '/*', function ( req, res, next ) {
    res.contentType( 'json' );
    res.header( 'Access-Control-Allow-Origin', '*' );
    next();
} );

// GET find
router.get( '/', function ( req, res ) {
    collection(COL).count(
	function(err, count){
	    console.log(count);
	    res.send(String(count));
	}
    );
} );

// GET find :id
router.get( '/:id', function ( req, res ) {
    console.log(req.params.id)
    collection(COL).findOne(
	{"_id": new ObjectID(req.params.id) },
	{},
	function(err, r){
	    console.log(r);
	    res.send(r);
	});
} );

// GET find 
router.get( '/img_tw/date/:datetime', function ( req, res ) {
    console.log(req.params.datetime)
	var strDate = req.params.datetime;
	var strStartDate = strDate.substring(0,4)+"-"+ strDate.substring(4,6)+"-"+strDate.substring(6,8)+"T"+"00:00:00+09:00";
	//var startDate = ISODate(strStartDate);
	//console.log(strStartDate);
	console.log(new Date(strStartDate));
	var strEndDate = strDate.substring(0,4)+"-"+ strDate.substring(4,6)+"-"+strDate.substring(6,8)+"T"+"23:59:59+09:00";
	//var endDate = ISODate(strEndDate);
	//console.log(strEndDate);
	console.log(new Date(strEndDate));
    collection(COL).find(
			{"created_datetime":{$gt: new Date(strStartDate), $lt: new Date(strEndDate)}}
		).project(
			{'created_datetime':1 , 
            	'retweet_count': 1, 'id_str': 1, 'user': 1, 'text': 1, 'entities':1,
            	'retweeted_status': 1, 'negaposi':1, 'hash_match':1}
		).toArray(
			function(err, tws){
				var rlts = [];
				for(var i=0; i<tws.length; i++ ){
					var tw = tws[i];

					// var is_existed = false;
					
					// for(var j=0; j<rlts.length; j++){
					// 	if(String(rlts[j].text) == String(tw.text)){ 
					// 		is_existed == true;
					// 		break;
					// 	}
					// }

//					if(is_existed == false){
						var rlt = {
							'created_datetime':tw.created_datetime,
							'retweet_count':tw.retweet_count,
							'id': tw.id_str,
							'user.screen_name': tw.user.screen_name,
							'text':tw.text
						};

						//media_urls
						var tmp = tw.entities;
						if(tmp != undefined){
							tmp = tmp.media;
							if(tmp != undefined){
								tmp = tmp[0].media_url;
								rlt['media_urls'] = tmp;
								var is_existed = is_existed_in_tweets(tmp, rlts);
								if(is_existed == false){
									rlts.push(rlt);
								}
							}
						}
					// }else{
					// 	console.log(tw.text);
					// }
				}
				res.send(rlts);
			}
		);
});

function is_existed_in_tweets(url, tweets){
	var is_existed = false;
	for(var i=0; i<tweets.length; i++){
		if(url == tweets[i].media_urls){
			is_existed = true;
			break;
		}
	}

	return is_existed;
}

// router.get( '/tweet/:user/:id', function ( req, res ) {
//     var user = req.params.user;
// 	var id = req.params.id;
// 	console.log("user:" + user + "   id:" + id);
//     collection(COL).findOne(
// 		{"user.screen_name": user, "id_str": id},
// 		{},
// 		function(err, tw){
// 			console.log(tw);
// 			var rlt = {
// 				'created_datetime':tw.created_datetime,
// 				'retweet_count':tw.retweet_count,
// 				'id': tw.id_str,
// 				'user.screen_name': tw.user.screen_name,
// 				'text':tw.text
// 			};
			
// 			res.send(rlt);
// 		}
// 	);


//GET find tweet
router.get( '/tweet/:user/:id', function ( req, res ) {
    var user = req.params.user;
	var id = req.params.id;
	console.log("user:" + user + "   id:" + id);
	collection(COL).find(
		{"user.screen_name": user, "id_str": id}).toArray(function(err, tws){
				var tw = tws[0];
				var rlt = {
					'created_datetime':tw.created_datetime,
					'retweet_count':tw.retweet_count,
					'id': tw.id_str,
					'user.screen_name': tw.user.screen_name,
					'text':tw.text
				};		
				res.send(rlt);
			});
		}
	);

// router.get( '/tweet/:user/:id', function ( req, res ) {
// var user = req.params.user;
// var id = req.params.id;
// console.log("user:" + user + "   id:" + id);
// collection(COL).find(
// 	{"user.screen_name": user, "id_str": id},
// 	function(err, cur){
// 		console.log(cur);
// 		cur.toArray(function(err, tws){
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

	// var tws = collection(COL).find({"user.screen_name": user, "id_str": id}).project({'created_datetime':1 ,'created_at': 1, 
    //                                               'retweet_count': 1, 'id_str': 1, 'user': 1, 'text': 1, 'entities':1,
    //                                               'retweeted_status': 1, 'negaposi':1, 'hash_match':1}).toArray(
	// 												  function(tws){
	// 													console.log(tws);
	// 													var tw = tws[0];
	// 													res.send(tws);
	// 												  }
	// 											  );


module.exports = router;
