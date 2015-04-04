PS2Data = {};
PS2Data.live = {};


var API_ENTRY = "http://census.daybreakgames.com";
var SERVICE_ID = "example"; //Default ID, limited to 10 queries/minute
var DATA_LIMIT = 500; //Maximum ammount of items returned from a query
var MONGO_INITIALIZED = false; //Badly named, mongo can be "initialized" as not being used

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

//Takes an array of players, moves joined_data into obj root, adds date, 
//	inserts it all into Mongo if availible and returns it
function proccessPlayerList(array) {
	if(!array || array.length === 0) {
		throw new Meteor.Error("invalid_arguments","Invalid arguments to proccessPlayerList",array);
	}

	if(!MONGO_INITIALIZED) {
		mongoInitDefault(); //If we got all the way here and mongo isn't initialized, initialize mongo with default collection names
	}

	var gotMongo = !!PS2Data.Players;

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

		if(gotMongo) {
			PS2Data.Players.upsert(player.character_id,{
				$set : player
			});
		}

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

//Default way to intialize mongo
function mongoInitDefault(){
	if(MONGO_INITIALIZED) {
		console.warn("PS2Data: default mongo init called while already initialized");
	}
	if(Mongo) {
		PS2Data.Players = new Mongo.Collection("ps2_players");
		PS2Data.Oufits = new Mongo.Collection("ps2_outfits");
	}

	MONGO_INITIALIZED = true;
}

//Custom way to init mongo, setting is config.mongo object passed to PS2Data.configure
function mongoInitCustom(setting) {
	if (setting === false) {
		MONGO_INITIALIZED = true; //No Mongo used, prevent further initialization
		return;
	}

	//Default collection names
	var player_collection_setting = "ps2_players";
	var outfit_collection_setting = "ps2_outfits";


	if(typeof setting.players != "undefined") {
		player_collection_setting = settings.players;
	}
	if(player_collection_setting) {
		PS2Data.Players = new Mongo.Collection(player_collection_setting);
	}


	if(typeof setting.outfits != "undefined") {
		outfit_collection_setting = settings.outfits;
	}
	if(outfit_collection_setting) {
		PS2Data.Players = new Mongo.Collection(outfit_collection_setting);
	}

	//--------------------------------------------------------------------------




	MONGO_INITIALIZED = true; //Prevent rerunning;
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

	if(typeof obj.mongo != "undefined") {
		if(!MONGO_INITIALIZED) {
			mongoInitCustom(obj.mongo);
		} else {
			console.warn("PS2Data.configure trying to re-intialize mongo collections");
		}
	}
};
