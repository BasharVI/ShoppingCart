var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const { response } = require('express');
var MongoClient = require('mongodb').MongoClient

/* GET home page. */
router.get('/', function (req, res, next) {
  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else
      function getallproducts() {
        return new Promise(async (resolve, reject) => {
          let products = await client.db('shopping').collection('Products').find().toArray()
          resolve(products)
          res.render('user/view-products', { admin: false, products })
        })

      }
    getallproducts()

  })

});

router.get('/login', function (req, res) {
  res.render('user/login')
})
router.get('/signup', function (req, res) {
  res.render('user/signup')
})
router.post('/signup', function (req, res) {
  let userdata = req.body
  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else
      function dosignup() {

        return new Promise(async (resolve, reject) => {
          userdata.password = await bcrypt.hash(userdata.password, 10)
          client.db('shopping').collection('users').insertOne(userdata).then((_id) => {
            resolve(_id)
            console.log(_id);

          })

        })

      }
    dosignup()

  })
})

router.post('/login', (req, res) => {

  let userdata = req.body
  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else


      function dologin() {
        return new Promise(async (resolve, reject) => {

          let response = {}

          let user = await client.db('shopping').collection('users').findOne({ email: userdata.email })
          if (user) {
            bcrypt.compare(userdata.password, user.password).then((status) => {
              if (status) {

                response.user = user
                response.status = true
                resolve({ status: true })

              } else {

                resolve({ status: false })
              }


            })
          } else {

            resolve({ status: false })
          }


        })

      }
    dologin().then((response) => {

      if (response.status) {
        res.redirect('/')
      } else {
        res.redirect('/login')
      }
    })


  })


})


module.exports = router;
