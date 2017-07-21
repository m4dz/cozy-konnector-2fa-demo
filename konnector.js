// This is a default simple connector made to show you some common libs which can be used
// This connector fetches some cat images from the qwant api (which is more open than the google one)

'use strict'

const pkg = require('./package.json')
const fixtures = require('./data/fixture.json')

const fs = require('fs')
const path = require('path')
const uuidv4 = require('uuid/v4')
const uuidv5 = require('uuid/v5')
const otp = require('otp')({
  name: pkg.name,
  secret: fixtures.otp.secret,
  keySize: 16
})

const {baseKonnector, log, errors} = require('cozy-konnector-libs')

const mocks = {
  fields: require('./mocks/fields.json')
}

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
    preauth,
    auth
  ]
})

/**
 * When executing the konnector in a standalone environment, we build the values
 * that should be passed by Collect when re-executing the konnector for token
 * submission, i.e. the context and TOTP token.
 */
function preauth (requiredFields, entries, data, next) {
  if (process.env.NODE_ENV !== 'standalone' || !requiredFields.twofactor) return next()
  requiredFields.twofactor = JSON.parse(Buffer.from(requiredFields.twofactor, 'base64').toString('ascii'))
  requiredFields.token = otp.totp()
  next()
}

function auth (requiredFields, entries, data, next) {
  if (requiredFields.twofactor) {
    check2fa(requiredFields.twofactor, requiredFields.token)
    .then(() => resetContext(requiredFields))
    .then(next())
    .catch(err => {
      log('error', err)
      next('LOGIN_FAILED')
    })
  } else if (requiredFields.login === mocks.fields.login && requiredFields.password === mocks.fields.password) {
    mock2fa()
    .then(context => errors.requireTwoFactor(context))
    .then(encodedContext => process.env.NODE_ENV === 'standalone' && saveEncodedContext(requiredFields, encodedContext))
    .then(() => next('TWO_FACTOR_TOKEN_REQUESTED'))
    .catch(err => {
      log('error', err)
      next('UNKNOWN_ERROR')
    })
  } else {
    log('error', 'Incorrect credentials')
    next('LOGIN_FAILED')
  }
}

function mock2fa (callback) {
  const context = {
    _csrf: uuidv4(),
    SESSIONID: uuidv5('https://mocks.cozy.io/konnectors/2fa', uuidv5.URL)
  }

  return new Promise((resolve, reject) => {
    fs.writeFile(path.resolve(__dirname, './mocks/twofactor.json'), JSON.stringify(context), err => {
      err ? reject(err) : resolve(context)
    })
  })
}

function check2fa (context, token) {
  const twofactor = require('./mocks/twofactor.json')
  return new Promise((resolve, reject) => {
    if (twofactor._csrf !== context._csrf || twofactor.SESSIONID !== context.SESSIONID) {
      return reject(new Error('Invalid Context'))
    }

    return token === otp.totp() ? resolve() : reject(new Error('Invalid TOTP token'))
  })
}

function saveEncodedContext (fields, encodedContext) {
  return new Promise((resolve, reject) => {
    const envFields = {
      login: fields.login,
      password: fields.password,
      twofactor: encodedContext
    }

    fs.writeFile(path.resolve(__dirname, './data/env_fields.json'), JSON.stringify(envFields), err => {
      err ? reject(err) : resolve(envFields)
    })
  })
}

function resetContext (fields) {
  return new Promise((resolve, reject) => {
    const envFields = {
      login: fields.login,
      password: fields.password
    }

    fs.writeFile(path.resolve(__dirname, './data/env_fields.json'), JSON.stringify(envFields), err => {
      err ? reject(err) : resolve(envFields)
    })
  })
}
