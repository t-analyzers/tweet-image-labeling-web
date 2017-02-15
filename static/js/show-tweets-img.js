var API_URL_TOP = location.protocol + "//" + location.host + "/api/";
var TWEET_URL_ENDPOINT = API_URL_TOP + "tweets";
var LABEL_URL_ENDPOINT = API_URL_TOP + "img_label";

var ANNOTATION_LABEL_ELEMENTS = {"illust":"イラスト", "photo":"写真", "text":"文字", "calendar":"カレンダー", "placard":"プラカード", "manga":"漫画","capture":"キャプチャ","icon":"アイコン"};
var ADULT_LABEL_ELEMENTS = {"false":"No", "true":"Yes", "possible":"Possible"};

$(document).ready(function(){
	//クエリパラメータを取得
	var q = get_url_queries();
	var str_date = "";

	//クエリパラメータd=YYYYMMDDでツイートの日にちを指定する。dがない場合は実行前日の日付をセットする。
	if(q["d"] != undefined){
		str_date = q["d"];
	}else{
		var d = new Date();
		d.setDate(d.getDate-1);
		str_date = (d.getFullYear).toString()+(d.getMonth+1).toString()+(d.getDay).toString();
	}

	//ツイートと画像を表示する。
    show_tweets_img(str_date);
});

function show_tweets_img(str_date){
    $("#imglist").html("");
    $("#loading").show();

    $.ajax({
		type: "GET",
		url: TWEET_URL_ENDPOINT+"/img/date/"+str_date,
		dataType: "json",
		success: function(tweets) {
			var cards = [];
			for(var i = 0; i < tweets.length; i++){
				var isIcon = false;
				//netprintアプリのアイコンなど、特定のアイコン画像は表示対象外にする
				if(tweets[i].hash_match != undefined && tweets[i].hash_match.indexOf("icon") != -1){
					isIcon = true;
				}
				
				if(tweets[i].media_url != undefined && tweets[i].retweet == undefined && isIcon == false){ //retweetは除く
					var html_card = "";
					var card_title = tweets[i]["user.screen_name"];
					var pid = tweets[i]["PrintID"];

					//col用とcard用のdiv start
					html_card = "<div class='col s12 m6 l3'><div class='card'>";

					//card-imageのタグ作成
					html_card += "<div class='card-image'>";
					html_card += "<img  src='" + tweets[i]["media_url"] + "'>";
					html_card += "</div>";

					//card-contentのタグ作成
					html_card += "<div class='card-content'>";
					html_card += "<span class='card-title activator grey-text text-darken-4'>"
						+ "<i class='material-icons right'>textsms</i></span>";

					html_card += annotation_form(tweets[i]["twid"]);
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

			//ローディング画像を消してツイート画像を表示する
			$("#loading").hide();
			$("#imglist").html(html_cards);


			//更新ボタンのクリックイベント追加
			$(".btn").on("click", function(elem){
				$.ajax({
					ype: "GET",
					url: TWEET_URL_ENDPOINT+"/"+$(elem.target).parent().data("twid"),
					dataType: "json",
					success: function(tweet) {
						//対象ツイートを取得して教師データに必要な項目を取得する
						var img_label = {//"_id": tweet["_id"],
								"screen_name": tweet["user"]["screen_name"], 
								"id": tweet["id"],
								"url": tweet["entities"]["media"][0]["media_url"]};
						
						var labels = [];
						var adult = $(elem.target).parents().find("[name='adult']:checked").val();
						$(elem.target).parent().find("[name='annotation']:checked").each(function(){
							labels.push($(this).val());
						});

						img_label["annotation"] = {"adult":adult, "labels":labels};
						
						//教師データ用のテーブルに投入する
						$.ajax({
							type: "POST",
							url: LABEL_URL_ENDPOINT,
							dataType: "json",
							data: img_label,
							success: function(result) {
								alter(JSON.stringify(result));
							}
						});

					}
				});
			});
		}
	});
}



/**
 * @returns
 */
function annotation_form(id){

	var html = "<p>属性</p>";
	html += "<form action='#' data-twid ='" + id + "'>";
	for(k in ANNOTATION_LABEL_ELEMENTS){
	    html += "<p><input name='annotation' type='checkbox' class='filled-in' id='" + k + "_" + id + "' value='" + k + "'/>" + 
      	"<label for='" + k + "_" + id + "'>" + ANNOTATION_LABEL_ELEMENTS[k] + "</label></p>";
	}

	html += "<p>成人向け</p>";

	for(k in ADULT_LABEL_ELEMENTS){
		var checked = "";
		if(k=="false"){ checked = "checked";}
		html += "<p><input name='adult' type='radio' id='" + k + "_" + id + "' value='" + k + "' " + checked + " />" +
	    	"<label for='" + k + "_" + id + "'>" + ADULT_LABEL_ELEMENTS[k] + "</label></p>";
	}

	html += "<a class='waves-effect waves-light btn'>更新</a>";

	html += "</form>";
	return html;
}

function update(){

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
