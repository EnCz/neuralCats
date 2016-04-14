'use strict';

var Frog = function(game, x, y, frame) {
  Phaser.Sprite.call(this, game, x, y, 'cat', frame);

    // Physics Setup
    game.physics.arcade.enable(this, Phaser.Sprite.prototype);
    this.body.collideWorldBounds = true;
    this.body.checkCollision = true;

    this.fitness = 0
};

Frog.prototype = Object.create(Phaser.Sprite.prototype);
Frog.prototype.constructor = Frog;

Frog.prototype.update = function() {
  this.y -= 3;
  this.fitness += 3;
  if (this.y <= 0) {
  	this.destroy();
  }
  // write your prefab's specific update code here
  
};

module.exports = Frog;
