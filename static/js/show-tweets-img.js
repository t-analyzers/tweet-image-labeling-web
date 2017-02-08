$(document).ready(function(){
	var q = get_url_queries();
	var d = new Date();
	d.setDate(d.getDate-1);
	var str_date = (d.getFullYear).toString()+(d.getMonth+1).toString()+(d.getDay).toString();
	if(q["d"] != undefined){
		str_date = q["d"];
	}
    show_tweets_img(str_date);
});

function show_tweets_img(str_date){
    $("#imglist").html("");
    $("#loading").show();
	var tweets_url = "http://localhost:3000/api/img_tw/date/"+str_date;

    $.ajax({
		type: "GET",
		url: tweets_url,
		dataType: "json",
		success: function(tweets) {
			var cards = [];
			for(var i = 0; i < tweets.length; i++){
				var isIcon = false;

				if(tweets[i].hash_match != undefined && tweets[i].hash_match.indexOf("icon") != -1){
				isIcon = true;
				}
				
				if(tweets[i].media_urls != undefined && tweets[i].retweet == undefined && isIcon == false){ //retweetは除く
				var html_card = "";
				var card_title = tweets[i]["user.screen_name"];
				var pid = tweets[i]["PrintID"];

				//col用とcard用のdiv start
				html_card = "<div class='col s12 m6 l3'><div class='card'>";

				//card-imageのタグ作成
				html_card += "<div class='card-image'>";
				html_card += "<img  src='" + tweets[i]["media_urls"] + "'>";
				html_card += "</div>";

				//card-contentのタグ作成
				html_card += "<div class='card-content'>";
				html_card += "<span class='card-title activator grey-text text-darken-4'>"
					+ "<i class='material-icons right'>textsms</i></span>";
				html_card += "<p>リツイート数:"+ tweets[i]["retweet_count"] + "</p>";
				if(pid != "" && pid != undefined){ //昔のデータは"PrintID"を含んでいたので1つ目の条件を残す
					html_card += "<p>プリント予約番号：" + pid + "</p>";
				}
				var tweet_link = "https://twitter.com/"+tweets[i]["user.screen_name"]+"/status/"+tweets[i]["id"];
				html_card += "<p><a href='"+tweet_link+"' target='tweet'><i class='material-icons'>link</i></a></p>";
				html_card += "</div>";

				//card-revealのタグ作成
				html_card += "<div class='card-reveal'>";
				html_card += "<span class='card-title grey-text text-darken-4'>" 
					+ card_title 
					+ "<i class='material-icons right'>close</i></span>";
				html_card += "<p>" + tweets[i]["text"] +"</p>";
				html_card += "</div>";

				//col用とcard用のdiv end
				html_card += "</div></div>";
				
				var card_array = {"card": html_card, "retweet_count": tweets[i]["retweet_count"] };
				cards.push(card_array);
				}
			}
			$('#img-count').html('件数: ' + cards.length);

			//リツイート数の降順に並び替え
			cards.sort(function(a, b) {
					return (a.retweet_count > b.retweet_count) ? -1 : 1;
			});

			var html_cards = "";
			for(var i = 0; i < cards.length; i++){
				html_cards += cards[i]["card"];
			}

			$("#imglist").html(html_cards);

			$("#loading").hide();

		}
	});

}

/**
 * URL解析して、クエリ文字列を返す
 * @returns {連想配列} クエリ文字列
 * 参考：　http://qiita.com/ma_me/items/03aaebb5dc440b380244
 */
function get_url_queries()
{
    var queries = {}, max = 0, hash = "", array = "";
    var url = window.location.search;

    //?を取り除くため、1から始める。複数のクエリ文字列に対応するため、&で区切る
    hash  = url.slice(1).split('&');    
    for (var i = 0; i < hash.length; i++) {
        array = hash[i].split('=');    //keyと値に分割。
        queries[array[0]]=array[1];
    }

    return queries;
}
