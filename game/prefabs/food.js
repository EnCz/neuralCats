'use strict';

//////////////////// FOOD OBJECT CONFIGURATION ////////////////////
var Food = function(game, x, y, frame) {
 	Phaser.Sprite.call(this, game, x, y, frame);
 	
 	// TODO: create unique ID for each object
 	this.objId = game.rnd.integerInRange(0,1000);

};

Food.prototype = Object.create(Phaser.Sprite.prototype);
Food.prototype.constructor = Food;


//////////////////// FOOD BASIC CONFIGURATION ////////////////////

Food.prototype.hungerRestore = 30;


//////////////////// FOOD BASIC FUNCTIONS ////////////////////////

Food.prototype.consume = function(source) {
	source.needs.hunger -= this.game.rnd.integerInRange(20,35);
	if (source.needs.hunger > 100) source.needs.hunger = 100;
	this.destroy();
}

module.exports = Food;
