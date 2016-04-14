'use strict';

var Car = function(game, x, y, frame) {
 	Phaser.Sprite.call(this, game, x, y, 'dog', frame);

    // Physics Setup
    game.physics.arcade.enable(this, Phaser.Sprite.prototype);
    this.body.collideWorldBounds = true;
    this.body.checkCollision = true;
  
};

Car.prototype = Object.create(Phaser.Sprite.prototype);
Car.prototype.constructor = Car;

Car.prototype.update = function() {
  this.x -= 3;
  if (this.x <= 0) {
  	this.destroy();
  }
  // write your prefab's specific update code here
  
};

module.exports = Car;
