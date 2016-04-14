(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

//global variables
window.onload = function () {
  var game = new Phaser.Game(800, 600, Phaser.AUTO, 'aicat');

  // Game States
  game.state.add('boot', require('./states/boot'));
  game.state.add('frog', require('./states/frog'));
  game.state.add('gameover', require('./states/gameover'));
  game.state.add('menu', require('./states/menu'));
  game.state.add('play', require('./states/play'));
  game.state.add('preload', require('./states/preload'));
  

  game.state.start('boot');
};
},{"./states/boot":9,"./states/frog":10,"./states/gameover":11,"./states/menu":12,"./states/play":13,"./states/preload":14}],2:[function(require,module,exports){
'use strict';
var synaptic = require('synaptic');

//////////////////// ANIMAL OBJECT CONFIGURATION ////////////////////
var Animal = function(game, x, y, frame, parents) {
 	Phaser.Sprite.call(this, game, x, y, frame);

//////////////////// ANIMAL NETWORK CONFIGURATION //////////////////
	// Gibt an in welcher Generation sich das Tier befindet
	if (parents !== undefined) {
//		this.genePool = parents.genePool;
		this.generation = parents.generation+1;
	} else {
		// Der Genpool beinhaltet die "Target"-Werte für die neuronalen Netzwerke und mutiert über die Generationen, initial random
/*		this.genePool = {
			movementGenes: [0,0,0,0],
			intentionGenes: [0,0,0,0],
			distanceGenes: [0,0,0,0,0]
		} */
		this.generation = 1;
	}

/*	var geneCount = 13,
		mutationCount = Math.ceil(geneCount*0.2),
		mutationPos = [],
		that = this;

	while (mutationPos.length < 3) {
		var pos = game.rnd.integerInRange(0, geneCount);
		if (_.indexOf(mutationPos, pos) == -1) {
			mutationPos.push(pos);
		}
	}
	console.log(mutationPos);

	var geneIdxCnt = 0;
		_.each(this.genePool, function(geneType) {
			for (var i=0; i<geneType.length; i++) {
				var rand = game.rnd.integerInRange(1,10);
				if (rand <= 2) {
					geneType[i] = Math.floor(Math.random(0,1)*100)/100;
				}
		//		if (mutationPos.indexOf(geneIdxCnt) != -1) {
		//		}
				geneIdxCnt++;
			}
		});
	console.log(this.genePool);
*/

/*
	if (this.generation == 1) {
		_.each(this.genePool, function(geneType) {
			for (var i=0; i<geneType.length; i++) {
				geneType[i] = game.rnd.integerInRange(0,1);
			}
		});
	} else {
		// Mutate GenePool somewhere
		
	}
*/

	if (!parents) {
		// Netzwerk zur Berechnung der Bewegung
		this.movementNetwork 	= new synaptic.Architect.Perceptron(4, 6, 4);
		// Netzwerk zur Berechnung der Intentionen
		this.intentionNetwork 	= new synaptic.Architect.Perceptron(3, 20, 15, 4);
		// Netzerk zur Berechnung des nahesten Ziels
		this.distanceNetwork	= new synaptic.Architect.LSTM(10,4,4,4,5);
	} else {
		// Netzwerk zur Berechnung der Bewegung
		this.movementNetwork 	= parents.movementNetwork.clone();
		// Netzwerk zur Berechnung der Intentionen
		this.intentionNetwork 	= parents.intentionNetwork.clone();
		// Netzerk zur Berechnung des nahesten Ziels
		this.distanceNetwork	= parents.distanceNetwork.clone();
	}
	
//////////////////// ANIMAL BASIC CONFIGURATION ////////////////////

 	// TODO: create unique ID for each object
 	this.objId = game.rnd.integerInRange(0,1000);
	// Lebenspunkte des Tiers
	this.fitness = 0;
	// Lebenspunkte des Tiers
	this.health = 100;
 	// Bedürfnisse des Tiers
	this.needs = {
		hunger: 	0, 	// [0-100] Niedrig ist besser - Bei 100 wird konstant Health abgezogen
		thirst: 	0, 	// [0-100] Niedrig ist besser - Ab 100 stirbt das Tier
		fatigue: 	0 	// [0-100] Niedrig ist besser - Ab 80 wird konstant Health abgezogen, bei 100 schläft das Tier direkt ein
	};
	// Sensoren des Tiers
	this.sensors = {
		eyes: [
			// Objects (Genaue Position, Type);
		],
		ears: [
			// Objects (Ungenaue Position, auch außerhalb FoV, Type);
		],
		nose: [
			// Objects (Ungenaue Position, auch außerhalb FoV, Type);
		]
	}
	// Erinnerung an bereits gesehene / interagierte Objekte
	this.memory 		= {};

	// Richtung in die das Tier schaut
	this.direction 		= false; // TODO: Some other way (USED BY CALCULATEFIELDOFVIEW)

	// Priorisierte Liste an Plänen die das Tier verfolgen möchte
	this.intentions 	= [];
	
	// Gibt an ob sich das Objekt in diesem Moment innerhalb einer Bewegung befindet
	this.isMoving		= false;  
	// Gibt an ob das Tier aktuell schläft
	this.isSleeping 	= false;
	// Gibt an ob das Tier gestorben ist
	this.isDead 		= false;

	// Vorrübergehend, damit Bubbles nicht gespamt werden
	this.reactCooldown = false;

//////////////////// ANIMAL DEBUG VARS CONFIGURATION ///////////////

	// Count sucessesful decisions in intentionsNetwork
	this.successRate = {
		good: 0, 
		bad: 0
	};


//////////////////// ANIMAL TIMER FUNCTIONS ////////////////////////
///// ACHTUNG, FUNKTIONSAUFRUFE NACH VARIABLENDEKLARATIONEN !! /////

	this.timer = [];

	var hungerTimer  = game.time.events.loop(1000, this.updateHunger, this),
		thirstTimer  = game.time.events.loop(1000, this.updateThirst, this),
		fatigueTimer = game.time.events.loop(1000, this.updateFatigue, this);

    this.timer = [hungerTimer, thirstTimer, fatigueTimer];

};

Animal.prototype = Object.create(Phaser.Sprite.prototype);
Animal.prototype.constructor = Animal;


//////////////////// ANIMAL PRIVATE FUNCTIONS //////////////////////

// Berechnet das Feld, welches in jedem Moment von dem Tier gesehen wird
function calculateFieldOfView(source) {
	var visibilitySquare = {};

	// Rechteck berechnen, dass für die Katze abhängig von Sichtrichtung sichtbar ist
	switch(source.direction) {
		
		case 1: // Left
			visibilitySquare.x = 0;
			visibilitySquare.y = 0;
			visibilitySquare.width = source.x;
			visibilitySquare.height = source.game.height;
		break;

		case 2: // Right
			visibilitySquare.x = source.x;
			visibilitySquare.y = 0;
			visibilitySquare.width = source.game.width - source.x;
			visibilitySquare.height = source.game.height;
		break;

		case 3: // Up
			visibilitySquare.x = 0;
			visibilitySquare.y = 0;
			visibilitySquare.width = source.game.width;
			visibilitySquare.height = source.y;
		break;

		case 4: // Down
			visibilitySquare.x = 0;
			visibilitySquare.y = source.y;
			visibilitySquare.width = source.game.width;
			visibilitySquare.height = source.game.height - source.y;
		break;

		default: // Fallback: See everything
			visibilitySquare.x = 0;
			visibilitySquare.y = source.game.height;
			visibilitySquare.width = source.game.width;
			visibilitySquare.height = source.game.height;
		break;
	}

	return visibilitySquare;
}

//  Collect Inputs -> Activate Network -> Calculate Target -> Learn -> return Output
function evaluateIntentionNetwork(source) {
	var input = [];

	input.push(source.needs.hunger/10);
	input.push(source.needs.thirst/10);
	input.push(source.needs.fatigue/10);

	var output = source.intentionNetwork.activate(input),
		intention = output.indexOf(Math.max.apply(Math, output))+1,
		target = [0,0,0,0];

	if (source.needs.hunger > source.needs.fatigue) {
		target = [1,0,0,0];
	} else {
		target = [0,0,1,0];
	}

	source.intentionNetwork.propagate(0.3, target);

	return intention;
}

function evaluateMovementNetwork(source, target) {
	var input = [];

	input.push(source.x/source.game.width);
	input.push(source.y/source.game.height);
	input.push(target.x/source.game.width);
	input.push(target.y/source.game.height);

	var output = source.movementNetwork.activate(input);

	// Acutal learning part
	var learningRate = 0.3;
	var learningDirection = calculateViewingDirection(source, target);
	source.movementNetwork.propagate(learningRate, learningDirection);

	return output.indexOf(Math.max.apply(Math, output))+1;
}

function evaluateDistanceNetwork(objects, targetIndex) {
	var input = [],
		target = [];

	for (var i = 0; i<10; i++) {
		if (objects[i]) {
			input.push(objects[i].x/source.game.width);
			input.push(objects[i].y/source.game.height);
		} else {
			input.push(0);
			input.push(0);
		}
		if (targetIndex == i) {
			target.push(1);
		} else {
			target.push(0);
		}
	}

	var output = source.distanceNetwork.activate(input);

	// Acutal learning part
	var learningRate = 0.3;
	var learningDirection = calculateViewingDirection(source, target);
	source.movementNetwork.propagate(learningRate, learningDirection);

	return output.indexOf(Math.max.apply(Math, output))+1;
}

// Berechnet abhängig vom Ziel des Objekts in welche Richtung es gerade sieht
function calculateViewingDirection(source, target) {
	var viewingDirection 	= [0,0,0,0], // Fallback, falls aus Gründen etwas nicht funktioniert
		distanceX 			= Phaser.Math.distance(source.x , 0 , target.x , 0),
		distanceY 			= Phaser.Math.distance(0 , source.y , 0 , target.y);


	if (distanceX >= distanceY) {
		if (target.x < source.x) {
			viewingDirection[0] = 1; // Left
		} else if (target.x > source.x) {
			viewingDirection[1] = 1; // Right
		}
	} else {
		if (target.y < source.y) {
			viewingDirection[2] = 1; // Up
		} else if (target.y > source.y) {
			viewingDirection[3] = 1; // Down
		}
	}
	return viewingDirection;
}


//////////////////// ANIMAL TIMER FUNCTIONS ////////////////////////

Animal.prototype.updateHunger = function() {
	this.fitness++;
	if (this.needs.hunger < 100) {
		this.needs.hunger += 10;
	} else {
		if (this.health <= 0) {
			this.die();
		} else {
			this.health-=30;
		}
	}
	// if (this.health <= 0) this.die(); 
}

Animal.prototype.updateThirst = function() {
	if (this.needs.thirst < 100) {
		this.needs.thirst += 10;
	} else {
	//	this.health--;
	}
//	if (this.health <= 0) this.die(); 
}

Animal.prototype.updateFatigue = function() {
	if ( !this.isSleeping ) {
		if (this.needs.fatigue < 100) {
			this.needs.fatigue += 10;
		} else {
			this.health--;
		}
	} else {
		this.needs.fatigue -= 20;
		if (this.needs.fatigue <= 0) {
			this.needs.fatigue = 0;
			this.isSleeping = false;
		}
	}
//	if (this.health <= 0) this.die(); 
}


//////////////////// ANIMAL BASIC FUNCTIONS ////////////////////////

// "Sehen"-Grundfunktion
Animal.prototype.see = function() {
	var fieldOfViewCoords = calculateFieldOfView(this),
		that = this,
		childrenInFieldOfView = [];

	this.fov = new Phaser.Rectangle(fieldOfViewCoords.x, fieldOfViewCoords.y, fieldOfViewCoords.width, fieldOfViewCoords.height);
	
	this.game.world.forEach(function(child) {
		// Iterate over group
		if (child.name == "group" ) {
			child.children.forEach( function(subChild) {
				childrenInFieldOfView.push(subChild);
			});
		} else {
			childrenInFieldOfView.push(child);
		}
	});
//console.log(that.sensors);
					that.sensors.eyes = [];
	childrenInFieldOfView.forEach( function(child) {
		if (child.x && child.y) {
			if (that.fov.contains(child.x, child.y)) {
				if (child.objId != that.objId) {
					that.sensors.eyes.push(child);
				}
			}
		}
	});
}

// "Erinnern"-Grundfunktion
Animal.prototype.memorize = function(target) {
	this.memory[target.key] = new Array;
	this.memory[target.key].push( {
		id 		: target.objId,
		opinion	: 0
	});

}

// "Denken"-Grundfunktion
Animal.prototype.think = function() {
	var intention = evaluateIntentionNetwork(this),
		that = this;
	// Replace with dynamic thingy
	switch (intention) {
		case 1: // Eat
			var objectType = 'pizza';
			this.find(objectType, function(target) {
				that.move(target);
			});
		break;

		case 2: // Drink

		break;

		case 3: // Sleep
			this.isSleeping = true;
		break;

		case 4: // Idle
	//	this.move({x: this.game.rnd.integerInRange(0,100), y: this.game.rnd.integerInRange(0,100)});

		break;

		default: // Fallback
	//	this.move({x: this.game.rnd.integerInRange(0,100), y: this.game.rnd.integerInRange(0,100)});

		break;
	}
	return intention;
}

// "Hören"-Grundfunktion
Animal.prototype.hear = function() {}

// "Hören"-Grundfunktion
Animal.prototype.smell = function() {}

// "Schlafen"-Grundfunktion
Animal.prototype.sleep = function() {}

// "Finden"-Grundfunktion
Animal.prototype.find = function(objectType, callback) {
	// TODO: "Remember" wenn kurzzeitig nicht mehr in Sichtfeld ?
	// distanceNetwork ? Combine with movementNetwork ?
	var target = false,
		distance = false,
		that = this;
	
	_.each(this.sensors, function(sensor) {
		_.each(sensor, function(object) {
			if (object.key == objectType) {
				var tempDistance = Phaser.Math.distance(object.x , object.y , that.x , that.y);
				if (!target || tempDistance < distance) {
					target = object;
					distance = tempDistance;
				}
			}
		});
	});

	if (target) {
		callback(target);
	} else {
		// Wie auch immer
		this.move({x: this.game.rnd.integerInRange(0,100), y: this.game.rnd.integerInRange(0,100)});
	}
}

// Temp while in Development
Animal.prototype.findInNetwork = function(objectType, callback) {
	// TODO: "Remember" wenn kurzzeitig nicht mehr in Sichtfeld ?
	// distanceNetwork ? Combine with movementNetwork ?
	var objects = false,
		targetIndex = false,
		distance = false,
		that = this,
		i = 0;
	
	_.each(this.sensors, function(sensor) {
		_.each(sensor, function(object) {
			if (object.key == objectType) {
				objects.push(object);
				var tempDistance = Phaser.Math.distance(object.x , object.y , that.x , that.y);
				if (!distance || tempDistance < distance) {
					targetIndex = i;
					distance = tempDistance;
				}
			}
			i++;
		});
	});

	var output = evaluateDistanceNetwork(objects, targetIndex);

	if (objects[output]) {
		callback(objects[output]);
	} else {
		this.move({x: this.game.rnd.integerInRange(0,100), y: this.game.rnd.integerInRange(0,100)});	
	}
}

// "Essen"-Grundfunktion
Animal.prototype.eat = function(target) {
	target.consume();
//	this.intentions.splice();
}

// "Denken"-Grundfunktion
Animal.prototype.dream = function() {
	return true;
}

// "Handeln"-Grundfunktion
Animal.prototype.execute = function(intention) {
	return;
}

// Prüft anhand einer Logik ob das Tier Hunger verspürt
Animal.prototype.isHungry = function() {
	return this.hunger <= 50 ? true : false;
}

// Gibt zurück ob das Tier gerade schläft
Animal.prototype.isSleeping = function() {
	return this.isSleeping;
}

// "Reproduzieren"-Grundfunktion
Animal.prototype.reproduce = function(target) {
}

// "Bewegen"-Grundfunktion
Animal.prototype.move = function(target) {
	if (!this.isMoving) {
		this.isMoving = true;

		var distance = this.game.rnd.integerInRange(30, 50),
			targetX  = this.x,
			targetY  = this.y;

		this.direction = evaluateMovementNetwork(this, target);

		// save for visibility Calculation
		switch(this.direction) {
			case 1:
				targetX -= distance;
				this.animations.play('walkLeft', 8, true);
			break;

			case 2:
				targetX += distance;
				this.animations.play('walkRight', 8, true);
			break;

			case 3:
				targetY -= distance;
				this.animations.play('walkUp', 8, true);
			break;

			case 4:
				targetY += distance;
				this.animations.play('walkDown', 8, true);
			break;
		}

		// Abstand zu den Rändern
		if (targetX <= 0) targetX = 0;
		if (targetX >= this.game.width-48) targetX = this.game.width-48;
		if (targetY <= 0) targetY = 0;
		if (targetY >= this.game.height-48) targetY = this.game.height-48;

		var tween = this.game.add.tween(this).to({
				x: targetX, 
				y: targetY
			}, 300),
			sprite = this,
			that = this;

		tween.onComplete.add(function() {
			sprite.isMoving = false;
			sprite.animations.stop();
		});

		tween.start();
	}
}

// "Sterben"-Grundfunktion
Animal.prototype.die = function() {
	for (var i=0; i<this.timer.length; i++) {
		this.timer[i].pendingDelete = true;
		this.game.time.events.remove(this.timer[i]);
	}
	this.movementNetworkJson = this.movementNetwork.toJSON();
	this.distanceNetworkJson = this.distanceNetwork.toJSON();
	this.intentionNetworkJson = this.intentionNetwork.toJSON();
	this.isDead = true;
	this.kill();
	//this.reproduce();
	//this.destroy();
}


module.exports = Animal;


},{"synaptic":78}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{"../prefabs/animal":2}],5:[function(require,module,exports){
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

},{"../prefabs/animal":2}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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
},{"../prefabs/food":6}],9:[function(require,module,exports){

'use strict';

function Boot() {
}

Boot.prototype = {
  preload: function() {
    this.load.image('preloader', 'assets/preloader.gif');
  },
  create: function() {
    this.game.input.maxPointers = 1;
    this.game.state.start('preload');
  }
};

module.exports = Boot;

},{}],10:[function(require,module,exports){
  'use strict';
  var Car   = require('../prefabs/car');
  var Frogger   = require('../prefabs/frog');

  function Frog() {}
  Frog.prototype = {
    // Objektmengen
    carGroup: null,
    frogGroup: null,
    carMaxAmount: 3,
    carCurrentAmount: 0,

    create: function() {
      this.game.physics.startSystem(Phaser.Physics.ARCADE);
      this.game.stage.backgroundColor = 0x777777;


      this.carGroup = this.game.add.group();
      this.frogGroup = this.game.add.group();
    //  this.populateCars(this.carAmount);

    },
    populateCars: function(amount, parents) {
      if ( amount > 0 ) {
        for (var i=0; i<amount; i++) {
          var car = new Car(this.game, this.game.width, this.game.rnd.realInRange(0, this.game.height-148));
          this.carGroup.add(car);
        }
      }
    },
    populateFrogs: function(amount, parents) {
      if ( amount > 0 ) {
        for (var i=0; i<amount; i++) {
          var frog = new Frogger(this.game, this.game.rnd.realInRange(0, this.game.width-48), this.game.height-48);
          this.frogGroup.add(frog);
        }
      }
    },
    update: function() {
      var rnd = this.game.rnd.integerInRange(1,100);
      if (rnd == 50 && this.carCurrentAmount < this.carMaxAmount) {
        this.populateCars(1,null);
        console.log('spawned');
      }
      var deadCat = null;
                deadCat = this.frogGroup.getFirstDead();
      if (deadCat) { deadCat.destroy()}
      if (this.frogGroup.total <= 0) {
        this.populateFrogs(1,null);
      }
      this.game.physics.arcade.overlap(this.carGroup, this.frogGroup, this.collisionProxy, this.checkCollision, this);

    },
    checkCollision: function(a, b) {
      return a != b;
    },
    collisionProxy: function(cat, object) {
      object.kill();
   //  cat.destroy();
    },

    clickListener: function() {
      this.game.state.start('gameover');
    }
  };
  
  module.exports = Frog;
},{"../prefabs/car":3,"../prefabs/frog":7}],11:[function(require,module,exports){

'use strict';
function GameOver() {}

GameOver.prototype = {
  preload: function () {

  },
  create: function () {
    var style = { font: '65px Arial', fill: '#ffffff', align: 'center'};
    this.titleText = this.game.add.text(this.game.world.centerX,100, 'Game Over!', style);
    this.titleText.anchor.setTo(0.5, 0.5);

    this.congratsText = this.game.add.text(this.game.world.centerX, 200, 'You !!!!', { font: '32px Arial', fill: '#ffffff', align: 'center'});
    this.congratsText.anchor.setTo(0.5, 0.5);

    this.instructionText = this.game.add.text(this.game.world.centerX, 300, 'Click To Play Again', { font: '16px Arial', fill: '#ffffff', align: 'center'});
    this.instructionText.anchor.setTo(0.5, 0.5);
  },
  update: function () {
    if(this.game.input.activePointer.justPressed()) {
      this.game.state.start('play');
    }
  }
};
module.exports = GameOver;

},{}],12:[function(require,module,exports){

'use strict';
function Menu() {}

Menu.prototype = {
  preload: function() {

  },
  create: function() {
    var style = { font: '65px Arial', fill: '#ffffff', align: 'center'};
    this.sprite = this.game.add.sprite(this.game.world.centerX, 138, 'yeoman');
    this.sprite.anchor.setTo(0.5, 0.5);

    this.titleText = this.game.add.text(this.game.world.centerX, 300, '\'Allo, \'Allo!', style);
    this.titleText.anchor.setTo(0.5, 0.5);

    this.instructionsText = this.game.add.text(this.game.world.centerX, 400, 'Click anywhere to play "Click The Yeoman Logo"', { font: '16px Arial', fill: '#ffffff', align: 'center'});
    this.instructionsText.anchor.setTo(0.5, 0.5);

    this.sprite.angle = -20;
    this.game.add.tween(this.sprite).to({angle: 20}, 1000, Phaser.Easing.Linear.NONE, true, 0, 1000, true);
  },
  update: function() {
    if(this.game.input.activePointer.justPressed()) {
      this.game.state.start('play');
    //  this.game.state.start('play');
    }
  }
};

module.exports = Menu;

},{}],13:[function(require,module,exports){
  'use strict';
  var Pizza = require('../prefabs/pizza');
  var Cat   = require('../prefabs/cat');
  var Dog   = require('../prefabs/dog');
  var db    = require('arangojs')();

  function Play() {}
  Play.prototype = {
    // Objektgruppen
    catGroup: null,
    dogGroup: null,
    foodGroup: null,

    // Objektmengen
    catAmount: 10,
    highestFitness: 0,
    dogAmount: 0,
    foodAmount: 10,

    create: function() {
      this.game.physics.startSystem(Phaser.Physics.ARCADE);
      this.game.stage.backgroundColor = 0x777777;

      this.game.graveyard = [];

      this.survivor = null;
      this.topFitness = '';
      this.catGroup = this.game.add.group();
      this.dogGroup = this.game.add.group();
      this.foodGroup = this.game.add.group();
      this.populateCats(this.catAmount);
      /*
      this.populateFood(1);
      this.populateDogs(0);
      */

    },
    populateCats: function(amount, parent) {
      if ( amount > 0 ) {
        for (var i=0; i<amount; i++) {
          var cat = new Cat(this.game, this.game.rnd.realInRange(0, this.game.width-48), this.game.rnd.realInRange(0, this.game.height-48), parent);
          this.catGroup.add(cat);
        }
      }
    },
    populateDogs: function(amount) {
      if ( amount > 0 ) {
        for (var i=0; i<amount; i++) {
          var dog = new Dog(this.game, this.game.rnd.realInRange(0, this.game.width-48), this.game.rnd.realInRange(0, this.game.height-48));
          this.dogGroup.add(dog);
        }
      }
    },
    populateFood: function(amount) {
      if ( amount > 0 ) {
        for (var i=0; i<amount; i++) {
          var food = new Pizza(this.game, this.game.rnd.realInRange(0, this.game.width-48), this.game.rnd.realInRange(0, this.game.height-48));
          this.foodGroup.add(food);
        }
      }
    },
    update: function() {

    /*  for (var i=0; i<this.game.graveyard.length; i++) {
        this.game.graveyard[i].destroy();
      } */
      this.game.physics.arcade.overlap(this.catGroup, this.catGroup, this.collisionProxy, this.checkCollision, this);
      this.game.physics.arcade.overlap(this.catGroup, this.foodGroup, this.collisionProxy, this.checkCollision, this);

      // Refill Objects if < Amount
      if (this.foodAmount > this.foodGroup.total) {
          this.populateFood(this.foodAmount - this.foodGroup.total);
      }
      var that = this,
          deadCat = this.catGroup.getFirstDead();
      if (deadCat) {
        if (deadCat.fitness > this.highestFitness) {
          this.highestFitness = deadCat.fitness;
        }
        if (!this.survivor || deadCat.fitness >= this.survivor.fitness) {
          this.survivor = deadCat;

        }
        deadCat.destroy();
      }
      if (this.catGroup.total <= 0) {
        console.log('Fitness-Max'+this.highestFitness);
        this.populateCats(10, this.survivor);
      }
      if (this.dogAmount > this.dogGroup.total) {
          this.populateDogs(dthis.ogAmount - this.dogGroup.total);
      }
    },
    checkCollision: function(a, b) {
      return a != b;
    },
    collisionProxy: function(cat, object) {
      if (object instanceof Pizza) {
        var type = 'food';
      } else {
        var type = 'cat';
      }
      cat.react(object, type);
    },

    clickListener: function() {
      this.game.state.start('gameover');
    }
  };
  
  module.exports = Play;
},{"../prefabs/cat":4,"../prefabs/dog":5,"../prefabs/pizza":8,"arangojs":22}],14:[function(require,module,exports){

'use strict';
function Preload() {
  this.asset = null;
  this.ready = false;
}

Preload.prototype = {
  preload: function() {
    this.asset = this.add.sprite(this.width/2,this.height/2, 'preloader');
    this.asset.anchor.setTo(0.5, 0.5);

    this.load.onLoadComplete.addOnce(this.onLoadComplete, this);
    this.load.setPreloadSprite(this.asset);

    // Images
    this.load.image('yeoman', 'assets/yeoman-logo.png');
    this.load.image('heartbubble', 'assets/heartbubble.png');
    this.load.image('heartbrokenbubble', 'assets/heartbrokenbubble.png');
    this.load.image('pizza', 'assets/food/pizza.gif');
    this.load.image('food', 'assets/food.png');

    // Sprites
    this.load.spritesheet('cat', 'assets/sprites/cat_medium.png', 48, 48, 16);
    this.load.spritesheet('dog', 'assets/sprites/dog.png', 64, 64, 32);


  },
  create: function() {
    this.asset.cropEnabled = false;
  },
  update: function() {
    if(!!this.ready) {
      this.game.state.start('menu');
    }
  },
  onLoadComplete: function() {
    this.ready = true;
  }
};

module.exports = Preload;

},{}],15:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = aqlQuery;

var _collection = require('./collection');

function aqlQuery(strings) {
  var bindVars = {};
  var query = strings[0];

  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  for (var i = 0; i < args.length; i++) {
    var value = args[i];
    var _name = 'value' + i;
    if (value instanceof _collection._BaseCollection || value && value.constructor && value.constructor.name === 'ArangoCollection') {
      _name = '@' + _name;
      value = typeof value.name === 'function' ? value.name() : value.name;
    }
    bindVars[_name] = value;
    query += '@' + _name + strings[i + 1];
  }
  return { query: query, bindVars: bindVars };
}

module.exports = exports['default'];
},{"./collection":16}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _get2 = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports['default'] = construct;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _cursor = require('./cursor');

var _cursor2 = _interopRequireDefault(_cursor);

var types = {
  DOCUMENT_COLLECTION: 2,
  EDGE_COLLECTION: 3
};

exports.types = types;

var BaseCollection = (function () {
  function BaseCollection(connection, name) {
    _classCallCheck(this, BaseCollection);

    this.name = name;
    this._connection = connection;
    this._api = this._connection.route('_api');
  }

  _createClass(BaseCollection, [{
    key: '_documentHandle',
    value: function _documentHandle(documentHandle) {
      if (documentHandle._id) {
        documentHandle = documentHandle._id;
      } else if (documentHandle._key) {
        documentHandle = documentHandle._key;
      }
      if (documentHandle.indexOf('/') === -1) {
        documentHandle = this.name + '/' + documentHandle;
      }
      return documentHandle;
    }
  }, {
    key: '_indexHandle',
    value: function _indexHandle(indexHandle) {
      if (indexHandle.id) {
        indexHandle = indexHandle.id;
      }
      if (indexHandle.indexOf('/') === -1) {
        indexHandle = this.name + '/' + indexHandle;
      }
      return indexHandle;
    }
  }, {
    key: '_get',
    value: function _get(path, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      this._api.get('collection/' + this.name + '/' + path, opts, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: '_put',
    value: function _put(path, data, cb) {
      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      this._api.put('collection/' + this.name + '/' + path, data, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'get',
    value: function get(cb) {
      var _connection$promisify3 = this._connection.promisify(cb);

      var promise = _connection$promisify3.promise;
      var callback = _connection$promisify3.callback;

      this._api.get('collection/' + this.name, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'create',
    value: function create(properties, cb) {
      if (typeof properties === 'function') {
        cb = properties;
        properties = undefined;
      }

      var _connection$promisify4 = this._connection.promisify(cb);

      var promise = _connection$promisify4.promise;
      var callback = _connection$promisify4.callback;

      this._api.post('collection', _extends({}, properties, { name: this.name, type: this.type }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'properties',
    value: function properties(cb) {
      return this._get('properties', cb);
    }
  }, {
    key: 'count',
    value: function count(cb) {
      return this._get('count', cb);
    }
  }, {
    key: 'figures',
    value: function figures(cb) {
      return this._get('figures', cb);
    }
  }, {
    key: 'revision',
    value: function revision(cb) {
      return this._get('revision', cb);
    }
  }, {
    key: 'checksum',
    value: function checksum(opts, cb) {
      return this._get('checksum', opts, cb);
    }
  }, {
    key: 'load',
    value: function load(count, cb) {
      if (typeof count === 'function') {
        cb = count;
        count = undefined;
      }
      return this._put('load', typeof count === 'boolean' ? { count: count } : undefined, cb);
    }
  }, {
    key: 'unload',
    value: function unload(cb) {
      return this._put('unload', undefined, cb);
    }
  }, {
    key: 'setProperties',
    value: function setProperties(properties, cb) {
      return this._put('properties', properties, cb);
    }
  }, {
    key: 'rename',
    value: function rename(name, cb) {
      var _this = this;

      var _connection$promisify5 = this._connection.promisify(cb);

      var promise = _connection$promisify5.promise;
      var callback = _connection$promisify5.callback;

      this._api.put('collection/' + this.name + '/rename', { name: name }, function (err, res) {
        if (err) callback(err);else {
          _this.name = name;
          callback(null, res.body);
        }
      });
      return promise;
    }
  }, {
    key: 'rotate',
    value: function rotate(cb) {
      return this._put('rotate', undefined, cb);
    }
  }, {
    key: 'truncate',
    value: function truncate(cb) {
      return this._put('truncate', undefined, cb);
    }
  }, {
    key: 'drop',
    value: function drop(cb) {
      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      this._api['delete']('collection/' + this.name, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'replace',
    value: function replace(documentHandle, newValue, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      this._api.put(this._documentPath(documentHandle), newValue, _extends({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'update',
    value: function update(documentHandle, newValue, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      this._api.patch(this._documentPath(documentHandle), newValue, _extends({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'remove',
    value: function remove(documentHandle, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify9 = this._connection.promisify(cb);

      var promise = _connection$promisify9.promise;
      var callback = _connection$promisify9.callback;

      this._api['delete'](this._documentPath(documentHandle), _extends({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'list',
    value: function list(type, cb) {
      if (typeof type === 'function') {
        cb = type;
        type = undefined;
      }
      if (!type) type = 'id';

      var _connection$promisify10 = this._connection.promisify(cb);

      var promise = _connection$promisify10.promise;
      var callback = _connection$promisify10.callback;

      this._api.get('document', { type: type, collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.documents);
      });
      return promise;
    }
  }, {
    key: 'all',
    value: function all(opts, cb) {
      var _this2 = this;

      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify11 = this._connection.promisify(cb);

      var promise = _connection$promisify11.promise;
      var callback = _connection$promisify11.callback;

      this._api.put('simple/all', _extends({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, new _cursor2['default'](_this2._connection, res.body));
      });
      return promise;
    }
  }, {
    key: 'any',
    value: function any(cb) {
      var _connection$promisify12 = this._connection.promisify(cb);

      var promise = _connection$promisify12.promise;
      var callback = _connection$promisify12.callback;

      this._api.put('simple/any', { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.document);
      });
      return promise;
    }
  }, {
    key: 'first',
    value: function first(opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof opts === 'number') {
        opts = { count: opts };
      }

      var _connection$promisify13 = this._connection.promisify(cb);

      var promise = _connection$promisify13.promise;
      var callback = _connection$promisify13.callback;

      this._api.put('simple/first', _extends({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'last',
    value: function last(opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof opts === 'number') {
        opts = { count: opts };
      }

      var _connection$promisify14 = this._connection.promisify(cb);

      var promise = _connection$promisify14.promise;
      var callback = _connection$promisify14.callback;

      this._api.put('simple/last', _extends({}, opts, { collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'byExample',
    value: function byExample(example, opts, cb) {
      var _this3 = this;

      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify15 = this._connection.promisify(cb);

      var promise = _connection$promisify15.promise;
      var callback = _connection$promisify15.callback;

      this._api.put('simple/by-example', _extends({}, opts, { example: example, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, new _cursor2['default'](_this3._connection, res.body));
      });
      return promise;
    }
  }, {
    key: 'firstExample',
    value: function firstExample(example, cb) {
      var _connection$promisify16 = this._connection.promisify(cb);

      var promise = _connection$promisify16.promise;
      var callback = _connection$promisify16.callback;

      this._api.put('simple/first-example', { example: example, collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.document);
      });
      return promise;
    }
  }, {
    key: 'removeByExample',
    value: function removeByExample(example, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify17 = this._connection.promisify(cb);

      var promise = _connection$promisify17.promise;
      var callback = _connection$promisify17.callback;

      this._api.put('simple/remove-by-example', _extends({}, opts, { example: example, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'replaceByExample',
    value: function replaceByExample(example, newValue, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify18 = this._connection.promisify(cb);

      var promise = _connection$promisify18.promise;
      var callback = _connection$promisify18.callback;

      this._api.put('simple/replace-by-example', _extends({}, opts, { example: example, newValue: newValue, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'updateByExample',
    value: function updateByExample(example, newValue, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify19 = this._connection.promisify(cb);

      var promise = _connection$promisify19.promise;
      var callback = _connection$promisify19.callback;

      this._api.put('simple/update-by-example', _extends({}, opts, { example: example, newValue: newValue, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'lookupByKeys',
    value: function lookupByKeys(keys, cb) {
      var _connection$promisify20 = this._connection.promisify(cb);

      var promise = _connection$promisify20.promise;
      var callback = _connection$promisify20.callback;

      this._api.put('simple/lookup-by-keys', { keys: keys, collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.documents);
      });
      return promise;
    }
  }, {
    key: 'removeByKeys',
    value: function removeByKeys(keys, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify21 = this._connection.promisify(cb);

      var promise = _connection$promisify21.promise;
      var callback = _connection$promisify21.callback;

      this._api.put('simple/remove-by-keys', _extends({}, opts, { keys: keys, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'import',
    value: function _import(data, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify22 = this._connection.promisify(cb);

      var promise = _connection$promisify22.promise;
      var callback = _connection$promisify22.callback;

      this._api.request({
        method: 'POST',
        path: 'import',
        body: data,
        ld: Boolean(!opts || opts.type !== 'array'),
        qs: _extends({ type: 'auto' }, opts, { collection: this.name })
      }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'indexes',
    value: function indexes(cb) {
      var _connection$promisify23 = this._connection.promisify(cb);

      var promise = _connection$promisify23.promise;
      var callback = _connection$promisify23.callback;

      this._api.get('index', { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.indexes);
      });
      return promise;
    }
  }, {
    key: 'index',
    value: function index(indexHandle, cb) {
      var _connection$promisify24 = this._connection.promisify(cb);

      var promise = _connection$promisify24.promise;
      var callback = _connection$promisify24.callback;

      this._api.get('index/' + this._indexHandle(indexHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createIndex',
    value: function createIndex(details, cb) {
      var _connection$promisify25 = this._connection.promisify(cb);

      var promise = _connection$promisify25.promise;
      var callback = _connection$promisify25.callback;

      this._api.post('index', details, { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'dropIndex',
    value: function dropIndex(indexHandle, cb) {
      var _connection$promisify26 = this._connection.promisify(cb);

      var promise = _connection$promisify26.promise;
      var callback = _connection$promisify26.callback;

      this._api['delete']('index/' + this._indexHandle(indexHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createCapConstraint',
    value: function createCapConstraint(size, cb) {
      if (typeof size === 'number') {
        size = { size: size };
      }

      var _connection$promisify27 = this._connection.promisify(cb);

      var promise = _connection$promisify27.promise;
      var callback = _connection$promisify27.callback;

      this._api.post('index', _extends({}, size, { type: 'cap' }), { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createHashIndex',
    value: function createHashIndex(fields, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof fields === 'string') {
        fields = [fields];
      }
      if (typeof opts === 'boolean') {
        opts = { unique: opts };
      }

      var _connection$promisify28 = this._connection.promisify(cb);

      var promise = _connection$promisify28.promise;
      var callback = _connection$promisify28.callback;

      this._api.post('index', _extends({ unique: false }, opts, { type: 'hash', fields: fields }), { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createSkipList',
    value: function createSkipList(fields, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof fields === 'string') {
        fields = [fields];
      }
      if (typeof opts === 'boolean') {
        opts = { unique: opts };
      }

      var _connection$promisify29 = this._connection.promisify(cb);

      var promise = _connection$promisify29.promise;
      var callback = _connection$promisify29.callback;

      this._api.post('index', _extends({ unique: false }, opts, { type: 'skiplist', fields: fields }), { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createGeoIndex',
    value: function createGeoIndex(fields, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof fields === 'string') {
        fields = [fields];
      }

      var _connection$promisify30 = this._connection.promisify(cb);

      var promise = _connection$promisify30.promise;
      var callback = _connection$promisify30.callback;

      this._api.post('index', _extends({}, opts, { fields: fields, type: 'geo' }), { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createFulltextIndex',
    value: function createFulltextIndex(fields, minLength, cb) {
      if (typeof minLength === 'function') {
        cb = minLength;
        minLength = undefined;
      }
      if (typeof fields === 'string') {
        fields = [fields];
      }
      if (minLength) minLength = Number(minLength);

      var _connection$promisify31 = this._connection.promisify(cb);

      var promise = _connection$promisify31.promise;
      var callback = _connection$promisify31.callback;

      this._api.post('index', { fields: fields, minLength: minLength, type: 'fulltext' }, { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'fulltext',
    value: function fulltext(attribute, query, opts, cb) {
      var _this4 = this;

      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (!opts) opts = {};
      if (opts.index) opts.index = this._indexHandle(opts.index);

      var _connection$promisify32 = this._connection.promisify(cb);

      var promise = _connection$promisify32.promise;
      var callback = _connection$promisify32.callback;

      this._api.put('simple/fulltext', _extends({}, opts, { attribute: attribute, query: query, collection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, new _cursor2['default'](_this4._connection, res.body));
      });
      return promise;
    }
  }]);

  return BaseCollection;
})();

var DocumentCollection = (function (_BaseCollection) {
  _inherits(DocumentCollection, _BaseCollection);

  function DocumentCollection() {
    _classCallCheck(this, DocumentCollection);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _get2(Object.getPrototypeOf(DocumentCollection.prototype), 'constructor', this).apply(this, args);
    this.type = types.DOCUMENT_COLLECTION;
  }

  _createClass(DocumentCollection, [{
    key: '_documentPath',
    value: function _documentPath(documentHandle) {
      return 'document/' + this._documentHandle(documentHandle);
    }
  }, {
    key: 'document',
    value: function document(documentHandle, cb) {
      var _connection$promisify33 = this._connection.promisify(cb);

      var promise = _connection$promisify33.promise;
      var callback = _connection$promisify33.callback;

      this._api.get('document/' + this._documentHandle(documentHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'save',
    value: function save(data, cb) {
      var _connection$promisify34 = this._connection.promisify(cb);

      var promise = _connection$promisify34.promise;
      var callback = _connection$promisify34.callback;

      this._api.post('document', data, { collection: this.name }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }]);

  return DocumentCollection;
})(BaseCollection);

var EdgeCollection = (function (_BaseCollection2) {
  _inherits(EdgeCollection, _BaseCollection2);

  function EdgeCollection() {
    _classCallCheck(this, EdgeCollection);

    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    _get2(Object.getPrototypeOf(EdgeCollection.prototype), 'constructor', this).apply(this, args);
    this.type = types.EDGE_COLLECTION;
  }

  _createClass(EdgeCollection, [{
    key: '_documentPath',
    value: function _documentPath(documentHandle) {
      return 'edge/' + this._documentHandle(documentHandle);
    }
  }, {
    key: 'edge',
    value: function edge(documentHandle, cb) {
      var _connection$promisify35 = this._connection.promisify(cb);

      var promise = _connection$promisify35.promise;
      var callback = _connection$promisify35.callback;

      this._api.get('edge/' + this._documentHandle(documentHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'save',
    value: function save(data, fromId, toId, cb) {
      if (typeof fromId === 'function') {
        cb = fromId;
        fromId = undefined;
      } else if (fromId) {
        data._from = this._documentHandle(fromId);
        data._to = this._documentHandle(toId);
      }

      var _connection$promisify36 = this._connection.promisify(cb);

      var promise = _connection$promisify36.promise;
      var callback = _connection$promisify36.callback;

      this._api.post('edge', data, {
        collection: this.name,
        from: data._from,
        to: data._to
      }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: '_edges',
    value: function _edges(documentHandle, direction, cb) {
      var _connection$promisify37 = this._connection.promisify(cb);

      var promise = _connection$promisify37.promise;
      var callback = _connection$promisify37.callback;

      this._api.get('edges/' + this.name, { direction: direction, vertex: this._documentHandle(documentHandle) }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.edges);
      });
      return promise;
    }
  }, {
    key: 'edges',
    value: function edges(vertex, cb) {
      return this._edges(vertex, undefined, cb);
    }
  }, {
    key: 'inEdges',
    value: function inEdges(vertex, cb) {
      return this._edges(vertex, 'in', cb);
    }
  }, {
    key: 'outEdges',
    value: function outEdges(vertex, cb) {
      return this._edges(vertex, 'out', cb);
    }
  }, {
    key: 'traversal',
    value: function traversal(startVertex, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify38 = this._connection.promisify(cb);

      var promise = _connection$promisify38.promise;
      var callback = _connection$promisify38.callback;

      this._api.post('traversal', _extends({}, opts, { startVertex: startVertex, edgeCollection: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }]);

  return EdgeCollection;
})(BaseCollection);

function construct(connection, body) {
  var Collection = body.type === types.EDGE_COLLECTION ? EdgeCollection : DocumentCollection;
  return new Collection(connection, body.name);
}

exports.EdgeCollection = EdgeCollection;
exports.DocumentCollection = DocumentCollection;
exports._BaseCollection = BaseCollection;
exports._types = types;
},{"./cursor":18}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _utilPromisify = require('./util/promisify');

var _utilPromisify2 = _interopRequireDefault(_utilPromisify);

var _httpErrors = require('http-errors');

var _httpErrors2 = _interopRequireDefault(_httpErrors);

var _querystring = require('querystring');

var _querystring2 = _interopRequireDefault(_querystring);

var _utilRequest = require('./util/request');

var _utilRequest2 = _interopRequireDefault(_utilRequest);

var _utilByteLength = require('./util/byte-length');

var _utilByteLength2 = _interopRequireDefault(_utilByteLength);

var _error = require('./error');

var _error2 = _interopRequireDefault(_error);

var _route = require('./route');

var _route2 = _interopRequireDefault(_route);

var MIME_JSON = /\/(json|javascript)(\W|$)/;

var Connection = (function () {
  function Connection(config) {
    _classCallCheck(this, Connection);

    if (typeof config === 'string') {
      config = { url: config };
    }
    this.config = _extends({}, Connection.defaults, config);
    this.config.agentOptions = _extends({}, Connection.agentDefaults, this.config.agentOptions);
    if (!this.config.headers) this.config.headers = {};
    if (!this.config.headers['x-arango-version']) {
      this.config.headers['x-arango-version'] = this.config.arangoVersion;
    }
    this._request = (0, _utilRequest2['default'])(this.config.url, this.config.agentOptions, this.config.agent);
    this.promisify = (0, _utilPromisify2['default'])(this.config.promise);
  }

  _createClass(Connection, [{
    key: '_resolveUrl',
    value: function _resolveUrl(opts) {
      var url = { pathname: '' };
      if (!opts.absolutePath) {
        url.pathname = url.pathname + '/_db/' + this.config.databaseName;
        if (opts.basePath) url.pathname = url.pathname + '/' + opts.basePath;
      }
      url.pathname += opts.path ? (opts.path.charAt(0) === '/' ? '' : '/') + opts.path : '';
      if (opts.qs) url.search = '?' + (typeof opts.qs === 'string' ? opts.qs : _querystring2['default'].stringify(opts.qs));
      return url;
    }
  }, {
    key: 'route',
    value: function route(path, headers) {
      return new _route2['default'](this, path, headers);
    }
  }, {
    key: 'request',
    value: function request(opts, cb) {
      var _promisify = this.promisify(cb);

      var promise = _promisify.promise;
      var callback = _promisify.callback;

      var headers = { 'content-type': 'text/plain' };
      if (!opts) opts = {};
      var body = opts.body;

      if (body) {
        if (typeof body === 'object') {
          if (opts.ld) {
            body = body.map(function (obj) {
              return JSON.stringify(obj);
            }).join('\r\n') + '\r\n';
            headers['content-type'] = 'application/x-ldjson';
          } else {
            body = JSON.stringify(body);
            headers['content-type'] = 'application/json';
          }
        } else {
          body = String(body);
        }
      }

      headers['content-length'] = body ? (0, _utilByteLength2['default'])(body, 'utf-8') : 0;

      this._request({
        url: this._resolveUrl(opts),
        headers: _extends({}, headers, this.config.headers, opts.headers),
        method: (opts.method || 'get').toUpperCase(),
        body: body
      }, function (err, res) {
        if (err) callback(err);else {
          res.rawBody = res.body;
          if (res.headers['content-type'].match(MIME_JSON)) {
            try {
              res.body = JSON.parse(res.rawBody);
            } catch (e) {
              e.response = res;
              return callback(e);
            }
          }
          if (res.body && res.body.error && res.body.hasOwnProperty('code') && res.body.hasOwnProperty('errorMessage') && res.body.hasOwnProperty('errorNum')) {
            err = new _error2['default'](res.body);
            err.response = res;
            callback(err);
          } else if (res.statusCode >= 400) {
            err = (0, _httpErrors2['default'])(res.statusCode);
            err.response = res;
            callback(err);
          } else callback(null, res);
        }
      });
      return promise;
    }
  }]);

  return Connection;
})();

exports['default'] = Connection;

Connection.defaults = {
  url: 'http://localhost:8529',
  databaseName: '_system',
  arangoVersion: 20300
};

Connection.agentDefaults = {
  maxSockets: 3,
  keepAlive: true,
  keepAliveMsecs: 1000
};
module.exports = exports['default'];
},{"./error":20,"./route":23,"./util/byte-length":25,"./util/promisify":26,"./util/request":27,"http-errors":67,"querystring":41}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var ArrayCursor = (function () {
  function ArrayCursor(connection, body) {
    _classCallCheck(this, ArrayCursor);

    this.extra = body.extra;
    this._connection = connection;
    this._api = this._connection.route('_api');
    this._result = body.result;
    this._hasMore = Boolean(body.hasMore);
    this._id = body.id;
    this.count = body.count;
  }

  _createClass(ArrayCursor, [{
    key: '_drain',
    value: function _drain(cb) {
      var _this = this;

      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      this._more(function (err) {
        return err ? callback(err) : !_this._hasMore ? callback(null, _this) : _this._drain(cb);
      });
      return promise;
    }
  }, {
    key: '_more',
    value: function _more(callback) {
      var _this2 = this;

      if (!this._hasMore) callback(null, this);else {
        this._api.put('cursor/' + this._id, function (err, res) {
          if (err) callback(err);else {
            var _result;

            (_result = _this2._result).push.apply(_result, _toConsumableArray(res.body.result));
            _this2._hasMore = res.body.hasMore;
            callback(null, _this2);
          }
        });
      }
    }
  }, {
    key: 'all',
    value: function all(cb) {
      var _this3 = this;

      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      this._drain(function (err) {
        if (err) callback(err);else {
          var result = [];
          while (_this3._result.length) {
            result.push(_this3._result.shift());
          }
          callback(null, result);
        }
      });
      return promise;
    }
  }, {
    key: 'next',
    value: function next(cb) {
      var _this4 = this;

      var _connection$promisify3 = this._connection.promisify(cb);

      var promise = _connection$promisify3.promise;
      var callback = _connection$promisify3.callback;

      var next = function next() {
        var value = _this4._result.shift();
        callback(null, value);
      };
      if (this._result.length) next();else {
        if (!this._hasMore) callback(null);else {
          this._more(function (err) {
            return err ? callback(err) : next();
          });
        }
      }
      return promise;
    }
  }, {
    key: 'hasNext',
    value: function hasNext() {
      return Boolean(this._hasMore || this._result.length);
    }
  }, {
    key: 'each',
    value: function each(fn, cb) {
      var _this5 = this;

      var _connection$promisify4 = this._connection.promisify(cb);

      var promise = _connection$promisify4.promise;
      var callback = _connection$promisify4.callback;

      var index = 0;
      var loop = function loop() {
        try {
          var result = undefined;
          while (_this5._result.length) {
            result = fn(_this5._result.shift(), index, _this5);
            index++;
            if (result === false) break;
          }
          if (!_this5._hasMore || result === false) callback(null, result);else {
            _this5._more(function (err) {
              return err ? callback(err) : loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      };
      loop();
      return promise;
    }
  }, {
    key: 'every',
    value: function every(fn, cb) {
      var _this6 = this;

      var _connection$promisify5 = this._connection.promisify(cb);

      var promise = _connection$promisify5.promise;
      var callback = _connection$promisify5.callback;

      var index = 0;
      var loop = function loop() {
        try {
          var result = true;
          while (_this6._result.length) {
            result = fn(_this6._result.shift(), index, _this6);
            index++;
            if (!result) break;
          }
          if (!_this6._hasMore || !result) callback(null, Boolean(result));else {
            _this6._more(function (err) {
              return err ? callback(err) : loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      };
      loop();
      return promise;
    }
  }, {
    key: 'some',
    value: function some(fn, cb) {
      var _this7 = this;

      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      var index = 0;
      var loop = function loop() {
        try {
          var result = false;
          while (_this7._result.length) {
            result = fn(_this7._result.shift(), index, _this7);
            index++;
            if (result) break;
          }
          if (!_this7._hasMore || result) callback(null, Boolean(result));else {
            _this7._more(function (err) {
              return err ? callback(err) : loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      };
      loop();
      return promise;
    }
  }, {
    key: 'map',
    value: function map(fn, cb) {
      var _this8 = this;

      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      var index = 0;
      var result = [];
      var loop = function loop() {
        try {
          while (_this8._result.length) {
            result.push(fn(_this8._result.shift(), index, _this8));
            index++;
          }
          if (!_this8._hasMore) callback(null, result);else {
            _this8._more(function (err) {
              return err ? callback(err) : loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      };
      loop();
      return promise;
    }
  }, {
    key: 'reduce',
    value: function reduce(fn, accu, cb) {
      var _this9 = this;

      if (typeof accu === 'function') {
        cb = accu;
        accu = undefined;
      }
      var index = 0;

      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      var loop = function loop() {
        try {
          while (_this9._result.length) {
            accu = fn(accu, _this9._result.shift(), index, _this9);
            index++;
          }
          if (!_this9._hasMore) callback(null, accu);else {
            _this9._more(function (err) {
              return err ? callback(err) : loop();
            });
          }
        } catch (e) {
          callback(e);
        }
      };
      if (accu !== undefined) {
        loop();
      } else if (this._result.length > 1) {
        accu = this._result.shift();
        index = 1;
        loop();
      } else {
        this._more(function (err) {
          if (err) callback(err);else {
            accu = _this9._result.shift();
            index = 1;
            loop();
          }
        });
      }
      return promise;
    }
  }]);

  return ArrayCursor;
})();

exports['default'] = ArrayCursor;
module.exports = exports['default'];
},{}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _utilAll = require('./util/all');

var _utilAll2 = _interopRequireDefault(_utilAll);

var _connection = require('./connection');

var _connection2 = _interopRequireDefault(_connection);

var _cursor = require('./cursor');

var _cursor2 = _interopRequireDefault(_cursor);

var _graph = require('./graph');

var _graph2 = _interopRequireDefault(_graph);

var _collection = require('./collection');

var _collection2 = _interopRequireDefault(_collection);

var Database = (function () {
  function Database(config) {
    _classCallCheck(this, Database);

    this._connection = new _connection2['default'](config);
    this._api = this._connection.route('_api');
    this.name = this._connection.config.databaseName;
  }

  _createClass(Database, [{
    key: 'route',
    value: function route(path, headers) {
      return this._connection.route(path, headers);
    }

    // Database manipulation

  }, {
    key: 'useDatabase',
    value: function useDatabase(databaseName) {
      this._connection.config.databaseName = databaseName;
      this.name = databaseName;
      return this;
    }
  }, {
    key: 'get',
    value: function get(cb) {
      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      this._api.get('database/current', function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'createDatabase',
    value: function createDatabase(databaseName, users, cb) {
      if (typeof users === 'function') {
        cb = users;
        users = undefined;
      }

      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      this._api.post('database', { users: users, name: databaseName }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'listDatabases',
    value: function listDatabases(cb) {
      var _connection$promisify3 = this._connection.promisify(cb);

      var promise = _connection$promisify3.promise;
      var callback = _connection$promisify3.callback;

      this._api.get('database', function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'listUserDatabases',
    value: function listUserDatabases(cb) {
      var _connection$promisify4 = this._connection.promisify(cb);

      var promise = _connection$promisify4.promise;
      var callback = _connection$promisify4.callback;

      this._api.get('database/user', function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'dropDatabase',
    value: function dropDatabase(databaseName, cb) {
      var _connection$promisify5 = this._connection.promisify(cb);

      var promise = _connection$promisify5.promise;
      var callback = _connection$promisify5.callback;

      this._api['delete']('database/' + databaseName, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }

    // Collection manipulation

  }, {
    key: 'collection',
    value: function collection(collectionName) {
      return new _collection.DocumentCollection(this._connection, collectionName);
    }
  }, {
    key: 'edgeCollection',
    value: function edgeCollection(collectionName) {
      return new _collection.EdgeCollection(this._connection, collectionName);
    }
  }, {
    key: 'listCollections',
    value: function listCollections(excludeSystem, cb) {
      if (typeof excludeSystem === 'function') {
        cb = excludeSystem;
        excludeSystem = undefined;
      }

      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      if (typeof excludeSystem !== 'boolean') excludeSystem = true;
      this._api.get('collection', { excludeSystem: excludeSystem }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.collections);
      });
      return promise;
    }
  }, {
    key: 'collections',
    value: function collections(excludeSystem, cb) {
      var _this = this;

      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      this.listCollections(excludeSystem, function (err, collections) {
        return err ? callback(err) : callback(null, collections.map(function (info) {
          return (0, _collection2['default'])(_this._connection, info);
        }));
      });
      return promise;
    }
  }, {
    key: 'truncate',
    value: function truncate(excludeSystem, cb) {
      var _this2 = this;

      if (typeof excludeSystem === 'function') {
        cb = excludeSystem;
        excludeSystem = undefined;
      }

      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      this.listCollections(excludeSystem, function (err, collections) {
        return err ? callback(err) : (0, _utilAll2['default'])(collections.map(function (data) {
          return function (cb) {
            return _this2._api.put('collection/' + data.name + '/truncate', function (err, res) {
              return err ? cb(err) : cb(null, res.body);
            });
          };
        }), callback);
      });
      return promise;
    }

    // Graph manipulation

  }, {
    key: 'graph',
    value: function graph(graphName) {
      return new _graph2['default'](this._connection, graphName);
    }
  }, {
    key: 'listGraphs',
    value: function listGraphs(cb) {
      var _connection$promisify9 = this._connection.promisify(cb);

      var promise = _connection$promisify9.promise;
      var callback = _connection$promisify9.callback;

      this._api.get('gharial', function (err, res) {
        return err ? callback(err) : callback(null, res.body.graphs);
      });
      return promise;
    }
  }, {
    key: 'graphs',
    value: function graphs(cb) {
      var _this3 = this;

      var _connection$promisify10 = this._connection.promisify(cb);

      var promise = _connection$promisify10.promise;
      var callback = _connection$promisify10.callback;

      this.listGraphs(function (err, graphs) {
        return err ? callback(err) : callback(null, graphs.map(function (info) {
          return _this3.graph(info._key);
        }));
      });
      return promise;
    }

    // Queries

  }, {
    key: 'transaction',
    value: function transaction(collections, action, params, lockTimeout, cb) {
      if (typeof lockTimeout === 'function') {
        cb = lockTimeout;
        lockTimeout = undefined;
      }
      if (typeof params === 'function') {
        cb = params;
        params = undefined;
      }
      if (typeof params === 'number') {
        lockTimeout = params;
        params = undefined;
      }
      if (typeof collections === 'string' || Array.isArray(collections)) {
        collections = { write: collections };
      }

      var _connection$promisify11 = this._connection.promisify(cb);

      var promise = _connection$promisify11.promise;
      var callback = _connection$promisify11.callback;

      this._api.post('transaction', { collections: collections, action: action, params: params, lockTimeout: lockTimeout }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }, {
    key: 'query',
    value: function query(_query, bindVars, opts, cb) {
      var _this4 = this;

      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }
      if (typeof bindVars === 'function') {
        cb = bindVars;
        bindVars = undefined;
      }

      var _connection$promisify12 = this._connection.promisify(cb);

      var promise = _connection$promisify12.promise;
      var callback = _connection$promisify12.callback;

      if (_query && _query.query) {
        if (!opts) opts = bindVars;
        bindVars = _query.bindVars;
        _query = _query.query;
      }
      if (_query && typeof _query.toAQL === 'function') {
        _query = _query.toAQL();
      }
      this._api.post('cursor', _extends({}, opts, { query: _query, bindVars: bindVars }), function (err, res) {
        return err ? callback(err) : callback(null, new _cursor2['default'](_this4._connection, res.body));
      });
      return promise;
    }

    // Function manipulation

  }, {
    key: 'listFunctions',
    value: function listFunctions(cb) {
      var _connection$promisify13 = this._connection.promisify(cb);

      var promise = _connection$promisify13.promise;
      var callback = _connection$promisify13.callback;

      this._api.get('aqlfunction', function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'createFunction',
    value: function createFunction(name, code, cb) {
      var _connection$promisify14 = this._connection.promisify(cb);

      var promise = _connection$promisify14.promise;
      var callback = _connection$promisify14.callback;

      this._api.post('aqlfunction', { name: name, code: code }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'dropFunction',
    value: function dropFunction(name, group, cb) {
      if (typeof group === 'function') {
        cb = group;
        group = undefined;
      }

      var _connection$promisify15 = this._connection.promisify(cb);

      var promise = _connection$promisify15.promise;
      var callback = _connection$promisify15.callback;

      this._api['delete']('aqlfunction/' + name, { group: Boolean(group) }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }]);

  return Database;
})();

exports['default'] = Database;
module.exports = exports['default'];
},{"./collection":16,"./connection":17,"./cursor":18,"./graph":21,"./util/all":24}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ArangoError = (function (_Error) {
  _inherits(ArangoError, _Error);

  function ArangoError(obj) {
    _classCallCheck(this, ArangoError);

    _get(Object.getPrototypeOf(ArangoError.prototype), 'constructor', this).call(this);
    this.name = 'ArangoError';
    this.message = obj.errorMessage;
    this.errorNum = obj.errorNum;
    this.code = obj.code;
    var err = new Error(this.message);
    err.name = this.name;
    if (err.fileName) this.fileName = err.fileName;
    if (err.lineNumber) this.lineNumber = err.lineNumber;
    if (err.columnNumber) this.columnNumber = err.columnNumber;
    if (err.stack) this.stack = err.stack;
    if (err.description) this.description = err.description;
    if (err.number) this.number = err.number;
  }

  return ArangoError;
})(Error);

exports['default'] = ArangoError;
module.exports = exports['default'];
},{}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _collection = require('./collection');

var GraphVertexCollection = (function (_BaseCollection) {
  _inherits(GraphVertexCollection, _BaseCollection);

  function GraphVertexCollection(connection, name, graph) {
    _classCallCheck(this, GraphVertexCollection);

    _get(Object.getPrototypeOf(GraphVertexCollection.prototype), 'constructor', this).call(this, connection, name);
    this.type = _collection._types.DOCUMENT_COLLECTION;
    this.graph = graph;
    this._gharial = this._api.route('gharial/' + this.graph.name + '/vertex');
  }

  _createClass(GraphVertexCollection, [{
    key: '_documentPath',
    value: function _documentPath(documentHandle) {
      return 'document/' + this._documentHandle(documentHandle);
    }
  }, {
    key: 'remove',
    value: function remove(documentHandle, cb) {
      var _connection$promisify = this._connection.promisify(cb);

      var promise = _connection$promisify.promise;
      var callback = _connection$promisify.callback;

      this._gharial['delete'](this._documentHandle(documentHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'vertex',
    value: function vertex(documentHandle, cb) {
      var _connection$promisify2 = this._connection.promisify(cb);

      var promise = _connection$promisify2.promise;
      var callback = _connection$promisify2.callback;

      this._gharial.get(this._documentHandle(documentHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'save',
    value: function save(data, cb) {
      var _connection$promisify3 = this._connection.promisify(cb);

      var promise = _connection$promisify3.promise;
      var callback = _connection$promisify3.callback;

      this._gharial.post(this.name, data, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }]);

  return GraphVertexCollection;
})(_collection._BaseCollection);

var GraphEdgeCollection = (function (_EdgeCollection) {
  _inherits(GraphEdgeCollection, _EdgeCollection);

  function GraphEdgeCollection(connection, name, graph) {
    _classCallCheck(this, GraphEdgeCollection);

    _get(Object.getPrototypeOf(GraphEdgeCollection.prototype), 'constructor', this).call(this, connection, name);
    this.type = _collection._types.EDGE_COLLECTION;
    this.graph = graph;
    this._gharial = this._api.route('gharial/' + this.graph.name + '/edge');
  }

  _createClass(GraphEdgeCollection, [{
    key: 'remove',
    value: function remove(documentHandle, cb) {
      var _connection$promisify4 = this._connection.promisify(cb);

      var promise = _connection$promisify4.promise;
      var callback = _connection$promisify4.callback;

      this._gharial['delete'](this._documentHandle(documentHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'edge',
    value: function edge(documentHandle, cb) {
      var _connection$promisify5 = this._connection.promisify(cb);

      var promise = _connection$promisify5.promise;
      var callback = _connection$promisify5.callback;

      this._gharial.get(this._documentHandle(documentHandle), function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'save',
    value: function save(data, fromId, toId, cb) {
      if (typeof fromId === 'function') {
        cb = fromId;
        fromId = undefined;
      } else if (fromId) {
        data._from = this._documentHandle(fromId);
        data._to = this._documentHandle(toId);
      }

      var _connection$promisify6 = this._connection.promisify(cb);

      var promise = _connection$promisify6.promise;
      var callback = _connection$promisify6.callback;

      this._gharial.post(this.name, data, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }]);

  return GraphEdgeCollection;
})(_collection.EdgeCollection);

var Graph = (function () {
  function Graph(connection, name) {
    _classCallCheck(this, Graph);

    this.name = name;
    this._connection = connection;
    this._api = this._connection.route('_api');
    this._gharial = this._api.route('gharial/' + this.name);
  }

  _createClass(Graph, [{
    key: 'get',
    value: function get(cb) {
      var _connection$promisify7 = this._connection.promisify(cb);

      var promise = _connection$promisify7.promise;
      var callback = _connection$promisify7.callback;

      this._gharial.get(function (err, res) {
        return err ? callback(err) : callback(null, res.body.graph);
      });
      return promise;
    }
  }, {
    key: 'create',
    value: function create(properties, cb) {
      if (typeof properties === 'function') {
        cb = properties;
        properties = undefined;
      }

      var _connection$promisify8 = this._connection.promisify(cb);

      var promise = _connection$promisify8.promise;
      var callback = _connection$promisify8.callback;

      this._api.post('gharial', _extends({}, properties, { name: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body.graph);
      });
      return promise;
    }
  }, {
    key: 'drop',
    value: function drop(dropCollections, cb) {
      if (typeof dropCollections === 'function') {
        cb = dropCollections;
        dropCollections = undefined;
      }
      if (typeof dropCollections !== 'boolean') dropCollections = false;

      var _connection$promisify9 = this._connection.promisify(cb);

      var promise = _connection$promisify9.promise;
      var callback = _connection$promisify9.callback;

      this._gharial['delete']({ dropCollections: dropCollections }, function (err, res) {
        return err ? callback(err) : callback(null, res.body);
      });
      return promise;
    }
  }, {
    key: 'vertexCollection',
    value: function vertexCollection(collectionName) {
      return new GraphVertexCollection(this._connection, collectionName, this);
    }
  }, {
    key: 'addVertexCollection',
    value: function addVertexCollection(collectionName, cb) {
      var _connection$promisify10 = this._connection.promisify(cb);

      var promise = _connection$promisify10.promise;
      var callback = _connection$promisify10.callback;

      this._gharial.post('vertex', { collection: collectionName }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.graph);
      });
      return promise;
    }
  }, {
    key: 'removeVertexCollection',
    value: function removeVertexCollection(collectionName, dropCollection, cb) {
      if (typeof dropCollection === 'function') {
        cb = dropCollection;
        dropCollection = undefined;
      }

      var _connection$promisify11 = this._connection.promisify(cb);

      var promise = _connection$promisify11.promise;
      var callback = _connection$promisify11.callback;

      if (typeof dropCollection !== 'boolean') dropCollection = false;
      this._gharial['delete']('vertex/' + collectionName, { dropCollection: dropCollection }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.graph);
      });
      return promise;
    }
  }, {
    key: 'edgeCollection',
    value: function edgeCollection(collectionName) {
      return new GraphEdgeCollection(this._connection, collectionName, this);
    }
  }, {
    key: 'addEdgeDefinition',
    value: function addEdgeDefinition(definition, cb) {
      var _connection$promisify12 = this._connection.promisify(cb);

      var promise = _connection$promisify12.promise;
      var callback = _connection$promisify12.callback;

      this._gharial.post('edge', definition, function (err, res) {
        return err ? callback(err) : callback(null, res.body.graph);
      });
      return promise;
    }
  }, {
    key: 'replaceEdgeDefinition',
    value: function replaceEdgeDefinition(definitionName, definition, cb) {
      var _connection$promisify13 = this._connection.promisify(cb);

      var promise = _connection$promisify13.promise;
      var callback = _connection$promisify13.callback;

      this._api.put('gharial/' + this.name + '/edge/' + definitionName, definition, function (err, res) {
        return err ? callback(err) : callback(null, res.body.graph);
      });
      return promise;
    }
  }, {
    key: 'removeEdgeDefinition',
    value: function removeEdgeDefinition(definitionName, dropCollection, cb) {
      if (typeof dropCollection === 'function') {
        cb = dropCollection;
        dropCollection = undefined;
      }

      var _connection$promisify14 = this._connection.promisify(cb);

      var promise = _connection$promisify14.promise;
      var callback = _connection$promisify14.callback;

      if (typeof dropCollection !== 'boolean') dropCollection = false;
      this._gharial['delete']('edge/' + definitionName, { dropCollection: dropCollection }, function (err, res) {
        return err ? callback(err) : callback(null, res.body.graph);
      });
      return promise;
    }
  }, {
    key: 'traversal',
    value: function traversal(startVertex, opts, cb) {
      if (typeof opts === 'function') {
        cb = opts;
        opts = undefined;
      }

      var _connection$promisify15 = this._connection.promisify(cb);

      var promise = _connection$promisify15.promise;
      var callback = _connection$promisify15.callback;

      this._api.post('traversal', _extends({}, opts, { startVertex: startVertex, graphName: this.name }), function (err, res) {
        return err ? callback(err) : callback(null, res.body.result);
      });
      return promise;
    }
  }]);

  return Graph;
})();

exports['default'] = Graph;
exports.VertexCollection = GraphVertexCollection;
exports.EdgeCollection = GraphEdgeCollection;
},{"./collection":16}],22:[function(require,module,exports){
'use strict';

var _bind = Function.prototype.bind;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _database = require('./database');

var _database2 = _interopRequireDefault(_database);

var _aqlQuery = require('./aql-query');

var _aqlQuery2 = _interopRequireDefault(_aqlQuery);

module.exports = function () {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return new (_bind.apply(_database2['default'], [null].concat(args)))();
};
module.exports.Database = _database2['default'];
module.exports.aqlQuery = _aqlQuery2['default'];
},{"./aql-query":15,"./database":19}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Route = (function () {
  function Route(connection, path, headers) {
    _classCallCheck(this, Route);

    this._connection = connection;
    this._path = path || '';
    this._headers = headers;
  }

  _createClass(Route, [{
    key: 'route',
    value: function route(path, headers) {
      if (!path) path = '';else if (path.charAt(0) !== '/') path = '/' + path;
      return new Route(this._connection, this._path + path, _extends({}, this._headers, headers));
    }
  }, {
    key: 'request',
    value: function request(opts, callback) {
      opts = _extends({}, opts);
      opts.basePath = this._path;
      opts.headers = _extends({}, this._headers, opts.headers);
      return this._connection.request(opts, callback);
    }
  }, {
    key: 'get',
    value: function get(path, qs, callback) {
      if (typeof path !== 'string') {
        callback = qs;
        qs = path;
        path = undefined;
      }
      if (typeof qs === 'function') {
        callback = qs;
        qs = undefined;
      }
      if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
      return this.request({ path: path, qs: qs, method: 'get' }, callback);
    }
  }, {
    key: 'post',
    value: function post(path, body, qs, callback) {
      if (typeof path !== 'string') {
        callback = qs;
        qs = body;
        body = path;
        path = undefined;
      }
      if (typeof qs === 'function') {
        callback = qs;
        qs = undefined;
      }
      if (typeof body === 'function') {
        callback = body;
        body = undefined;
      }
      if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
      return this.request({ path: path, body: body, qs: qs, method: 'post' }, callback);
    }
  }, {
    key: 'put',
    value: function put(path, body, qs, callback) {
      if (typeof path !== 'string') {
        callback = body;
        body = qs;
        qs = path;
        path = undefined;
      }
      if (typeof qs === 'function') {
        callback = qs;
        qs = undefined;
      }
      if (typeof body === 'function') {
        callback = body;
        body = undefined;
      }
      if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
      return this.request({ path: path, body: body, qs: qs, method: 'put' }, callback);
    }
  }, {
    key: 'patch',
    value: function patch(path, body, qs, callback) {
      if (typeof path !== 'string') {
        callback = body;
        body = qs;
        qs = path;
        path = undefined;
      }
      if (typeof qs === 'function') {
        callback = qs;
        qs = undefined;
      }
      if (typeof body === 'function') {
        callback = body;
        body = undefined;
      }
      if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
      return this.request({ path: path, body: body, qs: qs, method: 'patch' }, callback);
    }
  }, {
    key: 'delete',
    value: function _delete(path, qs, callback) {
      if (typeof path !== 'string') {
        callback = qs;
        qs = path;
        path = undefined;
      }
      if (typeof qs === 'function') {
        callback = qs;
        qs = undefined;
      }
      if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
      return this.request({ path: path, qs: qs, method: 'delete' }, callback);
    }
  }, {
    key: 'head',
    value: function head(path, qs, callback) {
      if (typeof path !== 'string') {
        callback = qs;
        qs = path;
        path = undefined;
      }
      if (typeof qs === 'function') {
        callback = qs;
        qs = undefined;
      }
      if (!path) path = '';else if (this._path && path.charAt(0) !== '/') path = '/' + path;
      return this.request({ path: path, qs: qs, method: 'head' }, callback);
    }
  }]);

  return Route;
})();

exports['default'] = Route;
module.exports = exports['default'];
},{}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = all;

function all(arr, callback) {
  var result = [];
  var pending = arr.length;
  var called = false;

  if (arr.length === 0) return callback(null, result);

  var step = function step(i) {
    return function (err, res) {
      pending -= 1;
      if (!err) result[i] = res;
      if (!called) {
        if (err) callback(err);else if (pending === 0) {
          if (result.every(function (r) {
            return r === undefined;
          })) callback(null);else callback(null, result);
        } else return;
        called = true;
      }
    };
  };

  arr.forEach(function (fn, i) {
    return fn(step(i));
  });
}

module.exports = exports["default"];
},{}],25:[function(require,module,exports){
(function (Buffer){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = Buffer.byteLength;
module.exports = exports["default"];
}).call(this,require("buffer").Buffer)
},{"buffer":29}],26:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = promisify;
var noop = function noop() {
  return undefined;
};

function promisify(Promise) {
  if (Promise === false) {
    return function (callback) {
      return { callback: callback || noop };
    };
  }

  return function (callback) {
    if (callback || !Promise && !global.Promise) {
      return { callback: callback || noop };
    }

    function defer(resolve, reject) {
      callback = function (err, res) {
        if (err) reject(err);else resolve(res);
      };
    }

    var promise = Promise ? new Promise(defer) : new global.Promise(defer);

    return { callback: callback, promise: promise };
  };
}

module.exports = exports["default"];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _url = require('url');

var _linkedlist = require('linkedlist');

var _linkedlist2 = _interopRequireDefault(_linkedlist);

function joinPath() {
  var a = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
  var b = arguments.length <= 1 || arguments[1] === undefined ? '' : arguments[1];

  if (!a && !b) return '';
  var leadingSlash = a.charAt(0) === '/';
  var trailingSlash = b.charAt(b.length - 1) === '/';
  var tokens = (a + '/' + b).split('/').filter(Boolean);
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (token === '..') {
      tokens.splice(i - 1, 2);
      i--;
    } else if (token === '.') {
      tokens.splice(i, 1);
      i--;
    }
  }
  var path = tokens.join('/');
  if (leadingSlash) path = '/' + path;
  if (trailingSlash) path = path + '/';
  return path;
}

exports['default'] = function (baseUrl, agentOptions, agent) {
  var baseUrlParts = (0, _url.parse)(baseUrl);
  var isTls = baseUrlParts.protocol === 'https:';

  if (!agent) {
    var Agent = (isTls ? _https2['default'] : _http2['default']).Agent;
    agent = new Agent(agentOptions);
  }

  var queue = new _linkedlist2['default']();
  var maxTasks = typeof agent.maxSockets === 'number' ? agent.maxSockets * 2 : Infinity;
  var activeTasks = 0;

  function drainQueue() {
    if (!queue.length || activeTasks >= maxTasks) return;
    var task = queue.shift();
    activeTasks += 1;
    task(function () {
      activeTasks -= 1;
      drainQueue();
    });
  }

  return function request(_ref, cb) {
    var method = _ref.method;
    var url = _ref.url;
    var headers = _ref.headers;
    var body = _ref.body;

    var path = baseUrlParts.pathname ? url.pathname ? joinPath(baseUrlParts.pathname, url.pathname) : baseUrlParts.pathname : url.pathname;
    var search = url.search ? baseUrlParts.search ? baseUrlParts.search + '&' + url.search.slice(1) : url.search : baseUrlParts.search;
    if (search) path += search;
    var options = { path: path, method: method, headers: headers, agent: agent };
    options.hostname = baseUrlParts.hostname;
    options.port = baseUrlParts.port;
    options.auth = baseUrlParts.auth;

    queue.push(function (next) {
      var _callback = function callback() {
        _callback = function () {
          return undefined;
        };
        next();
        cb.apply(undefined, arguments);
      };
      var req = (isTls ? _https2['default'] : _http2['default']).request(options, function (res) {
        var data = [];
        res.on('data', function (chunk) {
          return data.push(chunk);
        }).on('end', function () {
          res.body = data.join('');
          _callback(null, res);
        });
      });
      req.on('error', function (err) {
        err.request = req;
        _callback(err);
      });
      if (body) req.write(body);
      req.end();
    });

    drainQueue();
  };
};

module.exports = exports['default'];
},{"http":57,"https":34,"linkedlist":69,"url":64}],28:[function(require,module,exports){

},{}],29:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    this.length = 0
    this.parent = undefined
  }

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(array)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
} else {
  // pre-set for values that may exist in the future
  Buffer.prototype.length = undefined
  Buffer.prototype.parent = undefined
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":30,"ieee754":31,"isarray":32}],30:[function(require,module,exports){
'use strict'

exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

function init () {
  var i
  var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  var len = code.length

  for (i = 0; i < len; i++) {
    lookup[i] = code[i]
  }

  for (i = 0; i < len; ++i) {
    revLookup[code.charCodeAt(i)] = i
  }
  revLookup['-'.charCodeAt(0)] = 62
  revLookup['_'.charCodeAt(0)] = 63
}

init()

function toByteArray (b64) {
  var i, j, l, tmp, placeHolders, arr
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0

  // base64 is 4/3 + up to two characters of the original data
  arr = new Arr(len * 3 / 4 - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0, j = 0; i < l; i += 4, j += 3) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp & 0xFF0000) >> 16
    arr[L++] = (tmp & 0xFF00) >> 8
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],31:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],32:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],33:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],34:[function(require,module,exports){
var http = require('http');

var https = module.exports;

for (var key in http) {
    if (http.hasOwnProperty(key)) https[key] = http[key];
};

https.request = function (params, cb) {
    if (!params) params = {};
    params.scheme = 'https';
    params.protocol = 'https:';
    return http.request.call(this, params, cb);
}

},{"http":57}],35:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],36:[function(require,module,exports){
/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install is-buffer`
 */

module.exports = function (obj) {
  return !!(obj != null &&
    (obj._isBuffer || // For Safari 5-7 (missing Object.prototype.constructor)
      (obj.constructor &&
      typeof obj.constructor.isBuffer === 'function' &&
      obj.constructor.isBuffer(obj))
    ))
}

},{}],37:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],38:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],39:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],40:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],41:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":39,"./encode":40}],42:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":43}],43:[function(require,module,exports){
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

'use strict';

/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}
},{"./_stream_readable":45,"./_stream_writable":47,"core-util-is":48,"inherits":35,"process-nextick-args":50}],44:[function(require,module,exports){
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":46,"core-util-is":48,"inherits":35}],45:[function(require,module,exports){
(function (process){
'use strict';

module.exports = Readable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events');

/*<replacement>*/
var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var debugUtil = require('util');
var debug = undefined;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

var Duplex;
function ReadableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

var Duplex;
function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function') this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      var skipAdd;
      if (state.decoder && !addToFront && !encoding) {
        chunk = state.decoder.write(chunk);
        skipAdd = !state.objectMode && chunk.length === 0;
      }

      if (!addToFront) state.reading = false;

      // Don't add to the buffer if we've decoded to an empty string chunk and
      // we're not in object mode
      if (!skipAdd) {
        // if we want the data now, just emit it.
        if (state.flowing && state.length === 0 && !state.sync) {
          stream.emit('data', chunk);
          stream.read(0);
        } else {
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

          if (state.needReadable) emitReadable(stream);
        }
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended) return 0;

  if (state.objectMode) return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length) return state.buffer[0].length;else return state.length;
  }

  if (n <= 0) return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else {
      return state.length;
    }
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading) n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended) state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0) endReadable(this);

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      if (state.pipesCount === 1 && state.pipes[0] === dest && src.listenerCount('data') === 1 && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error) dest.on('error', onerror);else if (isArray(dest._events.error)) dest._events.error.unshift(onerror);else dest._events.error = [onerror, dest._events.error];

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var _i = 0; _i < len; _i++) {
      dests[_i].emit('unpipe', this);
    }return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1) return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && !this._readableState.endEmitted) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function (ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0) return null;

  if (length === 0) ret = null;else if (objectMode) ret = list.shift();else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode) ret = list.join('');else if (list.length === 1) ret = list[0];else ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode) ret = '';else ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode) ret += buf.slice(0, cpy);else buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length) list[0] = buf.slice(cpy);else list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
}).call(this,require('_process'))
},{"./_stream_duplex":43,"_process":37,"buffer":29,"core-util-is":48,"events":33,"inherits":35,"isarray":49,"process-nextick-args":50,"string_decoder/":63,"util":28}],46:[function(require,module,exports){
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

'use strict';

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er) {
      done(stream, er);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

function done(stream, er) {
  if (er) return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('calling transform done when still transforming');

  return stream.push(null);
}
},{"./_stream_duplex":43,"core-util-is":48,"inherits":35}],47:[function(require,module,exports){
(function (process){
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.

'use strict';

module.exports = Writable;

/*<replacement>*/
var processNextTick = require('process-nextick-args');
/*</replacement>*/

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = require('st' + 'ream');
  } catch (_) {} finally {
    if (!Stream) Stream = require('events').EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = require('buffer').Buffer;

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

var Duplex;
function WritableState(options, stream) {
  Duplex = Duplex || require('./_stream_duplex');

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // create the two objects needed to store the corked requests
  // they are not a linked list, as no new elements are inserted in there
  this.corkedRequestsFree = new CorkedRequest(this);
  this.corkedRequestsFree.next = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function writableStateGetBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
    });
  } catch (_) {}
})();

var Duplex;
function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;

  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) processNextTick(cb, er);else cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
        afterWrite(stream, state, finished, cb);
      }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    while (entry) {
      buffer[count] = entry;
      entry = entry.next;
      count += 1;
    }

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    state.corkedRequestsFree = holder.next;
    holder.next = null;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function (err) {
    var entry = _this.entry;
    _this.entry = null;
    while (entry) {
      var cb = entry.callback;
      state.pendingcb--;
      cb(err);
      entry = entry.next;
    }
    if (state.corkedRequestsFree) {
      state.corkedRequestsFree.next = _this;
    } else {
      state.corkedRequestsFree = _this;
    }
  };
}
}).call(this,require('_process'))
},{"./_stream_duplex":43,"_process":37,"buffer":29,"core-util-is":48,"events":33,"inherits":35,"process-nextick-args":50,"util-deprecate":51}],48:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

}).call(this,{"isBuffer":require("../../../../insert-module-globals/node_modules/is-buffer/index.js")})
},{"../../../../insert-module-globals/node_modules/is-buffer/index.js":36}],49:[function(require,module,exports){
arguments[4][32][0].apply(exports,arguments)
},{"dup":32}],50:[function(require,module,exports){
(function (process){
'use strict';

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn) {
  var args = new Array(arguments.length - 1);
  var i = 0;
  while (i < args.length) {
    args[i++] = arguments[i];
  }
  process.nextTick(function afterTick() {
    fn.apply(null, args);
  });
}

}).call(this,require('_process'))
},{"_process":37}],51:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],52:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":44}],53:[function(require,module,exports){
var Stream = (function (){
  try {
    return require('st' + 'ream'); // hack to fix a circular dependency issue when used with browserify
  } catch(_){}
}());
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = Stream || exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":43,"./lib/_stream_passthrough.js":44,"./lib/_stream_readable.js":45,"./lib/_stream_transform.js":46,"./lib/_stream_writable.js":47}],54:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":46}],55:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":47}],56:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":33,"inherits":35,"readable-stream/duplex.js":42,"readable-stream/passthrough.js":52,"readable-stream/readable.js":53,"readable-stream/transform.js":54,"readable-stream/writable.js":55}],57:[function(require,module,exports){
(function (global){
var ClientRequest = require('./lib/request')
var extend = require('xtend')
var statusCodes = require('builtin-status-codes')
var url = require('url')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)
	else
		opts = extend(opts)

	// Normally, the page is loaded from http or https, so not specifying a protocol
	// will result in a (valid) protocol-relative url. However, this won't work if
	// the protocol is something else, like 'file:'
	var defaultProtocol = global.location.protocol.search(/^https?:$/) === -1 ? 'http:' : ''

	var protocol = opts.protocol || defaultProtocol
	var host = opts.hostname || opts.host
	var port = opts.port
	var path = opts.path || '/'

	// Necessary for IPv6 addresses
	if (host && host.indexOf(':') !== -1)
		host = '[' + host + ']'

	// This may be a relative url. The browser should always be able to interpret it correctly.
	opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path
	opts.method = (opts.method || 'GET').toUpperCase()
	opts.headers = opts.headers || {}

	// Also valid opts.auth, opts.mode

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.STATUS_CODES = statusCodes

http.METHODS = [
	'CHECKOUT',
	'CONNECT',
	'COPY',
	'DELETE',
	'GET',
	'HEAD',
	'LOCK',
	'M-SEARCH',
	'MERGE',
	'MKACTIVITY',
	'MKCOL',
	'MOVE',
	'NOTIFY',
	'OPTIONS',
	'PATCH',
	'POST',
	'PROPFIND',
	'PROPPATCH',
	'PURGE',
	'PUT',
	'REPORT',
	'SEARCH',
	'SUBSCRIBE',
	'TRACE',
	'UNLOCK',
	'UNSUBSCRIBE'
]
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/request":59,"builtin-status-codes":61,"url":64,"xtend":66}],58:[function(require,module,exports){
(function (global){
exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableByteStream)

exports.blobConstructor = false
try {
	new Blob([new ArrayBuffer(1)])
	exports.blobConstructor = true
} catch (e) {}

var xhr = new global.XMLHttpRequest()
// If location.host is empty, e.g. if this page/worker was loaded
// from a Blob, then use example.com to avoid an error
xhr.open('GET', global.location.host ? '/' : 'https://example.com')

function checkTypeSupport (type) {
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

// For some strange reason, Safari 7.0 reports typeof global.ArrayBuffer === 'object'.
// Safari 7.1 appears to have fixed this bug.
var haveArrayBuffer = typeof global.ArrayBuffer !== 'undefined'
var haveSlice = haveArrayBuffer && isFunction(global.ArrayBuffer.prototype.slice)

exports.arraybuffer = haveArrayBuffer && checkTypeSupport('arraybuffer')
// These next two tests unavoidably show warnings in Chrome. Since fetch will always
// be used if it's available, just return false for these to avoid the warnings.
exports.msstream = !exports.fetch && haveSlice && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = !exports.fetch && haveArrayBuffer &&
	checkTypeSupport('moz-chunked-arraybuffer')
exports.overrideMimeType = isFunction(xhr.overrideMimeType)
exports.vbArray = isFunction(global.VBArray)

function isFunction (value) {
  return typeof value === 'function'
}

xhr = null // Help gc

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],59:[function(require,module,exports){
(function (process,global,Buffer){
// var Base64 = require('Base64')
var capability = require('./capability')
var inherits = require('inherits')
var response = require('./response')
var stream = require('stream')
var toArrayBuffer = require('to-arraybuffer')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary) {
	if (capability.fetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else if (capability.vbArray && preferBinary) {
		return 'text:vbarray'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._body = []
	self._headers = {}
	if (opts.auth)
		self.setHeader('Authorization', 'Basic ' + new Buffer(opts.auth).toString('base64'))
	Object.keys(opts.headers).forEach(function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility and
		// the accuracy of the 'content-type' header aren't
		preferBinary = false
	} else if (opts.mode === 'allow-wrong-content-type') {
		// If streaming is more important than preserving the 'content-type' header
		preferBinary = !capability.overrideMimeType
	} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
		// Use binary if text streaming may corrupt data or the content-type header, or for speed
		preferBinary = true
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary)

	self.on('finish', function () {
		self._onFinish()
	})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (unsafeHeaders.indexOf(lowerName) !== -1)
		return

	self._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	var self = this
	return self._headers[name.toLowerCase()].value
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	if (self._destroyed)
		return
	var opts = self._opts

	var headersObj = self._headers
	var body
	if (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH') {
		if (capability.blobConstructor) {
			body = new global.Blob(self._body.map(function (buffer) {
				return toArrayBuffer(buffer)
			}), {
				type: (headersObj['content-type'] || {}).value || ''
			})
		} else {
			// get utf8 string
			body = Buffer.concat(self._body).toString()
		}
	}

	if (self._mode === 'fetch') {
		var headers = Object.keys(headersObj).map(function (name) {
			return [headersObj[name].name, headersObj[name].value]
		})

		global.fetch(self._opts.url, {
			method: self._opts.method,
			headers: headers,
			body: body,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin'
		}).then(function (response) {
			self._fetchResponse = response
			self._connect()
		}, function (reason) {
			self.emit('error', reason)
		})
	} else {
		var xhr = self._xhr = new global.XMLHttpRequest()
		try {
			xhr.open(self._opts.method, self._opts.url, true)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode.split(':')[0]

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		Object.keys(headersObj).forEach(function (name) {
			xhr.setRequestHeader(headersObj[name].name, headersObj[name].value)
		})

		self._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					self._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._onXHRProgress()
			}
		}

		xhr.onerror = function () {
			if (self._destroyed)
				return
			self.emit('error', new Error('XHR error'))
		}

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}
	}
}

/**
 * Checks if xhr.status is readable and non-zero, indicating no error.
 * Even though the spec says it should be available in readyState 3,
 * accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		var status = xhr.status
		return (status !== null && status !== 0)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	var self = this

	if (!statusValid(self._xhr) || self._destroyed)
		return

	if (!self._response)
		self._connect()

	self._response._onXHRProgress()
}

ClientRequest.prototype._connect = function () {
	var self = this

	if (self._destroyed)
		return

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode)
	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
	var self = this
	self._destroyed = true
	if (self._response)
		self._response._destroyed = true
	if (self._xhr)
		self._xhr.abort()
	// Currently, there isn't a way to truly abort a fetch.
	// If you like bikeshedding, see https://github.com/whatwg/fetch/issues/27
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	stream.Writable.prototype.end.call(self, data, encoding, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'user-agent',
	'via'
]

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":58,"./response":60,"_process":37,"buffer":29,"inherits":35,"stream":56,"to-arraybuffer":62}],60:[function(require,module,exports){
(function (process,global,Buffer){
var capability = require('./capability')
var inherits = require('inherits')
var stream = require('stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	// Fake the 'close' event, but only once 'end' fires
	self.on('end', function () {
		// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
		process.nextTick(function () {
			self.emit('close')
		})
	})

	if (mode === 'fetch') {
		self._fetchResponse = response

		self.statusCode = response.status
		self.statusMessage = response.statusText
		// backwards compatible version of for (<item> of <iterable>):
		// for (var <item>,_i,_it = <iterable>[Symbol.iterator](); <item> = (_i = _it.next()).value,!_i.done;)
		for (var header, _i, _it = response.headers[Symbol.iterator](); header = (_i = _it.next()).value, !_i.done;) {
			self.headers[header[0].toLowerCase()] = header[1]
			self.rawHeaders.push(header[0], header[1])
		}

		// TODO: this doesn't respect backpressure. Once WritableStream is available, this can be fixed
		var reader = response.body.getReader()
		function read () {
			reader.read().then(function (result) {
				if (self._destroyed)
					return
				if (result.done) {
					self.push(null)
					return
				}
				self.push(new Buffer(result.value))
				read()
			})
		}
		read()

	} else {
		self._xhr = xhr
		self._pos = 0

		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		headers.forEach(function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				if (key === 'set-cookie') {
					if (self.headers[key] === undefined) {
						self.headers[key] = []
					}
					self.headers[key].push(matches[2])
				} else if (self.headers[key] !== undefined) {
					self.headers[key] += ', ' + matches[2]
				} else {
					self.headers[key] = matches[2]
				}
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {}

IncomingMessage.prototype._onXHRProgress = function () {
	var self = this

	var xhr = self._xhr

	var response = null
	switch (self._mode) {
		case 'text:vbarray': // For IE9
			if (xhr.readyState !== rStates.DONE)
				break
			try {
				// This fails in IE8
				response = new global.VBArray(xhr.responseBody).toArray()
			} catch (e) {}
			if (response !== null) {
				self.push(new Buffer(response))
				break
			}
			// Falls through in IE8	
		case 'text':
			try { // This will fail when readyState = 3 in IE9. Switch mode and wait for readyState = 4
				response = xhr.responseText
			} catch (e) {
				self._mode = 'text:vbarray'
				break
			}
			if (response.length > self._pos) {
				var newData = response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = new Buffer(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE)
				break
			response = xhr.response
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			self.push(new Buffer(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new global.MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(new Buffer(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				self.push(null)
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		self.push(null)
	}
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":58,"_process":37,"buffer":29,"inherits":35,"stream":56}],61:[function(require,module,exports){
module.exports = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}

},{}],62:[function(require,module,exports){
var Buffer = require('buffer').Buffer

module.exports = function (buf) {
	// If the buffer is backed by a Uint8Array, a faster version will work
	if (buf instanceof Uint8Array) {
		// If the buffer isn't a subarray, return the underlying ArrayBuffer
		if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
			return buf.buffer
		} else if (typeof buf.buffer.slice === 'function') {
			// Otherwise we need to get a proper copy
			return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
		}
	}

	if (Buffer.isBuffer(buf)) {
		// This is the slow version that will work with any Buffer
		// implementation (even in old browsers)
		var arrayCopy = new Uint8Array(buf.length)
		var len = buf.length
		for (var i = 0; i < len; i++) {
			arrayCopy[i] = buf[i]
		}
		return arrayCopy.buffer
	} else {
		throw new Error('Argument must be a Buffer')
	}
}

},{"buffer":29}],63:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":29}],64:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":65,"punycode":38,"querystring":41}],65:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],66:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],67:[function(require,module,exports){

var statuses = require('statuses');
var inherits = require('inherits');

function toIdentifier(str) {
  return str.split(' ').map(function (token) {
    return token.slice(0, 1).toUpperCase() + token.slice(1)
  }).join('').replace(/[^ _0-9a-z]/gi, '')
}

exports = module.exports = function httpError() {
  // so much arity going on ~_~
  var err;
  var msg;
  var status = 500;
  var props = {};
  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    if (arg instanceof Error) {
      err = arg;
      status = err.status || err.statusCode || status;
      continue;
    }
    switch (typeof arg) {
      case 'string':
        msg = arg;
        break;
      case 'number':
        status = arg;
        break;
      case 'object':
        props = arg;
        break;
    }
  }

  if (typeof status !== 'number' || !statuses[status]) {
    status = 500
  }

  // constructor
  var HttpError = exports[status]

  if (!err) {
    // create error
    err = HttpError
      ? new HttpError(msg)
      : new Error(msg || statuses[status])
    Error.captureStackTrace(err, httpError)
  }

  if (!HttpError || !(err instanceof HttpError)) {
    // add properties to generic error
    err.expose = status < 500
    err.status = err.statusCode = status
  }

  for (var key in props) {
    if (key !== 'status' && key !== 'statusCode') {
      err[key] = props[key]
    }
  }

  return err;
};

// create generic error objects
var codes = statuses.codes.filter(function (num) {
  return num >= 400;
});

codes.forEach(function (code) {
  var name = toIdentifier(statuses[code])
  var className = name.match(/Error$/) ? name : name + 'Error'

  if (code >= 500) {
    var ServerError = function ServerError(msg) {
      var self = new Error(msg != null ? msg : statuses[code])
      Error.captureStackTrace(self, ServerError)
      self.__proto__ = ServerError.prototype
      Object.defineProperty(self, 'name', {
        enumerable: false,
        configurable: true,
        value: className,
        writable: true
      })
      return self
    }
    inherits(ServerError, Error);
    ServerError.prototype.status =
    ServerError.prototype.statusCode = code;
    ServerError.prototype.expose = false;
    exports[code] =
    exports[name] = ServerError
    return;
  }

  var ClientError = function ClientError(msg) {
    var self = new Error(msg != null ? msg : statuses[code])
    Error.captureStackTrace(self, ClientError)
    self.__proto__ = ClientError.prototype
    Object.defineProperty(self, 'name', {
      enumerable: false,
      configurable: true,
      value: className,
      writable: true
    })
    return self
  }
  inherits(ClientError, Error);
  ClientError.prototype.status =
  ClientError.prototype.statusCode = code;
  ClientError.prototype.expose = true;
  exports[code] =
  exports[name] = ClientError
  return;
});

// backwards-compatibility
exports["I'mateapot"] = exports.ImATeapot

},{"inherits":68,"statuses":73}],68:[function(require,module,exports){
arguments[4][35][0].apply(exports,arguments)
},{"dup":35}],69:[function(require,module,exports){
(function (process){
module.exports = process.env.LINKEDLIST_COV
   ? require('./lib-cov/linkedlist')
   : require('./lib/linkedlist')
}).call(this,require('_process'))
},{"./lib-cov/linkedlist":70,"./lib/linkedlist":71,"_process":37}],70:[function(require,module,exports){
/* automatically generated by JSCoverage - do not edit */
if (typeof _$jscoverage === 'undefined') _$jscoverage = {};
if (! _$jscoverage['linkedlist.js']) {
  _$jscoverage['linkedlist.js'] = [];
  _$jscoverage['linkedlist.js'][1] = 0;
  _$jscoverage['linkedlist.js'][2] = 0;
  _$jscoverage['linkedlist.js'][8] = 0;
  _$jscoverage['linkedlist.js'][14] = 0;
  _$jscoverage['linkedlist.js'][20] = 0;
  _$jscoverage['linkedlist.js'][28] = 0;
  _$jscoverage['linkedlist.js'][29] = 0;
  _$jscoverage['linkedlist.js'][32] = 0;
  _$jscoverage['linkedlist.js'][33] = 0;
  _$jscoverage['linkedlist.js'][36] = 0;
  _$jscoverage['linkedlist.js'][37] = 0;
  _$jscoverage['linkedlist.js'][40] = 0;
  _$jscoverage['linkedlist.js'][41] = 0;
  _$jscoverage['linkedlist.js'][44] = 0;
  _$jscoverage['linkedlist.js'][45] = 0;
  _$jscoverage['linkedlist.js'][46] = 0;
  _$jscoverage['linkedlist.js'][47] = 0;
  _$jscoverage['linkedlist.js'][48] = 0;
  _$jscoverage['linkedlist.js'][49] = 0;
  _$jscoverage['linkedlist.js'][51] = 0;
  _$jscoverage['linkedlist.js'][54] = 0;
  _$jscoverage['linkedlist.js'][55] = 0;
  _$jscoverage['linkedlist.js'][56] = 0;
  _$jscoverage['linkedlist.js'][57] = 0;
  _$jscoverage['linkedlist.js'][59] = 0;
  _$jscoverage['linkedlist.js'][60] = 0;
  _$jscoverage['linkedlist.js'][61] = 0;
  _$jscoverage['linkedlist.js'][62] = 0;
  _$jscoverage['linkedlist.js'][64] = 0;
  _$jscoverage['linkedlist.js'][65] = 0;
  _$jscoverage['linkedlist.js'][66] = 0;
  _$jscoverage['linkedlist.js'][67] = 0;
  _$jscoverage['linkedlist.js'][68] = 0;
  _$jscoverage['linkedlist.js'][70] = 0;
  _$jscoverage['linkedlist.js'][73] = 0;
  _$jscoverage['linkedlist.js'][74] = 0;
  _$jscoverage['linkedlist.js'][75] = 0;
  _$jscoverage['linkedlist.js'][76] = 0;
  _$jscoverage['linkedlist.js'][78] = 0;
  _$jscoverage['linkedlist.js'][79] = 0;
  _$jscoverage['linkedlist.js'][80] = 0;
  _$jscoverage['linkedlist.js'][81] = 0;
  _$jscoverage['linkedlist.js'][83] = 0;
  _$jscoverage['linkedlist.js'][84] = 0;
  _$jscoverage['linkedlist.js'][85] = 0;
  _$jscoverage['linkedlist.js'][86] = 0;
  _$jscoverage['linkedlist.js'][88] = 0;
  _$jscoverage['linkedlist.js'][91] = 0;
  _$jscoverage['linkedlist.js'][92] = 0;
  _$jscoverage['linkedlist.js'][93] = 0;
  _$jscoverage['linkedlist.js'][94] = 0;
  _$jscoverage['linkedlist.js'][95] = 0;
  _$jscoverage['linkedlist.js'][97] = 0;
  _$jscoverage['linkedlist.js'][100] = 0;
  _$jscoverage['linkedlist.js'][101] = 0;
  _$jscoverage['linkedlist.js'][102] = 0;
  _$jscoverage['linkedlist.js'][103] = 0;
  _$jscoverage['linkedlist.js'][106] = 0;
  _$jscoverage['linkedlist.js'][107] = 0;
  _$jscoverage['linkedlist.js'][108] = 0;
  _$jscoverage['linkedlist.js'][109] = 0;
  _$jscoverage['linkedlist.js'][111] = 0;
  _$jscoverage['linkedlist.js'][112] = 0;
  _$jscoverage['linkedlist.js'][113] = 0;
  _$jscoverage['linkedlist.js'][115] = 0;
  _$jscoverage['linkedlist.js'][117] = 0;
  _$jscoverage['linkedlist.js'][118] = 0;
  _$jscoverage['linkedlist.js'][119] = 0;
  _$jscoverage['linkedlist.js'][120] = 0;
  _$jscoverage['linkedlist.js'][121] = 0;
  _$jscoverage['linkedlist.js'][124] = 0;
  _$jscoverage['linkedlist.js'][125] = 0;
  _$jscoverage['linkedlist.js'][126] = 0;
  _$jscoverage['linkedlist.js'][127] = 0;
  _$jscoverage['linkedlist.js'][129] = 0;
  _$jscoverage['linkedlist.js'][130] = 0;
  _$jscoverage['linkedlist.js'][131] = 0;
  _$jscoverage['linkedlist.js'][132] = 0;
  _$jscoverage['linkedlist.js'][134] = 0;
  _$jscoverage['linkedlist.js'][135] = 0;
  _$jscoverage['linkedlist.js'][136] = 0;
  _$jscoverage['linkedlist.js'][137] = 0;
  _$jscoverage['linkedlist.js'][138] = 0;
  _$jscoverage['linkedlist.js'][139] = 0;
  _$jscoverage['linkedlist.js'][140] = 0;
  _$jscoverage['linkedlist.js'][141] = 0;
  _$jscoverage['linkedlist.js'][143] = 0;
  _$jscoverage['linkedlist.js'][144] = 0;
  _$jscoverage['linkedlist.js'][145] = 0;
  _$jscoverage['linkedlist.js'][147] = 0;
  _$jscoverage['linkedlist.js'][148] = 0;
  _$jscoverage['linkedlist.js'][151] = 0;
  _$jscoverage['linkedlist.js'][152] = 0;
  _$jscoverage['linkedlist.js'][153] = 0;
  _$jscoverage['linkedlist.js'][154] = 0;
  _$jscoverage['linkedlist.js'][155] = 0;
  _$jscoverage['linkedlist.js'][156] = 0;
  _$jscoverage['linkedlist.js'][160] = 0;
  _$jscoverage['linkedlist.js'][161] = 0;
  _$jscoverage['linkedlist.js'][162] = 0;
  _$jscoverage['linkedlist.js'][165] = 0;
  _$jscoverage['linkedlist.js'][166] = 0;
  _$jscoverage['linkedlist.js'][167] = 0;
  _$jscoverage['linkedlist.js'][168] = 0;
  _$jscoverage['linkedlist.js'][169] = 0;
  _$jscoverage['linkedlist.js'][170] = 0;
}
_$jscoverage['linkedlist.js'][1]++;
module.exports = (function () {
  _$jscoverage['linkedlist.js'][2]++;
  Object.defineProperty(this, "_head", {value: undefined, writable: true, enumerable: false, configurable: false});
  _$jscoverage['linkedlist.js'][8]++;
  Object.defineProperty(this, "_tail", {value: undefined, writable: true, enumerable: false, configurable: false});
  _$jscoverage['linkedlist.js'][14]++;
  Object.defineProperty(this, "_next", {value: undefined, writable: true, enumerable: false, configurable: false});
  _$jscoverage['linkedlist.js'][20]++;
  Object.defineProperty(this, "_length", {value: 0, writable: true, enumerable: false, configurable: false});
});
_$jscoverage['linkedlist.js'][28]++;
module.exports.prototype.__defineGetter__("head", (function () {
  _$jscoverage['linkedlist.js'][29]++;
  return this._head && this._head.data;
}));
_$jscoverage['linkedlist.js'][32]++;
module.exports.prototype.__defineGetter__("tail", (function () {
  _$jscoverage['linkedlist.js'][33]++;
  return this._tail && this._tail.data;
}));
_$jscoverage['linkedlist.js'][36]++;
module.exports.prototype.__defineGetter__("current", (function () {
  _$jscoverage['linkedlist.js'][37]++;
  return this._current && this._current.data;
}));
_$jscoverage['linkedlist.js'][40]++;
module.exports.prototype.__defineGetter__("length", (function () {
  _$jscoverage['linkedlist.js'][41]++;
  return this._length;
}));
_$jscoverage['linkedlist.js'][44]++;
module.exports.prototype.push = (function (data) {
  _$jscoverage['linkedlist.js'][45]++;
  this._tail = new Item(data, this._tail);
  _$jscoverage['linkedlist.js'][46]++;
  if (this._length === 0) {
    _$jscoverage['linkedlist.js'][47]++;
    this._head = this._tail;
    _$jscoverage['linkedlist.js'][48]++;
    this._current = this._head;
    _$jscoverage['linkedlist.js'][49]++;
    this._next = this._head;
  }
  _$jscoverage['linkedlist.js'][51]++;
  this._length++;
});
_$jscoverage['linkedlist.js'][54]++;
module.exports.prototype.pop = (function () {
  _$jscoverage['linkedlist.js'][55]++;
  var tail = this._tail;
  _$jscoverage['linkedlist.js'][56]++;
  if (this._length === 0) {
    _$jscoverage['linkedlist.js'][57]++;
    return;
  }
  _$jscoverage['linkedlist.js'][59]++;
  this._length--;
  _$jscoverage['linkedlist.js'][60]++;
  if (this._length === 0) {
    _$jscoverage['linkedlist.js'][61]++;
    this._head = this._tail = this._current = this._next = undefined;
    _$jscoverage['linkedlist.js'][62]++;
    return tail.data;
  }
  _$jscoverage['linkedlist.js'][64]++;
  this._tail = tail.prev;
  _$jscoverage['linkedlist.js'][65]++;
  this._tail.next = undefined;
  _$jscoverage['linkedlist.js'][66]++;
  if (this._current === tail) {
    _$jscoverage['linkedlist.js'][67]++;
    this._current = this._tail;
    _$jscoverage['linkedlist.js'][68]++;
    this._next = undefined;
  }
  _$jscoverage['linkedlist.js'][70]++;
  return tail.data;
});
_$jscoverage['linkedlist.js'][73]++;
module.exports.prototype.shift = (function () {
  _$jscoverage['linkedlist.js'][74]++;
  var head = this._head;
  _$jscoverage['linkedlist.js'][75]++;
  if (this._length === 0) {
    _$jscoverage['linkedlist.js'][76]++;
    return;
  }
  _$jscoverage['linkedlist.js'][78]++;
  this._length--;
  _$jscoverage['linkedlist.js'][79]++;
  if (this._length === 0) {
    _$jscoverage['linkedlist.js'][80]++;
    this._head = this._tail = this._current = this._next = undefined;
    _$jscoverage['linkedlist.js'][81]++;
    return head.data;
  }
  _$jscoverage['linkedlist.js'][83]++;
  this._head = this._head.next;
  _$jscoverage['linkedlist.js'][84]++;
  if (this._current === head) {
    _$jscoverage['linkedlist.js'][85]++;
    this._current = this._head;
    _$jscoverage['linkedlist.js'][86]++;
    this._next = this._current.next;
  }
  _$jscoverage['linkedlist.js'][88]++;
  return head.data;
});
_$jscoverage['linkedlist.js'][91]++;
module.exports.prototype.unshift = (function (data) {
  _$jscoverage['linkedlist.js'][92]++;
  this._head = new Item(data, undefined, this._head);
  _$jscoverage['linkedlist.js'][93]++;
  if (this._length === 0) {
    _$jscoverage['linkedlist.js'][94]++;
    this._tail = this._head;
    _$jscoverage['linkedlist.js'][95]++;
    this._next = this._head;
  }
  _$jscoverage['linkedlist.js'][97]++;
  this._length++;
});
_$jscoverage['linkedlist.js'][100]++;
module.exports.prototype.unshiftCurrent = (function () {
  _$jscoverage['linkedlist.js'][101]++;
  var current = this._current;
  _$jscoverage['linkedlist.js'][102]++;
  if (current === this._head || this._length < 2) {
    _$jscoverage['linkedlist.js'][103]++;
    return current && current.data;
  }
  _$jscoverage['linkedlist.js'][106]++;
  if (current === this._tail) {
    _$jscoverage['linkedlist.js'][107]++;
    this._tail = current.prev;
    _$jscoverage['linkedlist.js'][108]++;
    this._tail.next = undefined;
    _$jscoverage['linkedlist.js'][109]++;
    this._current = this._tail;
  }
  else {
    _$jscoverage['linkedlist.js'][111]++;
    current.next.prev = current.prev;
    _$jscoverage['linkedlist.js'][112]++;
    current.prev.next = current.next;
    _$jscoverage['linkedlist.js'][113]++;
    this._current = current.prev;
  }
  _$jscoverage['linkedlist.js'][115]++;
  this._next = this._current.next;
  _$jscoverage['linkedlist.js'][117]++;
  current.next = this._head;
  _$jscoverage['linkedlist.js'][118]++;
  current.prev = undefined;
  _$jscoverage['linkedlist.js'][119]++;
  this._head.prev = current;
  _$jscoverage['linkedlist.js'][120]++;
  this._head = current;
  _$jscoverage['linkedlist.js'][121]++;
  return current.data;
});
_$jscoverage['linkedlist.js'][124]++;
module.exports.prototype.removeCurrent = (function (data) {
  _$jscoverage['linkedlist.js'][125]++;
  var current = this._current;
  _$jscoverage['linkedlist.js'][126]++;
  if (this._length === 0) {
    _$jscoverage['linkedlist.js'][127]++;
    return;
  }
  _$jscoverage['linkedlist.js'][129]++;
  this._length--;
  _$jscoverage['linkedlist.js'][130]++;
  if (this._length === 0) {
    _$jscoverage['linkedlist.js'][131]++;
    this._head = this._tail = this._current = this._next = undefined;
    _$jscoverage['linkedlist.js'][132]++;
    return current.data;
  }
  _$jscoverage['linkedlist.js'][134]++;
  if (current === this._tail) {
    _$jscoverage['linkedlist.js'][135]++;
    this._tail = current.prev;
    _$jscoverage['linkedlist.js'][136]++;
    this._tail.next = undefined;
    _$jscoverage['linkedlist.js'][137]++;
    this._current = this._tail;
  }
  else {
    _$jscoverage['linkedlist.js'][138]++;
    if (current === this._head) {
      _$jscoverage['linkedlist.js'][139]++;
      this._head = current.next;
      _$jscoverage['linkedlist.js'][140]++;
      this._head.prev = undefined;
      _$jscoverage['linkedlist.js'][141]++;
      this._current = this._head;
    }
    else {
      _$jscoverage['linkedlist.js'][143]++;
      current.next.prev = current.prev;
      _$jscoverage['linkedlist.js'][144]++;
      current.prev.next = current.next;
      _$jscoverage['linkedlist.js'][145]++;
      this._current = current.prev;
    }
  }
  _$jscoverage['linkedlist.js'][147]++;
  this._next = this._current.next;
  _$jscoverage['linkedlist.js'][148]++;
  return current.data;
});
_$jscoverage['linkedlist.js'][151]++;
module.exports.prototype.next = (function () {
  _$jscoverage['linkedlist.js'][152]++;
  var next = this._next;
  _$jscoverage['linkedlist.js'][153]++;
  if (next !== undefined) {
    _$jscoverage['linkedlist.js'][154]++;
    this._next = next.next;
    _$jscoverage['linkedlist.js'][155]++;
    this._current = next;
    _$jscoverage['linkedlist.js'][156]++;
    return next.data;
  }
});
_$jscoverage['linkedlist.js'][160]++;
module.exports.prototype.resetCursor = (function () {
  _$jscoverage['linkedlist.js'][161]++;
  this._current = this._next = this._head;
  _$jscoverage['linkedlist.js'][162]++;
  return this;
});
_$jscoverage['linkedlist.js'][165]++;
function Item(data, prev, next) {
  _$jscoverage['linkedlist.js'][166]++;
  this.next = next;
  _$jscoverage['linkedlist.js'][167]++;
  if (next) {
    _$jscoverage['linkedlist.js'][167]++;
    next.prev = this;
  }
  _$jscoverage['linkedlist.js'][168]++;
  this.prev = prev;
  _$jscoverage['linkedlist.js'][169]++;
  if (prev) {
    _$jscoverage['linkedlist.js'][169]++;
    prev.next = this;
  }
  _$jscoverage['linkedlist.js'][170]++;
  this.data = data;
}
_$jscoverage['linkedlist.js'].source = ["module.exports = function () {","  Object.defineProperty(this, '_head', {","    value: undefined,","    writable: true,","    enumerable: false,","    configurable: false","  })","  Object.defineProperty(this, '_tail', {","    value: undefined,","    writable: true,","    enumerable: false,","    configurable: false","  })","  Object.defineProperty(this, '_next', {","    value: undefined,","    writable: true,","    enumerable: false,","    configurable: false","  })","  Object.defineProperty(this, '_length', {","    value: 0,","    writable: true,","    enumerable: false,","    configurable: false","  })","}","","module.exports.prototype.__defineGetter__('head', function () {","  return this._head &amp;&amp; this._head.data","})","","module.exports.prototype.__defineGetter__('tail', function () {","  return this._tail &amp;&amp; this._tail.data","})","","module.exports.prototype.__defineGetter__('current', function () {","  return this._current &amp;&amp; this._current.data","})","","module.exports.prototype.__defineGetter__('length', function () {","  return this._length","})","","module.exports.prototype.push = function (data) {","  this._tail = new Item(data, this._tail)","  if (this._length === 0) {","    this._head = this._tail","    this._current = this._head","    this._next = this._head","  }","  this._length++","}","","module.exports.prototype.pop = function () {","  var tail = this._tail","  if (this._length === 0) {","    return","  }","  this._length--","  if (this._length === 0) {","    this._head = this._tail = this._current = this._next = undefined","    return tail.data","  }","  this._tail = tail.prev","  this._tail.next = undefined","  if (this._current === tail) {","    this._current = this._tail","    this._next = undefined","  }","  return tail.data","}","","module.exports.prototype.shift = function () {","  var head = this._head","  if (this._length === 0)  {","    return","  }","  this._length--","  if (this._length === 0) {","    this._head = this._tail = this._current = this._next = undefined","    return head.data","  }","  this._head = this._head.next","  if (this._current === head) {","    this._current = this._head","    this._next = this._current.next","  }","  return head.data","}","","module.exports.prototype.unshift = function (data) {","  this._head = new Item(data, undefined, this._head)","  if (this._length === 0)  {","    this._tail = this._head","    this._next = this._head","  }","  this._length++","}","","module.exports.prototype.unshiftCurrent = function () {","  var current = this._current","  if (current === this._head || this._length &lt; 2) {","    return current &amp;&amp; current.data","  }","  // remove","  if (current === this._tail) {","    this._tail = current.prev","    this._tail.next = undefined","    this._current = this._tail","  } else {","    current.next.prev = current.prev","    current.prev.next = current.next","    this._current = current.prev","  }","  this._next = this._current.next","  // unshift","  current.next = this._head","  current.prev = undefined","  this._head.prev = current","  this._head = current","  return current.data","}","","module.exports.prototype.removeCurrent = function (data) {","  var current = this._current","  if (this._length === 0) {","    return","  }","  this._length--","  if (this._length === 0) {","    this._head = this._tail = this._current = this._next = undefined","    return current.data","  }","  if (current === this._tail) {","    this._tail = current.prev","    this._tail.next = undefined","    this._current = this._tail","  } else if (current === this._head) {","    this._head = current.next","    this._head.prev = undefined","    this._current = this._head","  } else {","    current.next.prev = current.prev","    current.prev.next = current.next","    this._current = current.prev","  }","  this._next = this._current.next","  return current.data","}","","module.exports.prototype.next = function () {","  var next = this._next","  if (next !== undefined) {","    this._next = next.next","    this._current = next","    return next.data","  }","}","","module.exports.prototype.resetCursor = function () {","  this._current = this._next = this._head","  return this","}","","function Item (data, prev, next) {","  this.next = next","  if (next) next.prev = this","  this.prev = prev","  if (prev) prev.next = this","  this.data = data","}"];

},{}],71:[function(require,module,exports){
module.exports = function () {
  Object.defineProperty(this, '_head', {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: false
  })
  Object.defineProperty(this, '_tail', {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: false
  })
  Object.defineProperty(this, '_next', {
    value: undefined,
    writable: true,
    enumerable: false,
    configurable: false
  })
  Object.defineProperty(this, '_length', {
    value: 0,
    writable: true,
    enumerable: false,
    configurable: false
  })
}

module.exports.prototype.__defineGetter__('head', function () {
  return this._head && this._head.data
})

module.exports.prototype.__defineGetter__('tail', function () {
  return this._tail && this._tail.data
})

module.exports.prototype.__defineGetter__('current', function () {
  return this._current && this._current.data
})

module.exports.prototype.__defineGetter__('length', function () {
  return this._length
})

module.exports.prototype.push = function (data) {
  this._tail = new Item(data, this._tail)
  if (this._length === 0) {
    this._head = this._tail
    this._current = this._head
    this._next = this._head
  }
  this._length++
}

module.exports.prototype.pop = function () {
  var tail = this._tail
  if (this._length === 0) {
    return
  }
  this._length--
  if (this._length === 0) {
    this._head = this._tail = this._current = this._next = undefined
    return tail.data
  }
  this._tail = tail.prev
  this._tail.next = undefined
  if (this._current === tail) {
    this._current = this._tail
    this._next = undefined
  }
  return tail.data
}

module.exports.prototype.shift = function () {
  var head = this._head
  if (this._length === 0)  {
    return
  }
  this._length--
  if (this._length === 0) {
    this._head = this._tail = this._current = this._next = undefined
    return head.data
  }
  this._head = this._head.next
  if (this._current === head) {
    this._current = this._head
    this._next = this._current.next
  }
  return head.data
}

module.exports.prototype.unshift = function (data) {
  this._head = new Item(data, undefined, this._head)
  if (this._length === 0)  {
    this._tail = this._head
    this._next = this._head
  }
  this._length++
}

module.exports.prototype.unshiftCurrent = function () {
  var current = this._current
  if (current === this._head || this._length < 2) {
    return current && current.data
  }
  // remove
  if (current === this._tail) {
    this._tail = current.prev
    this._tail.next = undefined
    this._current = this._tail
  } else {
    current.next.prev = current.prev
    current.prev.next = current.next
    this._current = current.prev
  }
  this._next = this._current.next
  // unshift
  current.next = this._head
  current.prev = undefined
  this._head.prev = current
  this._head = current
  return current.data
}

module.exports.prototype.removeCurrent = function (data) {
  var current = this._current
  if (this._length === 0) {
    return
  }
  this._length--
  if (this._length === 0) {
    this._head = this._tail = this._current = this._next = undefined
    return current.data
  }
  if (current === this._tail) {
    this._tail = current.prev
    this._tail.next = undefined
    this._current = this._tail
  } else if (current === this._head) {
    this._head = current.next
    this._head.prev = undefined
    this._current = this._head
  } else {
    current.next.prev = current.prev
    current.prev.next = current.next
    this._current = current.prev
  }
  this._next = this._current.next
  return current.data
}

module.exports.prototype.next = function () {
  var next = this._next
  if (next !== undefined) {
    this._next = next.next
    this._current = next
    return next.data
  }
}

module.exports.prototype.resetCursor = function () {
  this._current = this._next = this._head
  return this
}

function Item (data, prev, next) {
  this.next = next
  if (next) next.prev = this
  this.prev = prev
  if (prev) prev.next = this
  this.data = data
}
},{}],72:[function(require,module,exports){
module.exports={
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "306": "(Unused)",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}
},{}],73:[function(require,module,exports){

var codes = require('./codes.json');

module.exports = status;

// [Integer...]
status.codes = Object.keys(codes).map(function (code) {
  code = ~~code;
  var msg = codes[code];
  status[code] = msg;
  status[msg] = status[msg.toLowerCase()] = code;
  return code;
});

// status codes for redirects
status.redirect = {
  300: true,
  301: true,
  302: true,
  303: true,
  305: true,
  307: true,
  308: true,
};

// status codes for empty bodies
status.empty = {
  204: true,
  205: true,
  304: true,
};

// status codes for when you should retry the request
status.retry = {
  502: true,
  503: true,
  504: true,
};

function status(code) {
  if (typeof code === 'number') {
    if (!status[code]) throw new Error('invalid status code: ' + code);
    return code;
  }

  if (typeof code !== 'string') {
    throw new TypeError('code must be a number or string');
  }

  // '403'
  var n = parseInt(code, 10)
  if (!isNaN(n)) {
    if (!status[n]) throw new Error('invalid status code: ' + n);
    return n;
  }

  n = status[code.toLowerCase()];
  if (!n) throw new Error('invalid status message: "' + code + '"');
  return n;
}

},{"./codes.json":72}],74:[function(require,module,exports){
// import
var Layer   = require('./layer')
,   Network = require('./network')
,   Trainer = require('./trainer')

/*******************************************************************************************
                                        ARCHITECT
*******************************************************************************************/

// Colection of useful built-in architectures
var Architect = {

  // Multilayer Perceptron
  Perceptron: function Perceptron() {

    var args = Array.prototype.slice.call(arguments); // convert arguments to Array
    if (args.length < 3)
      throw new Error("not enough layers (minimum 3) !!");

    var inputs = args.shift(); // first argument
    var outputs = args.pop(); // last argument
    var layers = args; // all the arguments in the middle

    var input = new Layer(inputs);
    var hidden = [];
    var output = new Layer(outputs);

    var previous = input;

    // generate hidden layers
    for (level in layers) {
      var size = layers[level];
      var layer = new Layer(size);
      hidden.push(layer);
      previous.project(layer);
      previous = layer;
    }
    previous.project(output);

    // set layers of the neural network
    this.set({
      input: input,
      hidden: hidden,
      output: output
    });

    // trainer for the network
    this.trainer = new Trainer(this);
  },

  // Multilayer Long Short-Term Memory
  LSTM: function LSTM() {

    var args = Array.prototype.slice.call(arguments); // convert arguments to array
    if (args.length < 3)
      throw new Error("not enough layers (minimum 3) !!");

    var last = args.pop();
    var option = {
      peepholes: Layer.connectionType.ALL_TO_ALL,
      hiddenToHidden: false,
      outputToHidden: false,
      outputToGates: false,
      inputToOutput: true,
    };
    if (typeof last != 'number') {
      var outputs = args.pop();
      if (last.hasOwnProperty('peepholes'))
        option.peepholes = last.peepholes;
      if (last.hasOwnProperty('hiddenToHidden'))
        option.hiddenToHidden = last.hiddenToHidden;
      if (last.hasOwnProperty('outputToHidden'))
        option.outputToHidden = last.outputToHidden;
      if (last.hasOwnProperty('outputToGates'))
        option.outputToGates = last.outputToGates;
      if (last.hasOwnProperty('inputToOutput'))
        option.inputToOutput = last.inputToOutput;
    } else
      var outputs = last;

    var inputs = args.shift();
    var layers = args;

    var inputLayer = new Layer(inputs);
    var hiddenLayers = [];
    var outputLayer = new Layer(outputs);

    var previous = null;

    // generate layers
    for (var layer in layers) {
      // generate memory blocks (memory cell and respective gates)
      var size = layers[layer];

      var inputGate = new Layer(size).set({
        bias: 1
      });
      var forgetGate = new Layer(size).set({
        bias: 1
      });
      var memoryCell = new Layer(size);
      var outputGate = new Layer(size).set({
        bias: 1
      });

      hiddenLayers.push(inputGate);
      hiddenLayers.push(forgetGate);
      hiddenLayers.push(memoryCell);
      hiddenLayers.push(outputGate);

      // connections from input layer
      var input = inputLayer.project(memoryCell);
      inputLayer.project(inputGate);
      inputLayer.project(forgetGate);
      inputLayer.project(outputGate);

      // connections from previous memory-block layer to this one
      if (previous != null) {
        var cell = previous.project(memoryCell);
        previous.project(inputGate);
        previous.project(forgetGate);
        previous.project(outputGate);
      }

      // connections from memory cell
      var output = memoryCell.project(outputLayer);

      // self-connection
      var self = memoryCell.project(memoryCell);

      // hidden to hidden recurrent connection
      if (option.hiddenToHidden)
        memoryCell.project(memoryCell, Layer.connectionType.ALL_TO_ELSE);

      // out to hidden recurrent connection
      if (option.outputToHidden)
        outputLayer.project(memoryCell);

      // out to gates recurrent connection
      if (option.outputToGates) {
        outputLayer.project(inputGate);
        outputLayer.project(outputGate);
        outputLayer.project(forgetGate);
      }

      // peepholes
      memoryCell.project(inputGate, option.peepholes);
      memoryCell.project(forgetGate, option.peepholes);
      memoryCell.project(outputGate, option.peepholes);

      // gates
      inputGate.gate(input, Layer.gateType.INPUT);
      forgetGate.gate(self, Layer.gateType.ONE_TO_ONE);
      outputGate.gate(output, Layer.gateType.OUTPUT);
      if (previous != null)
        inputGate.gate(cell, Layer.gateType.INPUT);

      previous = memoryCell;
    }

    // input to output direct connection
    if (option.inputToOutput)
      inputLayer.project(outputLayer);

    // set the layers of the neural network
    this.set({
      input: inputLayer,
      hidden: hiddenLayers,
      output: outputLayer
    });

    // trainer
    this.trainer = new Trainer(this);
  },

  // Liquid State Machine
  Liquid: function Liquid(inputs, hidden, outputs, connections, gates) {

    // create layers
    var inputLayer = new Layer(inputs);
    var hiddenLayer = new Layer(hidden);
    var outputLayer = new Layer(outputs);

    // make connections and gates randomly among the neurons
    var neurons = hiddenLayer.neurons();
    var connectionList = [];

    for (var i = 0; i < connections; i++) {
      // connect two random neurons
      var from = Math.random() * neurons.length | 0;
      var to = Math.random() * neurons.length | 0;
      var connection = neurons[from].project(neurons[to]);
      connectionList.push(connection);
    }

    for (var j = 0; j < gates; j++) {
      // pick a random gater neuron
      var gater = Math.random() * neurons.length | 0;
      // pick a random connection to gate
      var connection = Math.random() * connectionList.length | 0;
      // let the gater gate the connection
      neurons[gater].gate(connectionList[connection]);
    }

    // connect the layers
    inputLayer.project(hiddenLayer);
    hiddenLayer.project(outputLayer);

    // set the layers of the network
    this.set({
      input: inputLayer,
      hidden: [hiddenLayer],
      output: outputLayer
    });

    // trainer
    this.trainer = new Trainer(this);
  },

  Hopfield: function Hopfield(size)
  {
    var inputLayer = new Layer(size);
    var outputLayer = new Layer(size);

    inputLayer.project(outputLayer, Layer.connectionType.ALL_TO_ALL);

    this.set({
      input: inputLayer,
      hidden: [],
      output: outputLayer
    });

    var trainer = new Trainer(this);

    var proto = Architect.Hopfield.prototype;

    proto.learn = proto.learn || function(patterns)
    {
      var set = [];
      for (var p in patterns)
        set.push({
          input: patterns[p],
          output: patterns[p]
        });

      return trainer.train(set, {
        iterations: 500000,
        error: .00005,
        rate: 1
      });
    }

    proto.feed = proto.feed || function(pattern)
    {
      var output = this.activate(pattern);

      var pattern = [];
      for (var i in output)
        pattern[i] = output[i] > .5 ? 1 : 0;

      return pattern;
    }
  }
}

// Extend prototype chain (so every architectures is an instance of Network)
for (var architecture in Architect) {
  Architect[architecture].prototype = new Network();
  Architect[architecture].prototype.constructor = Architect[architecture];
}

// export
if (module) module.exports = Architect;
},{"./layer":75,"./network":76,"./trainer":79}],75:[function(require,module,exports){
// export
if (module) module.exports = Layer;

// import
var Neuron  = require('./neuron')
,   Network = require('./network')

/*******************************************************************************************
                                            LAYER
*******************************************************************************************/

function Layer(size, label) {
  this.size = size | 0;
  this.list = [];
  this.label = label || null;
  this.connectedTo = [];

  while (size--) {
    var neuron = new Neuron();
    this.list.push(neuron);
  }
}

Layer.prototype = {

  // activates all the neurons in the layer
  activate: function(input) {

    var activations = [];

    if (typeof input != 'undefined') {
      if (input.length != this.size)
        throw new Error("INPUT size and LAYER size must be the same to activate!");

      for (var id in this.list) {
        var neuron = this.list[id];
        var activation = neuron.activate(input[id]);
        activations.push(activation);
      }
    } else {
      for (var id in this.list) {
        var neuron = this.list[id];
        var activation = neuron.activate();
        activations.push(activation);
      }
    }
    return activations;
  },

  // propagates the error on all the neurons of the layer
  propagate: function(rate, target) {

    if (typeof target != 'undefined') {
      if (target.length != this.size)
        throw new Error("TARGET size and LAYER size must be the same to propagate!");

      for (var id = this.list.length - 1; id >= 0; id--) {
        var neuron = this.list[id];
        neuron.propagate(rate, target[id]);
      }
    } else {
      for (var id = this.list.length - 1; id >= 0; id--) {
        var neuron = this.list[id];
        neuron.propagate(rate);
      }
    }
  },

  // projects a connection from this layer to another one
  project: function(layer, type, weights) {

    if (layer instanceof Network)
      layer = layer.layers.input;

    if (layer instanceof Layer) {
      if (!this.connected(layer))
        return new Layer.connection(this, layer, type, weights);
    } else
      throw new Error("Invalid argument, you can only project connections to LAYERS and NETWORKS!");


  },

  // gates a connection betwenn two layers
  gate: function(connection, type) {

    if (type == Layer.gateType.INPUT) {
      if (connection.to.size != this.size)
        throw new Error("GATER layer and CONNECTION.TO layer must be the same size in order to gate!");

      for (var id in connection.to.list) {
        var neuron = connection.to.list[id];
        var gater = this.list[id];
        for (var input in neuron.connections.inputs) {
          var gated = neuron.connections.inputs[input];
          if (gated.ID in connection.connections)
            gater.gate(gated);
        }
      }
    } else if (type == Layer.gateType.OUTPUT) {
      if (connection.from.size != this.size)
        throw new Error("GATER layer and CONNECTION.FROM layer must be the same size in order to gate!");

      for (var id in connection.from.list) {
        var neuron = connection.from.list[id];
        var gater = this.list[id];
        for (var projected in neuron.connections.projected) {
          var gated = neuron.connections.projected[projected];
          if (gated.ID in connection.connections)
            gater.gate(gated);
        }
      }
    } else if (type == Layer.gateType.ONE_TO_ONE) {
      if (connection.size != this.size)
        throw new Error("The number of GATER UNITS must be the same as the number of CONNECTIONS to gate!");

      for (var id in connection.list) {
        var gater = this.list[id];
        var gated = connection.list[id];
        gater.gate(gated);
      }
    }
    connection.gatedfrom.push({layer: this, type: type});
  },

  // true or false whether the whole layer is self-connected or not
  selfconnected: function() {

    for (var id in this.list) {
      var neuron = this.list[id];
      if (!neuron.selfconnected())
        return false;
    }
    return true;
  },

  // true of false whether the layer is connected to another layer (parameter) or not
  connected: function(layer) {
    // Check if ALL to ALL connection
    var connections = 0;
    for (var here in this.list) {
      for (var there in layer.list) {
        var from = this.list[here];
        var to = layer.list[there];
        var connected = from.connected(to);
        if (connected.type == 'projected')
          connections++;
      }
    }
    if (connections == this.size * layer.size)
      return Layer.connectionType.ALL_TO_ALL;

    // Check if ONE to ONE connection
    connections = 0;
    for (var neuron in this.list) {
      var from = this.list[neuron];
      var to = layer.list[neuron];
      var connected = from.connected(to);
      if (connected.type == 'projected')
        connections++;
    }
    if (connections == this.size)
      return Layer.connectionType.ONE_TO_ONE;
  },

  // clears all the neuorns in the layer
  clear: function() {
    for (var id in this.list) {
      var neuron = this.list[id];
      neuron.clear();
    }
  },

  // resets all the neurons in the layer
  reset: function() {
    for (var id in this.list) {
      var neuron = this.list[id];
      neuron.reset();
    }
  },

  // returns all the neurons in the layer (array)
  neurons: function() {
    return this.list;
  },

  // adds a neuron to the layer
  add: function(neuron) {
    this.neurons[neuron.ID] = neuron || new Neuron();
    this.list.push(neuron);
    this.size++;
  },

  set: function(options) {
    options = options || {};

    for (var i in this.list) {
      var neuron = this.list[i];
      if (options.label)
        neuron.label = options.label + '_' + neuron.ID;
      if (options.squash)
        neuron.squash = options.squash;
      if (options.bias)
        neuron.bias = options.bias;
    }
    return this;
  }
}

// represents a connection from one layer to another, and keeps track of its weight and gain
Layer.connection = function LayerConnection(fromLayer, toLayer, type, weights) {
  this.ID = Layer.connection.uid();
  this.from = fromLayer;
  this.to = toLayer;
  this.selfconnection = toLayer == fromLayer;
  this.type = type;
  this.connections = {};
  this.list = [];
  this.size = 0;
  this.gatedfrom = [];

  if (typeof this.type == 'undefined')
  {
    if (fromLayer == toLayer)
      this.type = Layer.connectionType.ONE_TO_ONE;
    else
      this.type = Layer.connectionType.ALL_TO_ALL;
  }

  if (this.type == Layer.connectionType.ALL_TO_ALL ||
      this.type == Layer.connectionType.ALL_TO_ELSE) {
    for (var here in this.from.list) {
      for (var there in this.to.list) {
        var from = this.from.list[here];
        var to = this.to.list[there];
        if(this.type == Layer.connectionType.ALL_TO_ELSE && from == to)
          continue;
        var connection = from.project(to, weights);

        this.connections[connection.ID] = connection;
        this.size = this.list.push(connection);
      }
    }
  } else if (this.type == Layer.connectionType.ONE_TO_ONE) {

    for (var neuron in this.from.list) {
      var from = this.from.list[neuron];
      var to = this.to.list[neuron];
      var connection = from.project(to, weights);

      this.connections[connection.ID] = connection;
      this.size = this.list.push(connection);
    }
  }

  fromLayer.connectedTo.push(this);
}

// types of connections
Layer.connectionType = {};
Layer.connectionType.ALL_TO_ALL = "ALL TO ALL";
Layer.connectionType.ONE_TO_ONE = "ONE TO ONE";
Layer.connectionType.ALL_TO_ELSE = "ALL TO ELSE";

// types of gates
Layer.gateType = {};
Layer.gateType.INPUT = "INPUT";
Layer.gateType.OUTPUT = "OUTPUT";
Layer.gateType.ONE_TO_ONE = "ONE TO ONE";

(function() {
  var connections = 0;
  Layer.connection.uid = function() {
    return connections++;
  }
})();

},{"./network":76,"./neuron":77}],76:[function(require,module,exports){
// export
if (module) module.exports = Network;

// import
var Neuron  = require('./neuron')
,   Layer   = require('./layer')

/*******************************************************************************************
                                         NETWORK
*******************************************************************************************/

function Network(layers) {
  if (typeof layers != 'undefined') {
    this.layers = layers || {
      input: null,
      hidden: {},
      output: null
    };
    this.optimized = null;
  }
}
Network.prototype = {

  // feed-forward activation of all the layers to produce an ouput
  activate: function(input) {

    if (this.optimized === false)
    {
      this.layers.input.activate(input);
      for (var layer in this.layers.hidden)
        this.layers.hidden[layer].activate();
      return this.layers.output.activate();
    }
    else
    {
      if (this.optimized == null)
        this.optimize();
      return this.optimized.activate(input);
    }
  },

  // back-propagate the error thru the network
  propagate: function(rate, target) {

    if (this.optimized === false)
    {
      this.layers.output.propagate(rate, target);
      var reverse = [];
      for (var layer in this.layers.hidden)
        reverse.push(this.layers.hidden[layer]);
      reverse.reverse();
      for (var layer in reverse)
        reverse[layer].propagate(rate);
    }
    else
    {
      if (this.optimized == null)
        this.optimize();
      this.optimized.propagate(rate, target);
    }
  },

  // project a connection to another unit (either a network or a layer)
  project: function(unit, type, weights) {

    if (this.optimized)
      this.optimized.reset();

    if (unit instanceof Network)
      return this.layers.output.project(unit.layers.input, type, weights);

    if (unit instanceof Layer)
      return this.layers.output.project(unit, type, weights);

    throw new Error("Invalid argument, you can only project connections to LAYERS and NETWORKS!");
  },

  // let this network gate a connection
  gate: function(connection, type) {
    if (this.optimized)
      this.optimized.reset();
    this.layers.output.gate(connection, type);
  },

  // clear all elegibility traces and extended elegibility traces (the network forgets its context, but not what was trained)
  clear: function() {

    this.restore();

    var inputLayer = this.layers.input,
      outputLayer = this.layers.output;

    inputLayer.clear();
    for (var layer in this.layers.hidden) {
      var hiddenLayer = this.layers.hidden[layer];
      hiddenLayer.clear();
    }
    outputLayer.clear();

    if (this.optimized)
      this.optimized.reset();
  },

  // reset all weights and clear all traces (ends up like a new network)
  reset: function() {

    this.restore();

    var inputLayer = this.layers.input,
      outputLayer = this.layers.output;

    inputLayer.reset();
    for (var layer in this.layers.hidden) {
      var hiddenLayer = this.layers.hidden[layer];
      hiddenLayer.reset();
    }
    outputLayer.reset();

    if (this.optimized)
      this.optimized.reset();
  },

  // hardcodes the behaviour of the whole network into a single optimized function
  optimize: function() {

    var that = this;
    var optimized = {};
    var neurons = this.neurons();

    for (var i in neurons) {
      var neuron = neurons[i].neuron;
      var layer = neurons[i].layer;
      while (neuron.neuron)
        neuron = neuron.neuron;
      optimized = neuron.optimize(optimized, layer);
    }
    for (var i in optimized.propagation_sentences)
      optimized.propagation_sentences[i].reverse();
    optimized.propagation_sentences.reverse();

    var hardcode = "";
    hardcode += "var F = Float64Array ? new Float64Array(" + optimized.memory +
      ") : []; ";
    for (var i in optimized.variables)
      hardcode += "F[" + optimized.variables[i].id + "] = " + (optimized.variables[
        i].value || 0) + "; ";
    hardcode += "var activate = function(input){\n";
    for (var i in optimized.inputs)
      hardcode += "F[" + optimized.inputs[i] + "] = input[" + i + "]; ";
    for (var currentLayer in optimized.activation_sentences) {
      if (optimized.activation_sentences[currentLayer].length > 0) {
        for (var currentNeuron in optimized.activation_sentences[currentLayer]) {
          hardcode += optimized.activation_sentences[currentLayer][currentNeuron].join(" ");
          hardcode += optimized.trace_sentences[currentLayer][currentNeuron].join(" ");
        }
      }
    }
    hardcode += " var output = []; "
    for (var i in optimized.outputs)
      hardcode += "output[" + i + "] = F[" + optimized.outputs[i] + "]; ";
    hardcode += "return output; }; "
    hardcode += "var propagate = function(rate, target){\n";
    hardcode += "F[" + optimized.variables.rate.id + "] = rate; ";
    for (var i in optimized.targets)
      hardcode += "F[" + optimized.targets[i] + "] = target[" + i + "]; ";
    for (var currentLayer in optimized.propagation_sentences)
      for (var currentNeuron in optimized.propagation_sentences[currentLayer])
        hardcode += optimized.propagation_sentences[currentLayer][currentNeuron].join(" ") + " ";
    hardcode += " };\n";
    hardcode +=
      "var ownership = function(memoryBuffer){\nF = memoryBuffer;\nthis.memory = F;\n};\n";
    hardcode +=
      "return {\nmemory: F,\nactivate: activate,\npropagate: propagate,\nownership: ownership\n};";
    hardcode = hardcode.split(";").join(";\n");

    var constructor = new Function(hardcode);

    var network = constructor();
    network.data = {
      variables: optimized.variables,
      activate: optimized.activation_sentences,
      propagate: optimized.propagation_sentences,
      trace: optimized.trace_sentences,
      inputs: optimized.inputs,
      outputs: optimized.outputs,
      check_activation: this.activate,
      check_propagation: this.propagate
    }

    network.reset = function() {
      if (that.optimized) {
        that.optimized = null;
        that.activate = network.data.check_activation;
        that.propagate = network.data.check_propagation;
      }
    }

    this.optimized = network;
    this.activate = network.activate;
    this.propagate = network.propagate;
  },

  // restores all the values from the optimized network the their respective objects in order to manipulate the network
  restore: function() {
    if (!this.optimized)
      return;

    var optimized = this.optimized;

    var getValue = function() {
      var args = Array.prototype.slice.call(arguments);

      var unit = args.shift();
      var prop = args.pop();

      var id = prop + '_';
      for (var property in args)
        id += args[property] + '_';
      id += unit.ID;

      var memory = optimized.memory;
      var variables = optimized.data.variables;

      if (id in variables)
        return memory[variables[id].id];
      return 0;
    }

    var list = this.neurons();

    // link id's to positions in the array
    var ids = {};
    for (var i in list) {
      var neuron = list[i].neuron;
      while (neuron.neuron)
        neuron = neuron.neuron;

      neuron.state = getValue(neuron, 'state');
      neuron.old = getValue(neuron, 'old');
      neuron.activation = getValue(neuron, 'activation');
      neuron.bias = getValue(neuron, 'bias');

      for (var input in neuron.trace.elegibility)
        neuron.trace.elegibility[input] = getValue(neuron, 'trace',
          'elegibility', input);

      for (var gated in neuron.trace.extended)
        for (var input in neuron.trace.extended[gated])
          neuron.trace.extended[gated][input] = getValue(neuron, 'trace',
            'extended', gated, input);
    }

    // get connections
    for (var i in list) {
      var neuron = list[i].neuron;
      while (neuron.neuron)
        neuron = neuron.neuron;

      for (var j in neuron.connections.projected) {
        var connection = neuron.connections.projected[j];
        connection.weight = getValue(connection, 'weight');
        connection.gain = getValue(connection, 'gain');
      }
    }
  },

  // returns all the neurons in the network
  neurons: function() {

    var neurons = [];

    var inputLayer = this.layers.input.neurons(),
      outputLayer = this.layers.output.neurons();

    for (var neuron in inputLayer)
      neurons.push({
        neuron: inputLayer[neuron],
        layer: 'input'
      });

    for (var layer in this.layers.hidden) {
      var hiddenLayer = this.layers.hidden[layer].neurons();
      for (var neuron in hiddenLayer)
        neurons.push({
          neuron: hiddenLayer[neuron],
          layer: layer
        });
    }
    for (var neuron in outputLayer)
      neurons.push({
        neuron: outputLayer[neuron],
        layer: 'output'
      });

    return neurons;
  },

  // returns number of inputs of the network
  inputs: function() {
    return this.layers.input.size;
  },

  // returns number of outputs of hte network
  outputs: function() {
    return this.layers.output.size;
  },

  // sets the layers of the network
  set: function(layers) {

    this.layers = layers;
    if (this.optimized)
      this.optimized.reset();
  },

  setOptimize: function(bool){
    this.restore();
    if (this.optimized)
      this.optimized.reset();
    this.optimized = bool? null : false;
  },

  // returns a json that represents all the neurons and connections of the network
  toJSON: function(ignoreTraces) {

    this.restore();

    var list = this.neurons();
    var neurons = [];
    var connections = [];

    // link id's to positions in the array
    var ids = {};
    for (var i in list) {
      var neuron = list[i].neuron;
      while (neuron.neuron)
        neuron = neuron.neuron;
      ids[neuron.ID] = i;

      var copy = {
        trace: {
          elegibility: {},
          extended: {}
        },
        state: neuron.state,
        old: neuron.old,
        activation: neuron.activation,
        bias: neuron.bias,
        layer: list[i].layer
      };

      copy.squash = neuron.squash == Neuron.squash.LOGISTIC ? "LOGISTIC" :
        neuron.squash == Neuron.squash.TANH ? "TANH" :
        neuron.squash == Neuron.squash.IDENTITY ? "IDENTITY" :
        neuron.squash == Neuron.squash.HLIM ? "HLIM" :
        null;

      neurons.push(copy);
    }

    // get connections
    for (var i in list) {
      var neuron = list[i].neuron;
      while (neuron.neuron)
        neuron = neuron.neuron;

      for (var j in neuron.connections.projected) {
        var connection = neuron.connections.projected[j];
        connections.push({
          from: ids[connection.from.ID],
          to: ids[connection.to.ID],
          weight: connection.weight,
          gater: connection.gater ? ids[connection.gater.ID] : null,
        });
      }
      if (neuron.selfconnected())
        connections.push({
          from: ids[neuron.ID],
          to: ids[neuron.ID],
          weight: neuron.selfconnection.weight,
          gater: neuron.selfconnection.gater ? ids[neuron.selfconnection.gater.ID] : null,
        });
    }

    return {
      neurons: neurons,
      connections: connections
    }
  },

  // export the topology into dot language which can be visualized as graphs using dot
  /* example: ... console.log(net.toDotLang());
              $ node example.js > example.dot
              $ dot example.dot -Tpng > out.png
  */
  toDot: function(edgeConnection) {
    if (! typeof edgeConnection)
      edgeConnection = false;
    var code = "digraph nn {\n    rankdir = BT\n";
    var layers = [this.layers.input].concat(this.layers.hidden, this.layers.output);
    for (var layer in layers) {
      for (var to in layers[layer].connectedTo) { // projections
        var connection = layers[layer].connectedTo[to];
        var layerTo = connection.to;
        var size = connection.size;
        var layerID = layers.indexOf(layers[layer]);
        var layerToID = layers.indexOf(layerTo);
        /* http://stackoverflow.com/questions/26845540/connect-edges-with-graph-dot
         * DOT does not support edge-to-edge connections
         * This workaround produces somewhat weird graphs ...
        */
        if ( edgeConnection) {
          if (connection.gatedfrom.length) {
            var fakeNode = "fake" + layerID + "_" + layerToID;
            code += "    " + fakeNode +
              " [label = \"\", shape = point, width = 0.01, height = 0.01]\n";
            code += "    " + layerID + " -> " + fakeNode + " [label = " + size + ", arrowhead = none]\n";
            code += "    " + fakeNode + " -> " + layerToID + "\n";
          } else
            code += "    " + layerID + " -> " + layerToID + " [label = " + size + "]\n";
          for (var from in connection.gatedfrom) { // gatings
            var layerfrom = connection.gatedfrom[from].layer;
            var type = connection.gatedfrom[from].type;
            var layerfromID = layers.indexOf(layerfrom);
            code += "    " + layerfromID + " -> " + fakeNode + " [color = blue]\n";
          }
        } else {
          code += "    " + layerID + " -> " + layerToID + " [label = " + size + "]\n";
          for (var from in connection.gatedfrom) { // gatings
            var layerfrom = connection.gatedfrom[from].layer;
            var type = connection.gatedfrom[from].type;
            var layerfromID = layers.indexOf(layerfrom);
            code += "    " + layerfromID + " -> " + layerToID + " [color = blue]\n";
          }
        }
      }
    }
    code += "}\n";
    return {
      code: code,
      link: "https://chart.googleapis.com/chart?chl=" + escape(code.replace("/ /g", "+")) + "&cht=gv"
    }
  },

  // returns a function that works as the activation of the network and can be used without depending on the library
  standalone: function() {
    if (!this.optimized)
      this.optimize();

    var data = this.optimized.data;

    // build activation function
    var activation = "function (input) {\n";

    // build inputs
    for (var i in data.inputs)
      activation += "F[" + data.inputs[i] + "] = input[" + i + "];\n";

    // build network activation
    for (var neuron in data.activate) { // shouldn't this be layer?
      for (var sentence in data.activate[neuron])
        activation += data.activate[neuron][sentence].join('') + "\n";
    }

    // build outputs
    activation += "var output = [];\n";
    for (var i in data.outputs)
      activation += "output[" + i + "] = F[" + data.outputs[i] + "];\n";
    activation += "return output;\n}";

    // reference all the positions in memory
    var memory = activation.match(/F\[(\d+)\]/g);
    var dimension = 0;
    var ids = {};
    for (var address in memory) {
      var tmp = memory[address].match(/\d+/)[0];
      if (!(tmp in ids)) {
        ids[tmp] = dimension++;
      }
    }
    var hardcode = "F = {\n";
    for (var i in ids)
      hardcode += ids[i] + ": " + this.optimized.memory[i] + ",\n";
    hardcode = hardcode.substring(0, hardcode.length - 2) + "\n};\n";
    hardcode = "var run = " + activation.replace(/F\[(\d+)]/g, function(
      index) {
      return 'F[' + ids[index.match(/\d+/)[0]] + ']'
    }).replace("{\n", "{\n" + hardcode + "") + ";\n";
    hardcode += "return run";

    // return standalone function
    return new Function(hardcode)();
  },

  worker: function() {
    if (!this.optimized)
      this.optimize();

    var hardcode = "var inputs = " + this.optimized.data.inputs.length +
      ";\n";
    hardcode += "var outputs = " + this.optimized.data.outputs.length +
      ";\n";
    hardcode += "var F = null;\n";
    hardcode += "var activate = " + this.optimized.activate.toString() +
      ";\n";
    hardcode += "var propagate = " + this.optimized.propagate.toString() +
      ";\n";
    hardcode += "onmessage = function(e){\n";
    hardcode += "F = e.data.memoryBuffer;\n";
    hardcode += "if (e.data.action == 'activate'){\n";
    hardcode += "if (e.data.input.length == inputs){\n";
    hardcode +=
      "postMessage( { action: 'activate', output: activate(e.data.input), memoryBuffer: F }, [F.buffer]);\n";
    hardcode += "}\n}\nelse if (e.data.action == 'propagate'){\n";
    hardcode += "propagate(e.data.rate, e.data.target);\n";
    hardcode +=
      "postMessage({ action: 'propagate', memoryBuffer: F }, [F.buffer]);\n";
    hardcode += "}\n}\n";

    var blob = new Blob([hardcode]);
    var blobURL = window.URL.createObjectURL(blob);

    return new Worker(blobURL);
  },

  // returns a copy of the network
  clone: function() {
    return Network.fromJSON(this.toJSON());
  }
}

// rebuild a network that has been stored in a json using the method toJSON()
Network.fromJSON = function(json) {

  var neurons = [];

  var layers = {
    input: new Layer(),
    hidden: [],
    output: new Layer()
  }

  for (var i in json.neurons) {
    var config = json.neurons[i];

    var neuron = new Neuron();
    neuron.trace.elegibility = {};
    neuron.trace.extended = {};
    neuron.state = config.state;
    neuron.old = config.old;
    neuron.activation = config.activation;
    neuron.bias = config.bias;
    neuron.squash = config.squash in Neuron.squash ? Neuron.squash[config.squash] : Neuron.squash.LOGISTIC;
    neurons.push(neuron);

    if (config.layer == 'input')
      layers.input.add(neuron);
    else if (config.layer == 'output')
      layers.output.add(neuron);
    else {
      if (typeof layers.hidden[config.layer] == 'undefined')
        layers.hidden[config.layer] = new Layer();
      layers.hidden[config.layer].add(neuron);
    }
  }

  for (var i in json.connections) {
    var config = json.connections[i];
    var from = neurons[config.from];
    var to = neurons[config.to];
    var weight = config.weight
    var gater = neurons[config.gater];

    var connection = from.project(to, weight);
    if (gater)
      gater.gate(connection);
  }

  return new Network(layers);
}

},{"./layer":75,"./neuron":77}],77:[function(require,module,exports){
// export
if (module) module.exports = Neuron;

/******************************************************************************************
                                         NEURON
*******************************************************************************************/

function Neuron() {
  this.ID = Neuron.uid();
  this.label = null;
  this.connections = {
    inputs: {},
    projected: {},
    gated: {}
  };
  this.error = {
    responsibility: 0,
    projected: 0,
    gated: 0
  };
  this.trace = {
    elegibility: {},
    extended: {},
    influences: {}
  };
  this.state = 0;
  this.old = 0;
  this.activation = 0;
  this.selfconnection = new Neuron.connection(this, this, 0); // weight = 0 -> not connected
  this.squash = Neuron.squash.LOGISTIC;
  this.neighboors = {};
  this.bias = Math.random() * .2 - .1;
}

Neuron.prototype = {

  // activate the neuron
  activate: function(input) {
    // activation from enviroment (for input neurons)
    if (typeof input != 'undefined') {
      this.activation = input;
      this.derivative = 0;
      this.bias = 0;
      return this.activation;
    }

    // old state
    this.old = this.state;

    // eq. 15
    this.state = this.selfconnection.gain * this.selfconnection.weight *
      this.state + this.bias;

    for (var i in this.connections.inputs) {
      var input = this.connections.inputs[i];
      this.state += input.from.activation * input.weight * input.gain;
    }

    // eq. 16
    this.activation = this.squash(this.state);

    // f'(s)
    this.derivative = this.squash(this.state, true);

    // update traces
    var influences = [];
    for (var id in this.trace.extended) {
      // extended elegibility trace
      var xtrace = this.trace.extended[id];
      var neuron = this.neighboors[id];

      // if gated neuron's selfconnection is gated by this unit, the influence keeps track of the neuron's old state
      var influence = neuron.selfconnection.gater == this ? neuron.old : 0;

      // index runs over all the incoming connections to the gated neuron that are gated by this unit
      for (var incoming in this.trace.influences[neuron.ID]) { // captures the effect that has an input connection to this unit, on a neuron that is gated by this unit
        influence += this.trace.influences[neuron.ID][incoming].weight *
          this.trace.influences[neuron.ID][incoming].from.activation;
      }
      influences[neuron.ID] = influence;
    }

    for (var i in this.connections.inputs) {
      var input = this.connections.inputs[i];

      // elegibility trace - Eq. 17
      this.trace.elegibility[input.ID] = this.selfconnection.gain * this.selfconnection
        .weight * this.trace.elegibility[input.ID] + input.gain * input.from
        .activation;

      for (var id in this.trace.extended) {
        // extended elegibility trace
        var xtrace = this.trace.extended[id];
        var neuron = this.neighboors[id];
        var influence = influences[neuron.ID];

        // eq. 18
        xtrace[input.ID] = neuron.selfconnection.gain * neuron.selfconnection
          .weight * xtrace[input.ID] + this.derivative * this.trace.elegibility[
            input.ID] * influence;
      }
    }

    //  update gated connection's gains
    for (var connection in this.connections.gated) {
      this.connections.gated[connection].gain = this.activation;
    }

    return this.activation;
  },

  // back-propagate the error
  propagate: function(rate, target) {
    // error accumulator
    var error = 0;

    // whether or not this neuron is in the output layer
    var isOutput = typeof target != 'undefined';

    // output neurons get their error from the enviroment
    if (isOutput)
      this.error.responsibility = this.error.projected = target - this.activation; // Eq. 10

    else // the rest of the neuron compute their error responsibilities by backpropagation
    {
      // error responsibilities from all the connections projected from this neuron
      for (var id in this.connections.projected) {
        var connection = this.connections.projected[id];
        var neuron = connection.to;
        // Eq. 21
        error += neuron.error.responsibility * connection.gain * connection.weight;
      }

      // projected error responsibility
      this.error.projected = this.derivative * error;

      error = 0;
      // error responsibilities from all the connections gated by this neuron
      for (var id in this.trace.extended) {
        var neuron = this.neighboors[id]; // gated neuron
        var influence = neuron.selfconnection.gater == this ? neuron.old : 0; // if gated neuron's selfconnection is gated by this neuron

        // index runs over all the connections to the gated neuron that are gated by this neuron
        for (var input in this.trace.influences[id]) { // captures the effect that the input connection of this neuron have, on a neuron which its input/s is/are gated by this neuron
          influence += this.trace.influences[id][input].weight * this.trace.influences[
            neuron.ID][input].from.activation;
        }
        // eq. 22
        error += neuron.error.responsibility * influence;
      }

      // gated error responsibility
      this.error.gated = this.derivative * error;

      // error responsibility - Eq. 23
      this.error.responsibility = this.error.projected + this.error.gated;
    }

    // learning rate
    rate = rate || .1;

    // adjust all the neuron's incoming connections
    for (var id in this.connections.inputs) {
      var input = this.connections.inputs[id];

      // Eq. 24
      var gradient = this.error.projected * this.trace.elegibility[input.ID];
      for (var id in this.trace.extended) {
        var neuron = this.neighboors[id];
        gradient += neuron.error.responsibility * this.trace.extended[
          neuron.ID][input.ID];
      }
      input.weight += rate * gradient; // adjust weights - aka learn
    }

    // adjust bias
    this.bias += rate * this.error.responsibility;
  },

  project: function(neuron, weight) {
    // self-connection
    if (neuron == this) {
      this.selfconnection.weight = 1;
      return this.selfconnection;
    }

    // check if connection already exists
    var connected = this.connected(neuron);
    if (connected && connected.type == "projected") {
      // update connection
      if (typeof weight != 'undefined')
        connected.connection.weight = weight;
      // return existing connection
      return connected.connection;
    } else {
      // create a new connection
      var connection = new Neuron.connection(this, neuron, weight);
    }

    // reference all the connections and traces
    this.connections.projected[connection.ID] = connection;
    this.neighboors[neuron.ID] = neuron;
    neuron.connections.inputs[connection.ID] = connection;
    neuron.trace.elegibility[connection.ID] = 0;

    for (var id in neuron.trace.extended) {
      var trace = neuron.trace.extended[id];
      trace[connection.ID] = 0;
    }

    return connection;
  },

  gate: function(connection) {
    // add connection to gated list
    this.connections.gated[connection.ID] = connection;

    var neuron = connection.to;
    if (!(neuron.ID in this.trace.extended)) {
      // extended trace
      this.neighboors[neuron.ID] = neuron;
      var xtrace = this.trace.extended[neuron.ID] = {};
      for (var id in this.connections.inputs) {
        var input = this.connections.inputs[id];
        xtrace[input.ID] = 0;
      }
    }

    // keep track
    if (neuron.ID in this.trace.influences)
      this.trace.influences[neuron.ID].push(connection);
    else
      this.trace.influences[neuron.ID] = [connection];

    // set gater
    connection.gater = this;
  },

  // returns true or false whether the neuron is self-connected or not
  selfconnected: function() {
    return this.selfconnection.weight !== 0;
  },

  // returns true or false whether the neuron is connected to another neuron (parameter)
  connected: function(neuron) {
    var result = {
      type: null,
      connection: false
    };

    if (this == neuron) {
      if (this.selfconnected()) {
        result.type = 'selfconnection';
        result.connection = this.selfconnection;
        return result;
      } else
        return false;
    }

    for (var type in this.connections) {
      for (var connection in this.connections[type]) {
        var connection = this.connections[type][connection];
        if (connection.to == neuron) {
          result.type = type;
          result.connection = connection;
          return result;
        } else if (connection.from == neuron) {
          result.type = type;
          result.connection = connection;
          return result;
        }
      }
    }

    return false;
  },

  // clears all the traces (the neuron forgets it's context, but the connections remain intact)
  clear: function() {

    for (var trace in this.trace.elegibility)
      this.trace.elegibility[trace] = 0;

    for (var trace in this.trace.extended)
      for (var extended in this.trace.extended[trace])
        this.trace.extended[trace][extended] = 0;

    this.error.responsibility = this.error.projected = this.error.gated = 0;
  },

  // all the connections are randomized and the traces are cleared
  reset: function() {
    this.clear();

    for (var type in this.connections)
      for (var connection in this.connections[type])
        this.connections[type][connection].weight = Math.random() * .2 - .1;
    this.bias = Math.random() * .2 - .1;

    this.old = this.state = this.activation = 0;
  },

  // hardcodes the behaviour of the neuron into an optimized function
  optimize: function(optimized, layer) {

    optimized = optimized || {};
    var that = this;
    var store_activation = [];
    var store_trace = [];
    var store_propagation = [];
    var varID = optimized.memory || 0;
    var neurons = optimized.neurons || 1;
    var inputs = optimized.inputs || [];
    var targets = optimized.targets || [];
    var outputs = optimized.outputs || [];
    var variables = optimized.variables || {};
    var activation_sentences = optimized.activation_sentences || [];
    var trace_sentences = optimized.trace_sentences || [];
    var propagation_sentences = optimized.propagation_sentences || [];
    var layers = optimized.layers || { __count: 0, __neuron: 0 };

    // allocate sentences
    var allocate = function(store){
      var allocated = layer in layers && store[layers.__count];
      if (!allocated)
      {
        layers.__count = store.push([]) - 1;
        layers[layer] = layers.__count;
      }
    }
    allocate(activation_sentences);
    allocate(trace_sentences);
    allocate(propagation_sentences);
    var currentLayer = layers.__count;

    // get/reserve space in memory by creating a unique ID for a variablel
    var getVar = function() {
      var args = Array.prototype.slice.call(arguments);

      if (args.length == 1) {
        if (args[0] == 'target') {
          var id = 'target_' + targets.length;
          targets.push(varID);
        } else
          var id = args[0];
        if (id in variables)
          return variables[id];
        return variables[id] = {
          value: 0,
          id: varID++
        };
      } else {
        var extended = args.length > 2;
        if (extended)
          var value = args.pop();

        var unit = args.shift();
        var prop = args.pop();

        if (!extended)
          var value = unit[prop];

        var id = prop + '_';
        for (var property in args)
          id += args[property] + '_';
        id += unit.ID;
        if (id in variables)
          return variables[id];

        return variables[id] = {
          value: value,
          id: varID++
        };
      }
    };

    // build sentence
    var buildSentence = function() {
      var args = Array.prototype.slice.call(arguments);
      var store = args.pop();
      var sentence = "";
      for (var i in args)
        if (typeof args[i] == 'string')
          sentence += args[i];
        else
          sentence += 'F[' + args[i].id + ']';

      store.push(sentence + ';');
    }

    // helper to check if an object is empty
    var isEmpty = function(obj) {
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop))
          return false;
      }
      return true;
    };

    // characteristics of the neuron
    var noProjections = isEmpty(this.connections.projected);
    var noGates = isEmpty(this.connections.gated);
    var isInput = layer == 'input' ? true : isEmpty(this.connections.inputs);
    var isOutput = layer == 'output' ? true : noProjections && noGates;

    // optimize neuron's behaviour
    var rate = getVar('rate');
    var activation = getVar(this, 'activation');
    if (isInput)
      inputs.push(activation.id);
    else {
      activation_sentences[currentLayer].push(store_activation);
      trace_sentences[currentLayer].push(store_trace);
      propagation_sentences[currentLayer].push(store_propagation);
      var old = getVar(this, 'old');
      var state = getVar(this, 'state');
      var bias = getVar(this, 'bias');
      if (this.selfconnection.gater)
        var self_gain = getVar(this.selfconnection, 'gain');
      if (this.selfconnected())
        var self_weight = getVar(this.selfconnection, 'weight');
      buildSentence(old, ' = ', state, store_activation);
      if (this.selfconnected())
        if (this.selfconnection.gater)
          buildSentence(state, ' = ', self_gain, ' * ', self_weight, ' * ',
            state, ' + ', bias, store_activation);
        else
          buildSentence(state, ' = ', self_weight, ' * ', state, ' + ',
            bias, store_activation);
      else
        buildSentence(state, ' = ', bias, store_activation);
      for (var i in this.connections.inputs) {
        var input = this.connections.inputs[i];
        var input_activation = getVar(input.from, 'activation');
        var input_weight = getVar(input, 'weight');
        if (input.gater)
          var input_gain = getVar(input, 'gain');
        if (this.connections.inputs[i].gater)
          buildSentence(state, ' += ', input_activation, ' * ',
            input_weight, ' * ', input_gain, store_activation);
        else
          buildSentence(state, ' += ', input_activation, ' * ',
            input_weight, store_activation);
      }
      var derivative = getVar(this, 'derivative');
      switch (this.squash) {
        case Neuron.squash.LOGISTIC:
          buildSentence(activation, ' = (1 / (1 + Math.exp(-', state, ')))',
            store_activation);
          buildSentence(derivative, ' = ', activation, ' * (1 - ',
            activation, ')', store_activation);
          break;
        case Neuron.squash.TANH:
          var eP = getVar('aux');
          var eN = getVar('aux_2');
          buildSentence(eP, ' = Math.exp(', state, ')', store_activation);
          buildSentence(eN, ' = 1 / ', eP, store_activation);
          buildSentence(activation, ' = (', eP, ' - ', eN, ') / (', eP, ' + ', eN, ')', store_activation);
          buildSentence(derivative, ' = 1 - (', activation, ' * ', activation, ')', store_activation);
          break;
        case Neuron.squash.IDENTITY:
          buildSentence(activation, ' = ', state, store_activation);
          buildSentence(derivative, ' = 1', store_activation);
          break;
        case Neuron.squash.HLIM:
          buildSentence(activation, ' = +(', state, ' > 0)', store_activation);
          buildSentence(derivative, ' = 1', store_activation);
        case Neuron.squash.RELU:
          buildSentence(activation, ' = ', state, ' > 0 ? ', state, ' : 0', store_activation);
          buildSentence(derivative, ' = ', state, ' > 0 ? 1 : 0', store_activation);
          break;
      }

      for (var id in this.trace.extended) {
        // calculate extended elegibility traces in advance

        var xtrace = this.trace.extended[id];
        var neuron = this.neighboors[id];
        var influence = getVar('influences[' + neuron.ID + ']');
        var neuron_old = getVar(neuron, 'old');
        var initialized = false;
        if (neuron.selfconnection.gater == this)
        {
          buildSentence(influence, ' = ', neuron_old, store_trace);
          initialized = true;
        }
        for (var incoming in this.trace.influences[neuron.ID]) {
          var incoming_weight = getVar(this.trace.influences[neuron.ID]
            [incoming], 'weight');
          var incoming_activation = getVar(this.trace.influences[neuron.ID]
            [incoming].from, 'activation');

          if (initialized)
            buildSentence(influence, ' += ', incoming_weight, ' * ', incoming_activation, store_trace);
          else {
            buildSentence(influence, ' = ', incoming_weight, ' * ', incoming_activation, store_trace);
            initialized = true;
          }
        }
      }

      for (var i in this.connections.inputs) {
        var input = this.connections.inputs[i];
        if (input.gater)
          var input_gain = getVar(input, 'gain');
        var input_activation = getVar(input.from, 'activation');
        var trace = getVar(this, 'trace', 'elegibility', input.ID, this.trace
          .elegibility[input.ID]);
        if (this.selfconnected()) {
          if (this.selfconnection.gater) {
            if (input.gater)
              buildSentence(trace, ' = ', self_gain, ' * ', self_weight,
                ' * ', trace, ' + ', input_gain, ' * ', input_activation,
                store_trace);
            else
              buildSentence(trace, ' = ', self_gain, ' * ', self_weight,
                ' * ', trace, ' + ', input_activation, store_trace);
          } else {
            if (input.gater)
              buildSentence(trace, ' = ', self_weight, ' * ', trace, ' + ',
                input_gain, ' * ', input_activation, store_trace);
            else
              buildSentence(trace, ' = ', self_weight, ' * ', trace, ' + ',
                input_activation, store_trace);
          }
        } else {
          if (input.gater)
            buildSentence(trace, ' = ', input_gain, ' * ', input_activation,
              store_trace);
          else
            buildSentence(trace, ' = ', input_activation, store_trace);
        }
        for (var id in this.trace.extended) {
          // extended elegibility trace
          var xtrace = this.trace.extended[id];
          var neuron = this.neighboors[id];
          var influence = getVar('influences[' + neuron.ID + ']');
          var neuron_old = getVar(neuron, 'old');

          var trace = getVar(this, 'trace', 'elegibility', input.ID, this.trace
            .elegibility[input.ID]);
          var xtrace = getVar(this, 'trace', 'extended', neuron.ID, input.ID,
            this.trace.extended[neuron.ID][input.ID]);
          if (neuron.selfconnected())
            var neuron_self_weight = getVar(neuron.selfconnection, 'weight');
          if (neuron.selfconnection.gater)
            var neuron_self_gain = getVar(neuron.selfconnection, 'gain');
          if (neuron.selfconnected())
            if (neuron.selfconnection.gater)
              buildSentence(xtrace, ' = ', neuron_self_gain, ' * ',
                neuron_self_weight, ' * ', xtrace, ' + ', derivative, ' * ',
                trace, ' * ', influence, store_trace);
            else
              buildSentence(xtrace, ' = ', neuron_self_weight, ' * ',
                xtrace, ' + ', derivative, ' * ', trace, ' * ',
                influence, store_trace);
          else
            buildSentence(xtrace, ' = ', derivative, ' * ', trace, ' * ',
              influence, store_trace);
        }
      }
      for (var connection in this.connections.gated) {
        var gated_gain = getVar(this.connections.gated[connection], 'gain');
        buildSentence(gated_gain, ' = ', activation, store_activation);
      }
    }
    if (!isInput) {
      var responsibility = getVar(this, 'error', 'responsibility', this.error
        .responsibility);
      if (isOutput) {
        var target = getVar('target');
        buildSentence(responsibility, ' = ', target, ' - ', activation,
          store_propagation);
        for (var id in this.connections.inputs) {
          var input = this.connections.inputs[id];
          var trace = getVar(this, 'trace', 'elegibility', input.ID, this.trace
            .elegibility[input.ID]);
          var input_weight = getVar(input, 'weight');
          buildSentence(input_weight, ' += ', rate, ' * (', responsibility,
            ' * ', trace, ')', store_propagation);
        }
        outputs.push(activation.id);
      } else {
        if (!noProjections && !noGates) {
          var error = getVar('aux');
          for (var id in this.connections.projected) {
            var connection = this.connections.projected[id];
            var neuron = connection.to;
            var connection_weight = getVar(connection, 'weight');
            var neuron_responsibility = getVar(neuron, 'error',
              'responsibility', neuron.error.responsibility);
            if (connection.gater) {
              var connection_gain = getVar(connection, 'gain');
              buildSentence(error, ' += ', neuron_responsibility, ' * ',
                connection_gain, ' * ', connection_weight,
                store_propagation);
            } else
              buildSentence(error, ' += ', neuron_responsibility, ' * ',
                connection_weight, store_propagation);
          }
          var projected = getVar(this, 'error', 'projected', this.error.projected);
          buildSentence(projected, ' = ', derivative, ' * ', error,
            store_propagation);
          buildSentence(error, ' = 0', store_propagation);
          for (var id in this.trace.extended) {
            var neuron = this.neighboors[id];
            var influence = getVar('aux_2');
            var neuron_old = getVar(neuron, 'old');
            if (neuron.selfconnection.gater == this)
              buildSentence(influence, ' = ', neuron_old, store_propagation);
            else
              buildSentence(influence, ' = 0', store_propagation);
            for (var input in this.trace.influences[neuron.ID]) {
              var connection = this.trace.influences[neuron.ID][input];
              var connection_weight = getVar(connection, 'weight');
              var neuron_activation = getVar(connection.from, 'activation');
              buildSentence(influence, ' += ', connection_weight, ' * ',
                neuron_activation, store_propagation);
            }
            var neuron_responsibility = getVar(neuron, 'error',
              'responsibility', neuron.error.responsibility);
            buildSentence(error, ' += ', neuron_responsibility, ' * ',
              influence, store_propagation);
          }
          var gated = getVar(this, 'error', 'gated', this.error.gated);
          buildSentence(gated, ' = ', derivative, ' * ', error,
            store_propagation);
          buildSentence(responsibility, ' = ', projected, ' + ', gated,
            store_propagation);
          for (var id in this.connections.inputs) {
            var input = this.connections.inputs[id];
            var gradient = getVar('aux');
            var trace = getVar(this, 'trace', 'elegibility', input.ID, this
              .trace.elegibility[input.ID]);
            buildSentence(gradient, ' = ', projected, ' * ', trace,
              store_propagation);
            for (var id in this.trace.extended) {
              var neuron = this.neighboors[id];
              var neuron_responsibility = getVar(neuron, 'error',
                'responsibility', neuron.error.responsibility);
              var xtrace = getVar(this, 'trace', 'extended', neuron.ID,
                input.ID, this.trace.extended[neuron.ID][input.ID]);
              buildSentence(gradient, ' += ', neuron_responsibility, ' * ',
                xtrace, store_propagation);
            }
            var input_weight = getVar(input, 'weight');
            buildSentence(input_weight, ' += ', rate, ' * ', gradient,
              store_propagation);
          }

        } else if (noGates) {
          buildSentence(responsibility, ' = 0', store_propagation);
          for (var id in this.connections.projected) {
            var connection = this.connections.projected[id];
            var neuron = connection.to;
            var connection_weight = getVar(connection, 'weight');
            var neuron_responsibility = getVar(neuron, 'error',
              'responsibility', neuron.error.responsibility);
            if (connection.gater) {
              var connection_gain = getVar(connection, 'gain');
              buildSentence(responsibility, ' += ', neuron_responsibility,
                ' * ', connection_gain, ' * ', connection_weight,
                store_propagation);
            } else
              buildSentence(responsibility, ' += ', neuron_responsibility,
                ' * ', connection_weight, store_propagation);
          }
          buildSentence(responsibility, ' *= ', derivative,
            store_propagation);
          for (var id in this.connections.inputs) {
            var input = this.connections.inputs[id];
            var trace = getVar(this, 'trace', 'elegibility', input.ID, this
              .trace.elegibility[input.ID]);
            var input_weight = getVar(input, 'weight');
            buildSentence(input_weight, ' += ', rate, ' * (',
              responsibility, ' * ', trace, ')', store_propagation);
          }
        } else if (noProjections) {
          buildSentence(responsibility, ' = 0', store_propagation);
          for (var id in this.trace.extended) {
            var neuron = this.neighboors[id];
            var influence = getVar('aux');
            var neuron_old = getVar(neuron, 'old');
            if (neuron.selfconnection.gater == this)
              buildSentence(influence, ' = ', neuron_old, store_propagation);
            else
              buildSentence(influence, ' = 0', store_propagation);
            for (var input in this.trace.influences[neuron.ID]) {
              var connection = this.trace.influences[neuron.ID][input];
              var connection_weight = getVar(connection, 'weight');
              var neuron_activation = getVar(connection.from, 'activation');
              buildSentence(influence, ' += ', connection_weight, ' * ',
                neuron_activation, store_propagation);
            }
            var neuron_responsibility = getVar(neuron, 'error',
              'responsibility', neuron.error.responsibility);
            buildSentence(responsibility, ' += ', neuron_responsibility,
              ' * ', influence, store_propagation);
          }
          buildSentence(responsibility, ' *= ', derivative,
            store_propagation);
          for (var id in this.connections.inputs) {
            var input = this.connections.inputs[id];
            var gradient = getVar('aux');
            buildSentence(gradient, ' = 0', store_propagation);
            for (var id in this.trace.extended) {
              var neuron = this.neighboors[id];
              var neuron_responsibility = getVar(neuron, 'error',
                'responsibility', neuron.error.responsibility);
              var xtrace = getVar(this, 'trace', 'extended', neuron.ID,
                input.ID, this.trace.extended[neuron.ID][input.ID]);
              buildSentence(gradient, ' += ', neuron_responsibility, ' * ',
                xtrace, store_propagation);
            }
            var input_weight = getVar(input, 'weight');
            buildSentence(input_weight, ' += ', rate, ' * ', gradient,
              store_propagation);
          }
        }
      }
      buildSentence(bias, ' += ', rate, ' * ', responsibility,
        store_propagation);
    }
    return {
      memory: varID,
      neurons: neurons + 1,
      inputs: inputs,
      outputs: outputs,
      targets: targets,
      variables: variables,
      activation_sentences: activation_sentences,
      trace_sentences: trace_sentences,
      propagation_sentences: propagation_sentences,
      layers: layers
    }
  }
}


// represents a connection between two neurons
Neuron.connection = function Connection(from, to, weight) {

  if (!from || !to)
    throw new Error("Connection Error: Invalid neurons");

  this.ID = Neuron.connection.uid();
  this.from = from;
  this.to = to;
  this.weight = typeof weight == 'undefined' ? Math.random() * .2 - .1 :
    weight;
  this.gain = 1;
  this.gater = null;
}


// squashing functions
Neuron.squash = {};

// eq. 5 & 5'
Neuron.squash.LOGISTIC = function(x, derivate) {
  if (!derivate)
    return 1 / (1 + Math.exp(-x));
  var fx = Neuron.squash.LOGISTIC(x);
  return fx * (1 - fx);
};
Neuron.squash.TANH = function(x, derivate) {
  if (derivate)
    return 1 - Math.pow(Neuron.squash.TANH(x), 2);
  var eP = Math.exp(x);
  var eN = 1 / eP;
  return (eP - eN) / (eP + eN);
};
Neuron.squash.IDENTITY = function(x, derivate) {
  return derivate ? 1 : x;
};
Neuron.squash.HLIM = function(x, derivate) {
  return derivate ? 1 : x > 0 ? 1 : 0;
};
Neuron.squash.RELU = function(x, derivate) {
  if (derivate)
    return x > 0 ? 1 : 0;
  return x > 0 ? x : 0;
};

// unique ID's
(function() {
  var neurons = 0;
  var connections = 0;
  Neuron.uid = function() {
    return neurons++;
  }
  Neuron.connection.uid = function() {
    return connections++;
  }
  Neuron.quantity = function() {
    return {
      neurons: neurons,
      connections: connections
    }
  }
})();

},{}],78:[function(require,module,exports){
/*

The MIT License (MIT)

Copyright (c) 2014 Juan Cazala - juancazala.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE



********************************************************************************************
                                         SYNAPTIC
********************************************************************************************

Synaptic is a javascript neural network library for node.js and the browser, its generalized
algorithm is architecture-free, so you can build and train basically any type of first order
or even second order neural network architectures.

http://en.wikipedia.org/wiki/Recurrent_neural_network#Second_Order_Recurrent_Neural_Network

The library includes a few built-in architectures like multilayer perceptrons, multilayer
long-short term memory networks (LSTM) or liquid state machines, and a trainer capable of
training any given network, and includes built-in training tasks/tests like solving an XOR,
passing a Distracted Sequence Recall test or an Embeded Reber Grammar test.

The algorithm implemented by this library has been taken from Derek D. Monner's paper:

A generalized LSTM-like training algorithm for second-order recurrent neural networks
http://www.overcomplete.net/papers/nn2012.pdf

There are references to the equations in that paper commented through the source code.


********************************************************************************************/

var Synaptic = {
    Neuron: require('./neuron'),
    Layer: require('./layer'),
    Network: require('./network'),
    Trainer: require('./trainer'),
    Architect: require('./architect')
};

// CommonJS & AMD
if (typeof define !== 'undefined' && define.amd)
{
  define([], function(){ return Synaptic });
}

// Node.js
if (typeof module !== 'undefined' && module.exports)
{
  module.exports = Synaptic;
}

// Browser
if (typeof window == 'object')
{
  (function(){ 
    var oldSynaptic = window['synaptic'];
    Synaptic.ninja = function(){ 
      window['synaptic'] = oldSynaptic; 
      return Synaptic;
    };	
  })();

  window['synaptic'] = Synaptic;
}

},{"./architect":74,"./layer":75,"./network":76,"./neuron":77,"./trainer":79}],79:[function(require,module,exports){
// export
if (module) module.exports = Trainer;

/*******************************************************************************************
                                        TRAINER
*******************************************************************************************/

function Trainer(network, options) {
  options = options || {};
  this.network = network;
  this.rate = options.rate || .2;
  this.iterations = options.iterations || 100000;
  this.error = options.error || .005
  this.cost = options.cost || null;
}

Trainer.prototype = {

  // trains any given set to a network
  train: function(set, options) {

    var error = 1;
    var iterations = bucketSize = 0;
    var abort = false;
    var input, output, target, currentRate;
    var cost = options && options.cost || this.cost || Trainer.cost.MSE;

    var start = Date.now();

    if (options) {
      if (options.shuffle) {
        //+ Jonas Raoni Soares Silva
        //@ http://jsfromhell.com/array/shuffle [v1.0]
        function shuffle(o) { //v1.0
          for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
          return o;
        };
      }
      if (options.iterations)
        this.iterations = options.iterations;
      if (options.error)
        this.error = options.error;
      if (options.rate)
        this.rate = options.rate;
      if (options.cost)
        this.cost = options.cost;
      if (options.schedule)
        this.schedule = options.schedule;
      if (options.customLog){
        // for backward compatibility with code that used customLog
        console.log('Deprecated: use schedule instead of customLog')
        this.schedule = options.customLog;
      }
    }

    currentRate = this.rate;
    if(Array.isArray(this.rate)) {
      bucketSize = Math.floor(this.iterations / this.rate.length);
    }


    while (!abort && iterations < this.iterations && error > this.error) {
      error = 0;

      if(bucketSize > 0) {
        var currentBucket = Math.floor(iterations / bucketSize);
        currentRate = this.rate[currentBucket] || currentRate;
      }

      for (var train in set) {
        input = set[train].input;
        target = set[train].output;

        output = this.network.activate(input);
        this.network.propagate(currentRate, target);

        error += cost(target, output);
      }

      // check error
      iterations++;
      error /= set.length;

      if (options) {
        if (this.schedule && this.schedule.every && iterations %
          this.schedule.every == 0)
          abort = this.schedule.do({
            error: error,
            iterations: iterations,
            rate: currentRate
          });
        else if (options.log && iterations % options.log == 0) {
          console.log('iterations', iterations, 'error', error, 'rate', currentRate);
        };
        if (options.shuffle)
          shuffle(set);
      }
    }

    var results = {
      error: error,
      iterations: iterations,
      time: Date.now() - start
    }

    return results;
  },

  // tests a set and returns the error and elapsed time
  test: function(set, options){

    var error = 0;
    var abort = false;
    var input, output, target;
    var cost = options && options.cost || this.cost || Trainer.cost.MSE;

    var start = Date.now();

    for (var test in set) {
      input = set[test].input;
      target = set[test].output;
      output = this.network.activate(input);
      error += cost(target, output);
    }

    error /= set.length;

    var results = {
      error: error,
      time: Date.now() - start
    }

    return results;
  },

  // trains any given set to a network using a WebWorker
  workerTrain: function(set, callback, options) {

    var that = this;
    var error = 1;
    var iterations = bucketSize = 0;
    var input, output, target, currentRate;
    var length = set.length;
    var abort = false;
    var cost = options && options.cost || that.cost || Trainer.cost.MSE;

    var start = Date.now();

    if (options) {
      if (options.shuffle) {
        //+ Jonas Raoni Soares Silva
        //@ http://jsfromhell.com/array/shuffle [v1.0]
        function shuffle(o) { //v1.0
          for (var j, x, i = o.length; i; j = Math.floor(Math.random() *
              i), x = o[--i], o[i] = o[j], o[j] = x);
          return o;
        };
      }
      if (options.iterations)
        that.iterations = options.iterations;
      if (options.error)
        that.error = options.error;
      if (options.rate)
        that.rate = options.rate;
      if (options.cost)
        that.cost = options.cost;
      if (options.schedule)
        that.schedule = options.schedule;
      if (options.customLog)
      {
        // for backward compatibility with code that used customLog
        console.log('Deprecated: use schedule instead of customLog')
        that.schedule = options.customLog;
      }
    }

    // dynamic learning rate
    currentRate = that.rate;
    if(Array.isArray(that.rate)) {
      bucketSize = Math.floor(that.iterations / that.rate.length);
    }

    // create a worker
    var worker = that.network.worker();

    // activate the network
    function activateWorker(input)
    {
        worker.postMessage({
            action: "activate",
            input: input,
            memoryBuffer: that.network.optimized.memory
        }, [that.network.optimized.memory.buffer]);
    }

    // backpropagate the network
    function propagateWorker(target){
        if(bucketSize > 0) {
          var currentBucket = Math.floor(iterations / bucketSize);
          currentRate = that.rate[currentBucket] || currentRate;
        }
        worker.postMessage({
            action: "propagate",
            target: target,
            rate: currentRate,
            memoryBuffer: that.network.optimized.memory
        }, [that.network.optimized.memory.buffer]);
    }

    // train the worker
    worker.onmessage = function(e){
        // give control of the memory back to the network
        that.network.optimized.ownership(e.data.memoryBuffer);

        if (e.data.action == "propagate")
        {
            if (index >= length)
            {
                index = 0;
                iterations++;
                error /= set.length;

                // log
                if (options) {
                  if (that.schedule && that.schedule.every && iterations % that.schedule.every == 0)
                    abort = that.schedule.do({
                      error: error,
                      iterations: iterations,
                      rate: currentRate
                    });
                  else if (options.log && iterations % options.log == 0) {
                    console.log('iterations', iterations, 'error', error);
                  };
                  if (options.shuffle)
                    shuffle(set);
                }

                if (!abort && iterations < that.iterations && error > that.error)
                {
                    activateWorker(set[index].input);
                } else {
                    // callback
                    callback({
                      error: error,
                      iterations: iterations,
                      time: Date.now() - start
                    })
                }
                error = 0;
            } else {
                activateWorker(set[index].input);
            }
        }

        if (e.data.action == "activate")
        {
            error += cost(set[index].output, e.data.output);
            propagateWorker(set[index].output);
            index++;
        }
    }

    // kick it
    var index = 0;
    var iterations = 0;
    activateWorker(set[index].input);
  },

  // trains an XOR to the network
  XOR: function(options) {

    if (this.network.inputs() != 2 || this.network.outputs() != 1)
      throw new Error("Incompatible network (2 inputs, 1 output)");

    var defaults = {
      iterations: 100000,
      log: false,
      shuffle: true,
      cost: Trainer.cost.MSE
    }

    if (options)
      for (var i in options)
        defaults[i] = options[i];

    return this.train([{
      input: [0, 0],
      output: [0]
    }, {
      input: [1, 0],
      output: [1]
    }, {
      input: [0, 1],
      output: [1]
    }, {
      input: [1, 1],
      output: [0]
    }], defaults);
  },

  // trains the network to pass a Distracted Sequence Recall test
  DSR: function(options) {
    options = options || {};

    var targets = options.targets || [2, 4, 7, 8];
    var distractors = options.distractors || [3, 5, 6, 9];
    var prompts = options.prompts || [0, 1];
    var length = options.length || 24;
    var criterion = options.success || 0.95;
    var iterations = options.iterations || 100000;
    var rate = options.rate || .1;
    var log = options.log || 0;
    var schedule = options.schedule || {};
    var cost = options.cost || this.cost || Trainer.cost.CROSS_ENTROPY;

    var trial = correct = i = j = success = 0,
      error = 1,
      symbols = targets.length + distractors.length + prompts.length;

    var noRepeat = function(range, avoid) {
      var number = Math.random() * range | 0;
      var used = false;
      for (var i in avoid)
        if (number == avoid[i])
          used = true;
      return used ? noRepeat(range, avoid) : number;
    }

    var equal = function(prediction, output) {
      for (var i in prediction)
        if (Math.round(prediction[i]) != output[i])
          return false;
      return true;
    }

    var start = Date.now();

    while (trial < iterations && (success < criterion || trial % 1000 != 0)) {
      // generate sequence
      var sequence = [],
        sequenceLength = length - prompts.length;
      for (i = 0; i < sequenceLength; i++) {
        var any = Math.random() * distractors.length | 0;
        sequence.push(distractors[any]);
      }
      var indexes = [],
        positions = [];
      for (i = 0; i < prompts.length; i++) {
        indexes.push(Math.random() * targets.length | 0);
        positions.push(noRepeat(sequenceLength, positions));
      }
      positions = positions.sort();
      for (i = 0; i < prompts.length; i++) {
        sequence[positions[i]] = targets[indexes[i]];
        sequence.push(prompts[i]);
      }

      //train sequence
      var targetsCorrect = distractorsCorrect = 0;
      error = 0;
      for (i = 0; i < length; i++) {
        // generate input from sequence
        var input = [];
        for (j = 0; j < symbols; j++)
          input[j] = 0;
        input[sequence[i]] = 1;

        // generate target output
        var output = [];
        for (j = 0; j < targets.length; j++)
          output[j] = 0;

        if (i >= sequenceLength) {
          var index = i - sequenceLength;
          output[indexes[index]] = 1;
        }

        // check result
        var prediction = this.network.activate(input);

        if (equal(prediction, output))
          if (i < sequenceLength)
            distractorsCorrect++;
          else
            targetsCorrect++;
        else {
          this.network.propagate(rate, output);
        }

        error += cost(output, prediction);

        if (distractorsCorrect + targetsCorrect == length)
          correct++;
      }

      // calculate error
      if (trial % 1000 == 0)
        correct = 0;
      trial++;
      var divideError = trial % 1000;
      divideError = divideError == 0 ? 1000 : divideError;
      success = correct / divideError;
      error /= length;

      // log
      if (log && trial % log == 0)
        console.log("iterations:", trial, " success:", success, " correct:",
          correct, " time:", Date.now() - start, " error:", error);
      if (schedule.do && schedule.every && trial % schedule.every == 0)
        schedule.do({
          iterations: trial,
          success: success,
          error: error,
          time: Date.now() - start,
          correct: correct
        });
    }

    return {
      iterations: trial,
      success: success,
      error: error,
      time: Date.now() - start
    }
  },

  // train the network to learn an Embeded Reber Grammar
  ERG: function(options) {

    options = options || {};
    var iterations = options.iterations || 150000;
    var criterion = options.error || .05;
    var rate = options.rate || .1;
    var log = options.log || 500;
    var cost = options.cost || this.cost || Trainer.cost.CROSS_ENTROPY;

    // gramar node
    var Node = function() {
      this.paths = [];
    }
    Node.prototype = {
      connect: function(node, value) {
        this.paths.push({
          node: node,
          value: value
        });
        return this;
      },
      any: function() {
        if (this.paths.length == 0)
          return false;
        var index = Math.random() * this.paths.length | 0;
        return this.paths[index];
      },
      test: function(value) {
        for (var i in this.paths)
          if (this.paths[i].value == value)
            return this.paths[i];
        return false;
      }
    }

    var reberGrammar = function() {

      // build a reber grammar
      var output = new Node();
      var n1 = (new Node()).connect(output, "E");
      var n2 = (new Node()).connect(n1, "S");
      var n3 = (new Node()).connect(n1, "V").connect(n2, "P");
      var n4 = (new Node()).connect(n2, "X")
      n4.connect(n4, "S");
      var n5 = (new Node()).connect(n3, "V")
      n5.connect(n5, "T");
      n2.connect(n5, "X")
      var n6 = (new Node()).connect(n4, "T").connect(n5, "P");
      var input = (new Node()).connect(n6, "B")

      return {
        input: input,
        output: output
      }
    }

    // build an embeded reber grammar
    var embededReberGrammar = function() {
      var reber1 = reberGrammar();
      var reber2 = reberGrammar();

      var output = new Node();
      var n1 = (new Node).connect(output, "E");
      reber1.output.connect(n1, "T");
      reber2.output.connect(n1, "P");
      var n2 = (new Node).connect(reber1.input, "P").connect(reber2.input,
        "T");
      var input = (new Node).connect(n2, "B");

      return {
        input: input,
        output: output
      }

    }

    // generate an ERG sequence
    var generate = function() {
      var node = embededReberGrammar().input;
      var next = node.any();
      var str = "";
      while (next) {
        str += next.value;
        next = next.node.any();
      }
      return str;
    }

    // test if a string matches an embeded reber grammar
    var test = function(str) {
      var node = embededReberGrammar().input;
      var i = 0;
      var ch = str.charAt(i);
      while (i < str.length) {
        var next = node.test(ch);
        if (!next)
          return false;
        node = next.node;
        ch = str.charAt(++i);
      }
      return true;
    }

    // helper to check if the output and the target vectors match
    var different = function(array1, array2) {
      var max1 = 0;
      var i1 = -1;
      var max2 = 0;
      var i2 = -1;
      for (var i in array1) {
        if (array1[i] > max1) {
          max1 = array1[i];
          i1 = i;
        }
        if (array2[i] > max2) {
          max2 = array2[i];
          i2 = i;
        }
      }

      return i1 != i2;
    }

    var iteration = 0;
    var error = 1;
    var table = {
      "B": 0,
      "P": 1,
      "T": 2,
      "X": 3,
      "S": 4,
      "E": 5
    }

    var start = Date.now();
    while (iteration < iterations && error > criterion) {
      var i = 0;
      error = 0;

      // ERG sequence to learn
      var sequence = generate();

      // input
      var read = sequence.charAt(i);
      // target
      var predict = sequence.charAt(i + 1);

      // train
      while (i < sequence.length - 1) {
        var input = [];
        var target = [];
        for (var j = 0; j < 6; j++) {
          input[j] = 0;
          target[j] = 0;
        }
        input[table[read]] = 1;
        target[table[predict]] = 1;

        var output = this.network.activate(input);

        if (different(output, target))
          this.network.propagate(rate, target);

        read = sequence.charAt(++i);
        predict = sequence.charAt(i + 1);

        error += cost(target, output);
      }
      error /= sequence.length;
      iteration++;
      if (iteration % log == 0) {
        console.log("iterations:", iteration, " time:", Date.now() - start,
          " error:", error);
      }
    }

    return {
      iterations: iteration,
      error: error,
      time: Date.now() - start,
      test: test,
      generate: generate
    }
  },

  timingTask: function(options){

    if (this.network.inputs() != 2 || this.network.outputs() != 1)
      throw new Error("Invalid Network: must have 2 inputs and one output");

    if (typeof options == 'undefined')
      var options = {};

    // helper
    function getSamples (trainingSize, testSize){

      // sample size
      var size = trainingSize + testSize;

      // generate samples
      var t = 0;
      var set  = [];
      for (var i = 0; i < size; i++) {
        set.push({ input: [0,0], output: [0] });
      }
      while(t < size - 20) {
          var n = Math.round(Math.random() * 20);
          set[t].input[0] = 1;
          for (var j = t; j <= t + n; j++){
              set[j].input[1] = n / 20;
              set[j].output[0] = 0.5;
          }
          t += n;
          n = Math.round(Math.random() * 20);
          for (var k = t+1; k <= t + n; k++)
              set[k].input[1] = set[t].input[1];
          t += n;
      }

      // separate samples between train and test sets
      var trainingSet = []; var testSet = [];
      for (var l = 0; l < size; l++)
          (l < trainingSize ? trainingSet : testSet).push(set[l]);

      // return samples
      return {
          train: trainingSet,
          test: testSet
      }
    }

    var iterations = options.iterations || 200;
    var error = options.error || .005;
    var rate = options.rate || [.03, .02];
    var log = options.log === false ? false : options.log || 10;
    var cost = options.cost || this.cost || Trainer.cost.MSE;
    var trainingSamples = options.trainSamples || 7000;
    var testSamples = options.trainSamples || 1000;

    // samples for training and testing
    var samples = getSamples(trainingSamples, testSamples);

    // train
    var result = this.train(samples.train, {
      rate: rate,
      log: log,
      iterations: iterations,
      error: error,
      cost: cost
    });

    return {
      train: result,
      test: this.test(samples.test)
    }
  }
};

// Built-in cost functions
Trainer.cost = {
  // Eq. 9
  CROSS_ENTROPY: function(target, output)
  {
    var crossentropy = 0;
    for (var i in output)
      crossentropy -= (target[i] * Math.log(output[i]+1e-15)) + ((1-target[i]) * Math.log((1+1e-15)-output[i])); // +1e-15 is a tiny push away to avoid Math.log(0)
    return crossentropy;
  },
  MSE: function(target, output)
  {
    var mse = 0;
    for (var i in output)
      mse += Math.pow(target[i] - output[i], 2);
    return mse / output.length;
  },
  BINARY: function(target, output){
    var misses = 0;
    for (var i in output)
      misses += Math.round(target[i] * 2) != Math.round(output[i] * 2);
    return misses;
  }
}

},{}]},{},[1]);
