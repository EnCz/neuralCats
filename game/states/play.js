  'use strict';
  var Pizza = require('../prefabs/pizza');
  var Cat   = require('../prefabs/cat');
  var Dog   = require('../prefabs/dog');
  
  // ArangoDB Support
  // var db    = require('arangojs')();

  function Play() {}
  Play.prototype = {
    // Objektgruppen
    catGroup: null,
    dogGroup: null,
    foodGroup: null,

    // Objektmengen
    catAmount: 10,
    dogAmount: 0,
    foodAmount: 10,

    // Evolution / Generation 
    highestFitness: 0,
    survivor: null,


    create: function() {
      this.game.physics.startSystem(Phaser.Physics.ARCADE);
      this.game.stage.backgroundColor = 0x777777;

      // Init Object Groups
      this.catGroup = this.game.add.group();
      this.dogGroup = this.game.add.group();
      this.foodGroup = this.game.add.group();
      
      // Init populate Cats
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

      // Collision Detection
      this.game.physics.arcade.overlap(this.catGroup, this.catGroup, this.collisionProxy, this.checkCollision, this);
      this.game.physics.arcade.overlap(this.catGroup, this.foodGroup, this.collisionProxy, this.checkCollision, this);

      // Refill Objects if < Amount
      if (this.foodAmount > this.foodGroup.total) {
          this.populateFood(this.foodAmount - this.foodGroup.total);
      }

      // Choose Cat with highest fitness 
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

      // Move On Generation if everything is dead
      if (this.catGroup.total <= 0) {
        console.log('Fitness-Max'+this.highestFitness);
        this.populateCats(10, this.survivor);
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