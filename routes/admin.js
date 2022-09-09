var express = require('express');
const { ObjectId } = require('mongodb');
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


module.exports = router;
