var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const { response, Router } = require('express');
const { ObjectId } = require('mongodb');
const session = require('express-session');
const Razorpay=require('razorpay')
var MongoClient = require('mongodb').MongoClient
const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

var instance = new Razorpay({
  key_id: 'rzp_test_qeyqdQojKS040o',
  key_secret: 'FqpYRlQPGOQphrqUGdhXjsU5',
});


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

  MongoClient.connect('mongodb://localhost:27017', async function (err, client) {
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
              $unwind: '$products'
            },
            {
              $project: {
                items: '$products.items',
                quantitty: '$products.quantity'
              }

            },
            {
              $lookup: {
                from: 'Products',
                localField: 'items',
                foreignField: '_id',
                as: 'product'
              }
            },
            {
              $project: {
                items: 1,
                quantitty: 1,
                product: { $arrayElemAt: ['$product', 0] }
              }
            }


          ]).toArray()

          resolve(cartItems)


        })
      }
    let products = await getcartProducts()


    if (products == null) {
      res.render('user/cart')
    }

    function getTotalAmount() {
      let user = req.session.user._id
      return new Promise(async (resolve, reject) => {
        let totalamount = await client.db('shopping').collection('cart').aggregate([
          {
            $match: { user: ObjectId(user) }
          },
          {
            $unwind: '$products'
          },
          {
            $project: {
              items: '$products.items',
              quantitty: '$products.quantity'
            }

          },
          {
            $lookup: {
              from: 'Products',
              localField: 'items',
              foreignField: '_id',
              as: 'product'
            }
          },
          {
            $project: {
              items: 1,
              quantitty: 1,
              product: { $arrayElemAt: ['$product', 0] }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ['$quantitty', '$product.price'] } }
            }
          }


        ]).toArray()

        resolve(totalamount[0].total)


      })
    }

    let total = await getTotalAmount()

    res.render('user/cart', { products, total, user: req.session.user })




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
        let prObj = {
          items: ObjectId(proid),
          quantity: 1
        }
        return new Promise(async (resolve, reject) => {
          let usercart = await client.db('shopping').collection('cart').findOne({ user: ObjectId(userid._id) })
          if (usercart) {
            let proExist = usercart.products.findIndex(product => product.items == proid)
            console.log(proExist)
            if (proExist != -1) {
              client.db('shopping').collection('cart').updateOne({ 'products.items': ObjectId(proid) },
                {
                  $inc: { 'products.$.quantity': 1 }
                }).then(() => {
                  resolve()
                })

            } else {
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

router.get('/delete-cartproduct/:id', (req, res) => {
  let proId = req.params.id

  let user = req.session.user


  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else
      function deletecartProduct() {
        return new Promise((resolve, reject) => {
          client.db('shopping').collection('cart')
            .updateOne({ user: ObjectId(user._id) },

              {
                $pull: { products: { items: ObjectId(proId) } }

              }).then((response) => {

                resolve(response)
              })


        })

      }
    deletecartProduct().then((response) => {

      res.redirect('/cart')
    })

  })

})

router.post('/change-product-quantity', (req, res) => {

  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else
      function changeProductQuantity() {
        let count = parseInt(req.body.count)

        let quantity = parseInt(req.body.quantity)

        let cart = req.body.cart

        prod = req.body.product

        return new Promise((resolve, reject) => {
          client.db('shopping').collection('cart')
            .updateOne({ _id: ObjectId(cart), 'products.items': ObjectId(prod) },

              {
                $inc: { 'products.$.quantity': count }

              }).then((response) => {

                resolve(response)
              })


        })

      }
    changeProductQuantity().then(async (response) => {

      let userid = req.body.user

      function getTotalAmount() {

        return new Promise(async (resolve, reject) => {

          let totalamount = await client.db('shopping').collection('cart').aggregate([
            {
              $match: { user: ObjectId(userid) }
            },
            {
              $unwind: '$products'
            },
            {
              $project: {
                items: '$products.items',
                quantitty: '$products.quantity'
              }

            },
            {
              $lookup: {
                from: 'Products',
                localField: 'items',
                foreignField: '_id',
                as: 'product'
              }
            },
            {
              $project: {
                items: 1,
                quantitty: 1,
                product: { $arrayElemAt: ['$product', 0] }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $multiply: ['$quantitty', '$product.price'] } }
              }
            }


          ]).toArray()

          resolve(totalamount[0].total)


        })
      }

      response.total = await getTotalAmount()

      res.json(response)
    })

  })

})



router.get('/place-order', verifyLogin, (req, res) => {

  let user = req.session.user._id

  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
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
              $unwind: '$products'
            },
            {
              $project: {
                items: '$products.items',
                quantitty: '$products.quantity'
              }

            },
            {
              $lookup: {
                from: 'Products',
                localField: 'items',
                foreignField: '_id',
                as: 'product'
              }
            },
            {
              $project: {
                items: 1,
                quantitty: 1,
                product: { $arrayElemAt: ['$product', 0] }
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $multiply: ['$quantitty', '$product.price'] } }
              }
            }


          ]).toArray()

          resolve(totalamount)


        })
      }
    getTotalAmount().then((totalamount) => {

      let total = totalamount[0].total

      res.render('user/place-orders', { total,user:req.session.user })

    })

  })



})


router.post('/place-order',verifyLogin,(req,res)=>{
  
  userId=req.body.userId
  console.log(req.body)

  MongoClient.connect('mongodb://localhost:27017',function (err, client) {
    if (err)
      console.log('error');
    else
    function getcartproductList(){
      return new Promise (async(resolve,reject)=>{
        let cart =await client.db('shopping').collection('cart').findOne({user:ObjectId(userId)})
        console.log(cart.products);
        resolve(cart.products)
      })
    }
    
    
    function getTotalAmount() {
      return new Promise(async (resolve, reject) => {
        let totalamount = await client.db('shopping').collection('cart').aggregate([
          {
            $match: { user: ObjectId(userId) }
          },
          {
            $unwind: '$products'
          },
          {
            $project: {
              items: '$products.items',
              quantitty: '$products.quantity'
            }

          },
          {
            $lookup: {
              from: 'Products',
              localField: 'items',
              foreignField: '_id',
              as: 'product'
            }
          },
          {
            $project: {
              items: 1,
              quantitty: 1,
              product: { $arrayElemAt: ['$product', 0] }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $multiply: ['$quantitty', '$product.price'] } }
            }
          }


        ]).toArray()

        resolve(totalamount[0].total)


      })
    }
    

    
    
    function placeOrders(){
      
      return new Promise (async(resolve,reject)=>{
        let total = await getTotalAmount()
        
        let products= await getcartproductList()
        
        let status=req.body['payment method']=='COD'?'Placed':'Pending'
        let orderObj={
          deliveryDetails:{
            mobile:req.body.mobile,
            address:req.body.address,
            pincode:req.body.pincode,
          },
          userId:ObjectId(req.body.userId),
          paymentMethod:req.body['payment method'],
          products:products,
          totalAmount:total,
          status:status,
          date:new Date()
          
          
        }
        client.db('shopping').collection('orders').insertOne(orderObj).then((response)=>{
          console.log(response);
          client.db('shopping').collection('cart').deleteOne({user:ObjectId(req.body.userId)})
          resolve(response)
        })
      })
    }
    placeOrders().then(async (response)=>{
      let order=await client.db('shopping').collection('orders').findOne({_id:ObjectId(response.insertedId)})
      console.log(order);
      let total=order.totalAmount
      console.log(response); 
      let orderId=response.insertedId
      console.log(orderId);
      
      // console.log(total); 
    
      if(req.body['payment method']==='COD'){  
        res.json({codSuccess:true}) 
      }else{ 
         
        function generateRazorpay(){

          return new Promise((resolve,reject)=>{
            var options = {
              amount: total,  // amount in the smallest currency unit
              currency: "INR",
              receipt: ""+orderId
            };
            instance.orders.create(options, function(err, order) {
              if (err){
                console.log(err);
              }else{
                resolve(order)
              }
              
            });
          })

        }
        generateRazorpay().then((response)=>{
          console.log(response);
          res.json(response)
        })
      }
      

    })
        

  })


})

router.get('/ordersuccess',(req,res)=>{
  res.render('user/ordersuccess',{user:req.session.user})
})
router.get('/orders',verifyLogin,(req,res)=>{
 
  let userId=req.session.user._id
  console.log(userId);

  MongoClient.connect('mongodb://localhost:27017',async function (err, client) {
    if (err)
      console.log('error');
    else

    function orderList(){

      return new Promise(async(resolve,reject)=>{
       let orders=await client.db('shopping').collection('orders').find({userId:ObjectId(userId)}).toArray()
        console.log(orders);
        resolve(orders)
      
      })


    }
    let orders=await orderList()
  
    
      res.render('user/orders',{ orders,user:req.session.user})


  })
  
})

router.get('/view-ordered-product/:id',(req,res)=>{
  let orderId=req.params
  console.log(orderId);

  MongoClient.connect('mongodb://localhost:27017', function (err, client) {
    if (err)
      console.log('error');
    else
    function getorderedProducts(){


      return new Promise(async(resolve,reject)=>{

      
      let orderedItems=await client.db('shopping').collection('orders').aggregate([
          {
            $match:{_id:ObjectId(orderId)}
          },
          {
            $unwind:'$products'
          },
          {
            $project:{
              items:'$products.items',
              quantity:'$products.quantity'
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
              items:1,quantity:1,product:{$arrayElemAt:['$product',0]}
            } 
          }
      ]).toArray()
      
      resolve(orderedItems)
    })
    }
     getorderedProducts().then((products)=>{
      console.log(products);
      res.render('user/view-ordered-product',{products,user:req.session.user})
     })
  })
  
})

router.post('/verify-payment',(req,res)=>{
  console.log(req.body);
  console.log('payment verified');
})

module.exports = router;
