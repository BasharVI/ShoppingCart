var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const { response, Router } = require('express');
const { ObjectId } = require('mongodb');
const session = require('express-session');
var MongoClient = require('mongodb').MongoClient
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */

router.get('/', function (req, res, next) {

  let user = req.session.user

  MongoClient.connect('mongodb://localhost:27017', async function (err, client) {
    if (err)
      console.log('error');
    else
      function getallproducts() {
        return new Promise(async (resolve, reject) => {
          let user = req.session.user
          let products = await client.db('shopping').collection('Products').find().toArray()
          resolve(products)

        })

      }
    function getcartCount() {
      return new Promise(async (resolve, reject) => {
        let count = 0
        if (req.session.loggedIn) {

          let user = req.session.user._id

          let cart = await client.db('shopping').collection('cart').findOne({ user: ObjectId(user) })

          if (cart) {
            count = cart.products.length
          }
        } else {
          count = null
        }
        resolve(count)



      })
    }

    let cartcount = await getcartCount()

    getallproducts().then((products) => {
      res.render('user/view-products', { admin: false, products, user, cartcount })
    })

  })

});


router.get('/login', (req, res) => {

  if (req.session.loggedIn) {

    res.redirect('/')

  }
  else {
    res.render('user/login', { loginErr: req.session.loginErr })
    req.session.loginErr = false
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
    dosignup().then((_id) => {
      req.session.loggedIn = true
      req.session.user = _id
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
                resolve({ status: true, user })

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

        req.session.loggedIn = true
        req.session.user = response.user

        res.redirect('/')
      } else {
        req.session.loginErr = "Invalid UserName or Password !"
        res.redirect('/login')
      }
    })


  })


})

router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})

router.get('/cart', verifyLogin, (req, res) => {

  let userid = req.session.user._id

  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else
      function getcartProducts() {
        return new Promise(async (resolve, reject) => {
          let cartItems = await client.db('shopping').collection('cart').aggregate([
            {
              $match: { user: ObjectId(userid) }
            },
            {
              $unwind:'$products'
            },
            {
              $project:{
                items:'$products.items',
                quantitty:'$products.quantity'
              }
              
            },
            {
              $lookup:{
                from:'Products',
                localField:'items',
                foreignField:'_id',
                as:'product'
              }
            },
            {
              $project:{
                items:1,
                quantitty:1,
                product:{$arrayElemAt:['$product',0]}
              }
            }


          ]).toArray()
          
          resolve(cartItems)


        })
      }
    getcartProducts().then((response) => {
      let products = response
      console.log(products);
      console.log(products.product);
      
      if (products == null) {
        res.render('user/cart')
      } else {
        let quantity = products.quantitty
        
        res.render('user/cart', { products, user: req.session.user })
      }

    })

  })


})

router.get('/add-to-cart/:id', verifyLogin, (req, res) => {

  let proid = req.params.id

  let userid = req.session.user


  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else

      function addtoCart() {
        let prObj={
          items:ObjectId(proid),
          quantity:1
        }
        return new Promise(async (resolve, reject) => {
          let usercart = await client.db('shopping').collection('cart').findOne({ user: ObjectId(userid._id) })
          if (usercart) {
            let proExist=usercart.products.findIndex(product=>product.items==proid)
            console.log(proExist)
            if (proExist!=-1){
              client.db('shopping').collection('cart').updateOne({'products.items':ObjectId(proid)},
              {
                $inc:{'products.$.quantity':1}
              }).then(()=>{
                resolve()
              })

            }else {
              client.db('shopping').collection('cart')
              .updateOne({ user: ObjectId(userid._id) },
                {
                  $push: { products: prObj }

                }
              ).then((response) => {
                resolve()
              })
            }
           

          } else {
            let cartobj = {
              user: ObjectId(userid._id),
              products: [prObj]
            }

            client.db('shopping').collection('cart').insertOne(cartobj).then((response) => {
              resolve()
            })

          }
        })
      }
    addtoCart().then(() => {
      res.redirect('/')
    })

  })

})
router.get('/delete-cartproduct/:id',(req,res)=>{
  let proId=req.params.id
  
  let user=req.session.user
  
    
  MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
    function deletecartProduct(){
      return new Promise ((resolve,reject)=>{
        client.db('shopping').collection('cart')
        .updateOne({user:ObjectId(user._id)},
        
        {
          $pull:{ products: {items:ObjectId(proId)} }
        
        }).then((response)=>{
          
          resolve (response)
        })
        
        
      })
     
    }
    deletecartProduct().then((response)=>{
      
      res.redirect('/cart')
    })
 
  })

})

 router.post('/change-product-quantity',(req,res)=>{
  
  MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
    function changeProductQuantity(){
      let count=parseInt(req.body.count)
      
      let quantity=parseInt(req.body.quantity)
      
      let cart= req.body.cart
      
      prod=req.body.product
      
      return new Promise ((resolve,reject)=>{
        client.db('shopping').collection('cart')
        .updateOne({_id:ObjectId(cart), 'products.items':ObjectId(prod)},
        
        {
          $inc:{'products.$.quantity':count }
        
        }).then((response)=>{
          
          resolve (response)
        })
        
        
      })
     
    }
    changeProductQuantity().then((response)=>{
      
      res.json(response)
    })
 
  })

 })
 router.get('/place-order',verifyLogin, (req,res)=>{

  let user=req.session.user._id
  console.log(user);
  
  MongoClient.connect('mongodb://localhost:27017',  function (err, client) {
    if (err)
      console.log('error');
    else
      function getTotalAmount() {
        return new Promise(async (resolve, reject) => {
          let totalamount = await client.db('shopping').collection('cart').aggregate([
            {
              $match: { user: ObjectId(user) }
            },
            {
              $unwind:'$products'
            },
            {
              $project:{
                items:'$products.items',
                quantitty:'$products.quantity'
              }
              
            },
            {
              $lookup:{
                from:'Products',
                localField:'items',
                foreignField:'_id',
                as:'product'
              }
            },
            {
              $project:{
                items:1,
                quantitty:1,
                product:{$arrayElemAt:['$product',0]}
              }
            },
            {
              $group:{
                _id:null,
                total:{$sum:{$multiply:['$quantitty','$product.price']}}
              }
            }


          ]).toArray()
          
          resolve(totalamount)


        })
      }
      getTotalAmount().then((totalamount) => {
        console.log(totalamount);
        let total=totalamount[0].total
      
        res.render('user/place-orders',{total})

    })

  })
  

  
 })
 
module.exports = router;
