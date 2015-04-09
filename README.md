# PS2PlayerData
__WIP__ package to easily and quickly get data from the Planetside 2 [API](http://census.daybreakgames.com/) into Meteor

Feedback is very welcome

## Usage
Not ready at all and still unpublished, but since you're here:
* `PS2Data.fetchSinglePlayer(ID,callback)` Takes character id as string
* `PS2Data.fetchOutfitPlayers(ID,callback,fetchOutfit)` Takes outfit id as string, fetchOutfit as bool, defaults to true
* `PS2Data.configure(object)` takes object with following keys:
	* `service_id` : `String` DBG service id, defaults to "example"
	* `data_limit` : `number` ammount of outfit members to return, defaults to 500
	* `mongo` : `false` to disable writing to mongo collections

Callback function fires when data is returned, sole argument is a player object or array of player objects



If not disabled, all data goes into a Mongo collections:
 * `PS2Data.Players` (`planetside2data_players`)
 * `PS2Data.Outfits` (`planetside2data_outfits`)
