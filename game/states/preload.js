
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
