'use strict';
var db = require("org/arangodb").db;

function createCollection(name) {
  var collectionName = applicationContext.collectionName(name);
  if (db._collection(collectionName) === null) {
    db._create(collectionName);
  } else if (applicationContext.isProduction) {
    console.warn("collection '%s' already exists. Leaving it untouched.", collectionName);
  }
}

createCollection("animal");
createCollection("food");
