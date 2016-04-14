'use strict';
var Food = require('../prefabs/food');

//////////////////// OBJECT CONFIGURATION ////////////////////
var Pizza = function(game, x, y, frame) {
	Food.call(this, game, x, y, 'pizza', frame);

    // Physics Setup
    game.physics.arcade.enable(this, Phaser.Sprite.prototype);
    this.body.collideWorldBounds = true;
    this.body.checkCollision = true;
};

Pizza.prototype = Object.create(Food.prototype);
Pizza.prototype.constructor = Pizza;


//////////////////// BASIC CONFIGURATION /////////////////////

Pizza.prototype.hungerRestore = 25;


//////////////////// PRIVATE FUNCTIONS ///////////////////////

// function private() {}


//////////////////// TIMER FUNCTIONS /////////////////////////

// Pizza.prototype.update = function() {};


//////////////////// BASIC FUNCTIONS /////////////////////////

// Pizza.prototype.consume(source) {}


module.exports = Pizza;