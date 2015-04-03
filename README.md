# PS2PlayerData
__WIP__ package to easily and quickly get data from the Planetside 2 [API](http://census.daybreakgames.com/) into Meteor

Feedback is very welcome

## Usage
Not ready at all and still unpublished, but since you're here:
* `PS2Data.fetchSinglePlayer(ID,callback)` Takes character id as string
* `PS2Data.fetchOutfitPlayers(ID,callback)` Takes outfit id as string

Callback function fires when data is returned, sole argument is a player object or array of player objects

All data goes into a Mongo collection at `PS2Data.Players`
