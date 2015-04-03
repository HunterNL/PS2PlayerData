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

//Takes an array of players, moves joined_data into obj root, adds date, inserts it all into Mongo and returns it for good measure
function proccessPlayerList(array) {
	if(!array || array.length === 0) {
		throw new Meteor.Error("invalid_arguments","Invalid arguments to proccessPlayerList",array);
	}

	var returnArray = [];

	for(var i=0;i<array.length;i++) {
		var player = array[i];

		check(player,Object);
		check(player.character_id,String);

		player.date_update = Date.now(); //Insert time of update (now) into Mongo as well
		if(player.joined_data&&player.joined_data[0]) {
			lodash.assign(player,player.joined_data[0]);
			delete player.joined_data;
		}


		PS2Data.Players.upsert(player.character_id,{
			$set : player
		});

		returnArray.push(player);
	}

	return returnArray;

}
//37509488620601506 conz id



/*
Returns a function that can be called nicely by HTTP.call with a callback and data_key
Data_key is the property name of the actual data in the results object,
its different for every collection AND ammount of objects returned because DBG is silly
*/
function bindCallback(callback,data_key,isList) {

	//The main receiving function
	function httpCallback(error,result,callback,data_key,isList) {
		//console.log("error:"+error);
		if(result.data) {
			if(result.data[data_key]) {
				var niceData = proccessPlayerList(result.data[data_key]);

				if(typeof callback=="function") {

					if(isList) {
						callback(niceData);
					} else {
						callback(niceData[0]);
					}

				}
			} else {
				throw new Meteor.Error("PS2Playerdata_invalid_data","Did not receive valid data from the API or data_key is incorrect\nSuspected data key: "+Object.keys(result.data)[0]+"\nGiven data key:"+data_key,result);
			}
		} else {
			throw new Meteor.Error("PS2Playerdata_no_data_received","Did not receive any data from the PS2 API",result);
		}
	}

	//The 3rd argument binding function
	return function(error,result) {
		httpCallback(error,result,callback,data_key,isList);
	};
}


//Fetches a single player by ID
PS2Data.fetchSinglePlayer = function(id,callback) {
	var url = buildUrl("character",id,"?c:resolve=online_status");
	var data = HTTP.get(url,{},bindCallback(callback,"character_list",false));
};

//http://census.daybreakgames.com/get/ps2:v2/outfit_member/?outfit_id=37509488620601506&c:join=type:character^on:character_id^to:character_id^list:1^inject_at:cd&c:limit=500
//http://census.daybreakgames.com/get/ps2:v2/outfit_member/?outfit_id=37509488620601506&c:join=type:character^on:character_id^to:character_id^list:1^inject_at:full_data&c:limit="+DATA_LIMIT
//Fetches all players from an outfit, takes ID
PS2Data.fetchOutfitPlayers = function(outfitId,callback) {
	var url = buildUrl("outfit_member",null,"?outfit_id="+outfitId+"&c:join=type:character^on:character_id^to:character_id^list:1^inject_at:joined_data&c:limit="+DATA_LIMIT); //Appending data limit, required for API to function
	var data = HTTP.get(url,{},bindCallback(callback,"outfit_member_list",true));
};

//Basic configuration function
PS2Data.configure = function(obj) {
	if(obj.service_id) {
		SERVICE_ID = obj.service_id;
	}

	if(obj.data_limit) {
		DATA_LIMIT = obj.data_limit;
	}
};
