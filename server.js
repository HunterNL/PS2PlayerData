PS2Data = {};
PS2Data.live = {};

//No touchy!
var API_ENTRY = "http://census.daybreakgames.com";
var SERVICE_ID = "example"; //Default ID, limited to 10 queries/minute
var DATA_LIMIT = 500; //Maximum ammount of items returned from a query
var MONGO_INITIALIZED = false; //Badly named, mongo can be "initialized" as not being used
//TODO Actualy weakly depend on mongo/imply mongo? Whatever makes mongo optional

var Inserters = {};
var Parsers = {} ;

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

playerHandler = {};
playerHandler.parser = function(array) {
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

		returnArray.push(player);
	}

	return returnArray;
};

playerHandler.inserter = function(array) {
	if(PS2Data.Players) {
		for(var i=0;i<array.length;i++) {
			var player = array[i];

			PS2Data.Players.upsert(player.character_id,{
				$set : player
			});
		}
	}
};

outfitHandler = {};
outfitHandler.parser = function(array) {

};

outfitHandler.inserter = function(array) {

};

//37509488620601506 conz id



/*
Returns a function that can be called nicely by HTTP.call with a callback and data_key
	Data_key is the property name of the actual data in the results object,
		its different for every collection AND ammount of objects returned because DBG is silly
*/
function bindCallback(callback,handler,args) {

	//The main receiving function
	function httpCallback(error,result,callback,handler,args) {
		//console.log("error:"+error);
		if(error) {
			throw new Meteor.Error("PS2Playerdata_http_error","Failed to get data from http connection",error);
		}

		if(result.data) {

			if(!MONGO_INITIALIZED) {
				mongoInitDefault(); //If we got all the way here and mongo isn't initialized, initialize mongo
			}

			var data = result.data[args.data_key];
			if(typeof data !== "undefined") {

				var niceData = handler.parser(data); //Turn raw data into something easier to work with
				handler.inserter(niceData);

				if(typeof callback=="function") {

					if(args.isList) {
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
		httpCallback(error,result,callback,handler,args);
	};
}

//Default way to intialize mongo
function mongoInitDefault(){
	if(MONGO_INITIALIZED) {
		console.warn("PS2Data: default mongo init called while already initialized");
	}
	if(Mongo) {
		PS2Data.Players = new Mongo.Collection("planetside2data_players");
		PS2Data.Oufits = new Mongo.Collection("planetside2data_outfits");
	}

	MONGO_INITIALIZED = true;
}

//Custom way to init mongo, setting is config.mongo object passed to PS2Data.configure
function mongoInitCustom(setting) {
	if (setting === false) {
		MONGO_INITIALIZED = true; //No Mongo used, prevent further initialization
		return;
	}

	//Possible customization here, maybe, for now just do the same as default
	PS2Data.Players = new Mongo.Collection("planetside2data_players");
	PS2Data.Oufits = new Mongo.Collection("planetside2data_outfits");

	MONGO_INITIALIZED = true; //Prevent rerunning;
}

//Fetches a single player by ID
PS2Data.fetchSinglePlayer = function(id,callback) {
	var url = buildUrl("character",id,"?c:resolve=online_status");
	HTTP.get(url,{},bindCallback(callback,playerHandler,{data_key:"character_list",isList:false}));
};

//http://census.daybreakgames.com/get/ps2:v2/outfit_member/?outfit_id=37509488620601506&c:join=type:character^on:character_id^to:character_id^list:1^inject_at:cd&c:limit=500
//http://census.daybreakgames.com/get/ps2:v2/outfit_member/?outfit_id=37509488620601506&c:join=type:character^on:character_id^to:character_id^list:1^inject_at:full_data&c:limit="+DATA_LIMIT
//Fetches all players from an outfit, takes ID
PS2Data.fetchOutfitPlayers = function(outfitId,callback,fetchOutFit) {
	var url = buildUrl("outfit_member",null,"?outfit_id="+outfitId+"&c:join=type:character^on:character_id^to:character_id^list:1^inject_at:joined_data&c:limit="+DATA_LIMIT); //Appending data limit, required for API to function
	HTTP.get(url,{},bindCallback(callback,playerHandler,{data_key:"outfit_member_list",isList:true}));
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
