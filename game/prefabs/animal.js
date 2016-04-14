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
		this.generation = 1;
	}

	// Wenn keine Parents -> Netzwerke neu erstellen, ansonsten von Eltern erben
	// Todo: Only partial inheritance
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

			// Hardcoded Type, need to be dynamic
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

