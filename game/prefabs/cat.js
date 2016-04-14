'use strict';

// Require Parent Class
var Animal = require('../prefabs/animal');

var Cat = function(game, x, y, frame) {
	// Call Parent Class
 	Animal.call(this, game, x, y, 'cat', frame);
  	
 	this.animationsConfig = [
 		{
 			label: 'walkDown',
 			frames: [0,1,2,3]
 		},
 		{
 			label: 'walkLeft',
 			frames: [4,5,6,7]
 		},
 		{
 			label: 'walkRight',
 			frames: [8,9,10,11]
 		},
 		{
 			label: 'walkUp',
 			frames: [12,13,14,15]
 		}
 	];

 	var that = this;
 	this.animationsConfig.forEach(function(animation) {
 		that.animations.add(
 			animation.label,
 			animation.frames
 		);
 	});

    // Physics Setup
    game.physics.arcade.enable(this, Phaser.Sprite.prototype);
    this.body.collideWorldBounds = true;
    this.body.checkCollision = true;
};

// Create Object with Parent Class Inheritance
Cat.prototype = Object.create(Animal.prototype);
Cat.prototype.constructor = Cat;

Cat.prototype.update = function() {
	// TODO: Neuronen müssen hier entscheiden welche Intentions dran kommen
	if (!this.isSleeping) {
		// Collect Sensor data
		this.see();
		this.hear();
		this.smell();
		// Evaluate what to do
		var intention = this.think();
		// DO IT!!!11
		this.execute(intention);
	} else {
		this.dream();
	}
		if (this.reactCooldown) {
		if (this.game.time.now - this.reactionTime > 3000) {
			this.emotionBubble.destroy();
			if (this.reactionTime > 5000) {
				this.reactCooldown = false;
				this.reactionTime = 0;
			}
		}
	}
};

// Not sure how to to right now .. this.registerReaction('food', this.reactToFood()) ?
// Finden Katzen mit ähnlichem Genen sich eher anziehend ? Wie wird "ähnlich" gemessen ?

Cat.prototype.reproduce = function() {
	console.log('Reproduziere');
  //  var cat = new Cat(this.game, this.game.rnd.realInRange(0, this.game.width-48), this.game.rnd.realInRange(0, this.game.height-48));
	console.log(cat);
}

Cat.prototype.react = function(object, type) {
//	if (!this.reactCooldown) {
		this.reactCooldown = true;
		switch (type) {
			case 'food':
		//	this.emotionBubble = this.game.make.sprite(18, -18, 'food');
			object.consume(this);
			break;
			case 'cat':
			// Reagiere auf Kollision mit Object x
			var rand = this.game.rnd.integerInRange(0,1);
		//	this.emotionBubble = (rand == 0 ? this.game.make.sprite(-18, -18, 'heartbubble') : this.game.make.sprite(-18, -18, 'heartbrokenbubble') );

			break;
		}
//		this.addChild(this.emotionBubble);
	//	this.reactionTime = this.game.time.now;
//	}
}

module.exports = Cat;
