'use strict';
var _ = require('underscore');
var joi = require('joi');
var Foxx = require('org/arangodb/foxx');
var ArangoError = require('org/arangodb').ArangoError;
var AnimalRepo = require('../repositories/animal');
var Animal = require('../models/animal');
var controller = new Foxx.Controller(applicationContext);

var animalIdSchema = joi.string().required()
.description('The id of the animal')
.meta({allowMultiple: false});

var animalRepo = new AnimalRepo(
  applicationContext.collection('animal'),
  {model: Animal}
);

/** Lists of all animal.
 *
 * This function simply returns the list of all Animal.
 */
controller.get('/', function (req, res) {
  res.json(_.map(animalRepo.all(), function (model) {
    return model.forClient();
  }));
});

/** Creates a new animal.
 *
 * Creates a new animal. The information has to be in the
 * requestBody.
 */
controller.post('/', function (req, res) {
  var animal = req.parameters.animal;
  res.json(animalRepo.save(animal).forClient());
})
.bodyParam('animal', {
  description: 'The animal you want to create',
  type: Animal
});

/** Reads a animal.
 *
 * Reads a animal.
 */
controller.get('/:id', function (req, res) {
  var id = req.urlParameters.id;
  res.json(animalRepo.byId(id).forClient());
})
.pathParam('id', animalIdSchema)
.errorResponse(ArangoError, 404, 'The animal could not be found');

/** Replaces a animal.
 *
 * Changes a animal. The information has to be in the
 * requestBody.
 */
controller.put('/:id', function (req, res) {
  var id = req.urlParameters.id;
  var animal = req.parameters.animal;
  res.json(animalRepo.replaceById(id, animal));
})
.pathParam('id', animalIdSchema)
.bodyParam('animal', {
  description: 'The animal you want your old one to be replaced with',
  type: Animal
})
.errorResponse(ArangoError, 404, 'The animal could not be found');

/** Updates a animal.
 *
 * Changes a animal. The information has to be in the
 * requestBody.
 */
controller.patch('/:id', function (req, res) {
  var id = req.urlParameters.id;
  var patchData = req.parameters.patch;
  res.json(animalRepo.updateById(id, patchData));
})
.pathParam('id', animalIdSchema)
.bodyParam('patch', {
  description: 'The patch data you want your animal to be updated with',
  type: joi.object().required()
})
.errorResponse(ArangoError, 404, 'The animal could not be found');

/** Removes a animal.
 *
 * Removes a animal.
 */
controller.delete('/:id', function (req, res) {
  var id = req.urlParameters.id;
  animalRepo.removeById(id);
  res.json({success: true});
})
.pathParam('id', animalIdSchema)
.errorResponse(ArangoError, 404, 'The animal could not be found');
