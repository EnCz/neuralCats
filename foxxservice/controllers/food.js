'use strict';
var _ = require('underscore');
var joi = require('joi');
var Foxx = require('org/arangodb/foxx');
var ArangoError = require('org/arangodb').ArangoError;
var FoodRepo = require('../repositories/food');
var Food = require('../models/food');
var controller = new Foxx.Controller(applicationContext);

var foodIdSchema = joi.string().required()
.description('The id of the food')
.meta({allowMultiple: false});

var foodRepo = new FoodRepo(
  applicationContext.collection('food'),
  {model: Food}
);

/** Lists of all food.
 *
 * This function simply returns the list of all Food.
 */
controller.get('/', function (req, res) {
  res.json(_.map(foodRepo.all(), function (model) {
    return model.forClient();
  }));
});

/** Creates a new food.
 *
 * Creates a new food. The information has to be in the
 * requestBody.
 */
controller.post('/', function (req, res) {
  var food = req.parameters.food;
  res.json(foodRepo.save(food).forClient());
})
.bodyParam('food', {
  description: 'The food you want to create',
  type: Food
});

/** Reads a food.
 *
 * Reads a food.
 */
controller.get('/:id', function (req, res) {
  var id = req.urlParameters.id;
  res.json(foodRepo.byId(id).forClient());
})
.pathParam('id', foodIdSchema)
.errorResponse(ArangoError, 404, 'The food could not be found');

/** Replaces a food.
 *
 * Changes a food. The information has to be in the
 * requestBody.
 */
controller.put('/:id', function (req, res) {
  var id = req.urlParameters.id;
  var food = req.parameters.food;
  res.json(foodRepo.replaceById(id, food));
})
.pathParam('id', foodIdSchema)
.bodyParam('food', {
  description: 'The food you want your old one to be replaced with',
  type: Food
})
.errorResponse(ArangoError, 404, 'The food could not be found');

/** Updates a food.
 *
 * Changes a food. The information has to be in the
 * requestBody.
 */
controller.patch('/:id', function (req, res) {
  var id = req.urlParameters.id;
  var patchData = req.parameters.patch;
  res.json(foodRepo.updateById(id, patchData));
})
.pathParam('id', foodIdSchema)
.bodyParam('patch', {
  description: 'The patch data you want your food to be updated with',
  type: joi.object().required()
})
.errorResponse(ArangoError, 404, 'The food could not be found');

/** Removes a food.
 *
 * Removes a food.
 */
controller.delete('/:id', function (req, res) {
  var id = req.urlParameters.id;
  foodRepo.removeById(id);
  res.json({success: true});
})
.pathParam('id', foodIdSchema)
.errorResponse(ArangoError, 404, 'The food could not be found');
