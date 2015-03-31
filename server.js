PS2Data = {};
PS2Data.live = {};
PS2Data.Players = new Mongo.Collection("ps2_players");
PS2Data.Oufits = new Mongo.Collection("ps2_outfits");

var API_ENTRY = "http://census.daybreakgames.com";
var SERVICE_ID = "example"; //Default ID, limited to 10 queries/minute
var DATA_LIMIT = 500; //Maximum ammount of items returned from a query

function buildUrl(collection,id,query,version,format) {
	version = version || "v2";
	format = format || "json";

	return API_ENTRY +
		"/s:" + SERVICE_ID +
		"/" + format +
		"/get/ps2:"+version +
		"/"+collection +
		(id?"/"+id:"") +
		"/" + query;
}

function proccessPlayerList(array) {
	if(!array || array.length === 0) {
		throw new Meteor.Error("invalid_arguments","Invalid arguments to proccessPlayerList",array);
	}

	for(var i=0;i<array.length;i++) {
		var player = array[i];

		check(player,Object);
		check(player.character_id,String);

		player.date_update = Date.now(); //Insert time of update (now) into Mongo as well
		if(player.joined_data) {
			lodash.assign(player,player.joined_data);
			delete player.joined_data;
		}


		PS2Data.Players.upsert(player.character_id,{
			$set : player
		});
	}

}
//37509488620601506 conz id

PS2Data.fetchSinglePlayer = function(id) {
	console.log("given id ",id);
	var url = buildUrl("character",id,"?c:resolve=online_status");
	console.log("final url: ",url);
	var data = HTTP.get(url).data;
	proccessPlayerList(data.character_list);
};

//http://census.daybreakgames.com/get/ps2:v2/outfit_member/?outfit_id=37509488620601506&c:join=type:character^on:character_id^to:character_id^list:1^inject_at:cd&c:limit=500
//http://census.daybreakgames.com/get/ps2:v2/outfit_member/?outfit_id=37509488620601506&c:join=type:character^on:character_id^to:character_id^list:1^inject_at:full_data&c:limit="+DATA_LIMIT
PS2Data.fetchOutfitPlayers = function(outfitId) {
	var url = buildUrl("outfit_member",null,"?outfit_id="+outfitId+"&c:join=type:character^on:character_id^to:character_id^list:1^inject_at:joined_data&c:limit="+DATA_LIMIT);
	console.log("Fetchin outfit members with ",url);
	var data = HTTP.get(url).data;
	proccessPlayerList(data.outfit_member_list);

};
