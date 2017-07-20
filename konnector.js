// This is a default simple connector made to show you some common libs which can be used
// This connector fetches some cat images from the qwant api (which is more open than the google one)

'use strict'

const {baseKonnector} = require('cozy-konnector-libs')

module.exports = baseKonnector.createNew({
  name: 'io.cozy.konnectors.mock',
  models: [],
  // fetchOperation is the list of function which will be called in sequence with the following
  // parameters :
  // requiredFields : the list of attributes of your connector that the user can choose (ofter login and password)
  // entries : it is an object which is passed accross the functions
  // data : another object passed accross function, not used
  // next : this is a callback you have to call when the task of the current function is finished
  fetchOperations: [
    auth
  ]
})

function auth (requiredFields, entries, data, next) {

}
