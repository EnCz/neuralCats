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