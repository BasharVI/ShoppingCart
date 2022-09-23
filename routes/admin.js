var express = require('express');
const { ObjectId } = require('mongodb');
const { route } = require('./user');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient


/* GET users listing. */
router.get('/', function(req, res, next) {

   MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
    function getallproducts(){
      return new Promise (async(resolve,reject)=>{
        let products=await client.db('shopping').collection('Products').find().toArray()
        resolve (products)
        res.render('admin/view-products',{admin:true,products})
      })
     
    }
    getallproducts()
 
  })
});

router.get('/add-products',(req,res,next)=>{
  res.render('admin/add-products',{admin:true})
})
router.post('/add-products',(req,res,next)=>{

  MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
      client.db('shopping').collection('Products').insertOne(req.body).then(id=>{
    
      let image=req.files.Image
      let imgid=id.insertedId
      
      image.mv('./public/product-images/'+imgid+'.jpg',(err)=>{
        if(err)
        throw err;
        else
        res.render('admin/add-products',{admin:true})
      })
     })
  })
 })

 router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id
  
  MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
    function deleteProduct(){
      return new Promise ((resolve,reject)=>{
        client.db('shopping').collection('Products').deleteOne({_id:ObjectId(proId)}).then((response)=>{
          
          resolve (response)
        })
        
        
      })
     
    }
    deleteProduct().then((response)=>{
      
      res.redirect('/admin/')
    })
 
  })

 }) 

 router.get('/edit-product/:id',async(req,res)=>{

  

  let proId=req.params.id
  //console.log(proId);

  MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
    function getProductdetails(){
      return new Promise ((resolve,reject)=>{

        client.db('shopping').collection('Products').findOne({_id:ObjectId(proId)}).then((pro)=>{
          //console.log(pro);
          resolve (pro)
        })
      
        
      })
     
    }getProductdetails().then((pro)=>{
      //console.log(pro);
    res.render('admin/edit-product',{admin:true,pro})
    })
    
  })
  
  
  
 })

 router.post('/edit-product/:id',(req,res)=>{

  let proId=req.params
  
  MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
    function updateProductdetails(){
      return new Promise ((resolve,reject)=>{

        client.db('shopping').collection('Products').updateOne({_id:ObjectId(proId)},{
          $set:{
            Name:req.body.Name,
            price:req.body.price,
            category:req.body.category,
            Description:req.body.Description
          }
        }).then((pro)=>{
          //console.log(pro);
          resolve (pro)
        })
      
        
      })
     
    }updateProductdetails().then((pro)=>{
      
    if (req.files){
      let image=req.files.Image
      let imgid=req.params.id
      image.mv('./public/product-images/'+imgid+'.jpg')
      res.redirect('/admin/')
    }
    else{
      res.redirect('/admin/')
    }

    })
    
  })
  
  
  
 })

 router.get('/all-users',(req,res)=>{

  MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
    function getallUsers(){
      return new Promise ((resolve,reject)=>{

       let allusers= client.db('shopping').collection('users').find().toArray()
       resolve (allusers)
      
      })
     
    }getallUsers().then((response)=>{
      users=response
      res.render('admin/all-users',{admin:true,users})
    })
      
    
    
  })
  
})

router.get('/all-orders',(req,res)=>{

  MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
    function getallOrders(){
      return new Promise ((resolve,reject)=>{

       let allOrders= client.db('shopping').collection('orders').find().toArray()
       resolve (allOrders)
      
      })
     
    }getallOrders().then((response)=>{
      orders=response
      res.render('admin/all-orders',{admin:true,orders})
    })
      
    
    
  })
  
})





module.exports = router;
