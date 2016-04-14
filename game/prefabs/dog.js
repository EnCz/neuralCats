'use strict';
var Animal = require('../prefabs/animal');

var Dog = function(game, x, y, frame) {
  	Animal.call(this, game, x, y, 'dog', frame);

  	// Animationen fuer Bewegung vorbereiten
    this.animations.add('walkLeft', [0, 1, 2, 3]);
    this.animations.add('walkDown', [4, 5, 6, 7]);
    this.animations.add('walkRight', [8, 9, 10, 11]);
    this.animations.add('walkUp', [28, 29, 30, 31]);

    // Physics Setup
    game.physics.arcade.enable(this, Phaser.Sprite.prototype);
    this.body.collideWorldBounds = true;
    this.body.checkCollision = true;
};

Dog.prototype = Object.create(Animal.prototype);

Dog.prototype.constructor = Dog;

Dog.prototype.update = function() {

	// TODO: Neuronen müssen hier entscheiden welche Intentions dran kommen
	var prioIntention = {
		action: 'move', // Welche Aktion muss ausgeführt werden
		object: { 		// Auf welches Objekt soll die Aktion ausgeführt werden
			x: 0,
			y: 0
		}
	}
	// TODO: Wann ist die Intention erfüllt und wird aus Intentions gelöscht? 

		this[prioIntention.action](prioIntention.object);
/*
	if (this.reactCooldown) {
		if (this.game.time.now - this.reactionTime > 3000) {
			this.emotionBubble.destroy();
			if (this.reactionTime > 5000) {
				this.reactCooldown = false;
				this.reactionTime = 0;
			}
		}
	}
*/
};

module.exports = Dog;
