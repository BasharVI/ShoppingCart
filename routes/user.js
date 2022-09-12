var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const { response } = require('express');
const { ObjectId } = require('mongodb');
var MongoClient = require('mongodb').MongoClient
const verifyLogin=(req,res,next)=>{
  if (req.session.loggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}

/* GET home page. */

router.get('/', function (req, res, next) {

  let user=req.session.user
  
  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else
      function getallproducts() {
        return new Promise(async (resolve, reject) => {
          let products = await client.db('shopping').collection('Products').find().toArray()
          resolve(products)
          res.render('user/view-products', { admin: false, products,user })
        })

      }
    getallproducts()

  })

});

router.get('/login',(req, res)=> {
  
  if (req.session.loggedIn){
    
    res.redirect('/')

  }
  else{
    res.render('user/login',{loginErr:req.session.loginErr})
    req.session.loginErr=false
  }
 
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
            resolve(userdata)
            console.log(userdata);

          })

        })

      }
    dosignup().then((_id)=>{
      req.session.loggedIn=true
      req.session.user=_id
      res.redirect('/')
    })

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
                resolve({ status:true,user})

              } else {
                console.log('erorrrrr');
                resolve({ status: false })
              }


            })
          } else {
            console.log('erro');
            resolve({ status: false })
          }


        })

      }
    dologin().then((response) => {
      
      if (response.status) {
       
        req.session.loggedIn=true
        req.session.user=response.user
        
        res.redirect('/')
      } else {
        req.session.loginErr="Invalid UserName or Password !"
        res.redirect('/login')
      }
    })


  })


})

router.get('/logout',(req,res)=>{
 req.session.destroy()
 res.redirect('/')
})

router.get('/cart',verifyLogin,(req,res)=>{

  let userid=req.session.user._id

  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else
    function getcartProducts(){
      return new Promise(async(resolve ,reject)=>{
        let cartItems=await client.db('shopping').collection('cart').aggregate([
          {
            $match:{user:ObjectId(userid)}
          },
          {
            $lookup:{
              from:'Products',
              let:{proList:'$products'},
              pipeline:[{
                $match:{
                  $expr:{
                    $in:['$_id','$$proList']
                  }
                }
              }],
              as:'cartItems'
            }
          }

        ]).toArray()
          resolve(cartItems[0].cartItems)
        
        
        
      })
    }
    getcartProducts().then((response)=>{
      let products=response
      res.render('user/cart',{products,user:req.session.user})
    })
    
  })

  
})

router.get('/add-to-cart/:id',verifyLogin,(req,res)=>{

  let proid=req.params.id
  
  let userid=req.session.user


  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else

  function addtoCart(){
    return new Promise (async(resolve,reject)=>{
      let usercart=await client.db('shopping').collection('cart').findOne({user:ObjectId(userid._id)})
      if (usercart){
        client.db('shopping').collection('cart')
        .updateOne({user:ObjectId(userid._id)},
            {
              $push:{products:ObjectId(proid)}

            }
        ).then((response)=>{
          resolve()
        })

      }else{
        let cartobj={
          user:ObjectId(userid._id),
          products:[ObjectId(proid)]
        }

        client.db('shopping').collection('cart').insertOne(cartobj).then((response)=>{
          resolve()
        })

      }
    })
  }
  addtoCart().then(()=>{
    res.redirect('/')
  })

})

})

module.exports = router;
