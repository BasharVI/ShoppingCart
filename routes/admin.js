var express = require('express');
const { ObjectId } = require('mongodb');
var router = express.Router();
var MongoClient = require('mongodb').MongoClient


/* GET users listing. */
router.get('/', function(req, res, next) {
  let products=[
    {
      name:"realme c21",
      category:"Mobile",
      Description:'3 GB RAM | 32 GB ROM | Expandable Upto 256 GB',
      image:"https://rukminim1.flixcart.com/image/416/416/ksnjp8w0/mobile/k/o/m/c21y-rmx3261-realme-original-imag65kcytrk8dtr.jpeg?q=70"

    },
    {
      name:"POCO C30",
      category:"Mobile",
      Description:'13MP + 2MP + 2MP | 5MP Front Camera',
      image:"https://rukminim1.flixcart.com/image/416/416/ku4ezrk0/mobile/p/e/4/c31-mzb0a0jin-poco-original-imag7bzqxgdhgf2n.jpeg?q=70"

    },
    {
      name:"Samsung Galaxy F13",
      category:"Mobile",
      Description:'6000 mAh Lithium Ion Battery',
      image:"https://rukminim1.flixcart.com/image/416/416/l4n2oi80/mobile/m/w/x/-original-imagfhu6bdzhnmkz.jpeg?q=70"
    },
    {
      name:"RedMI 10A",
      category:"Mobile",
      Description:'16.59 cm (6.53 inch) Display',
      image:"https://rukminim1.flixcart.com/image/416/416/l2f20sw0/mobile/h/c/6/10a-b09xb7hv7q-redmi-original-imagdrgp8pkbzccw.jpeg?q=70"
    }
  ]
  res.render('admin/view-products',{admin:true,products})
});

router.get('/add-products',(req,res,next)=>{
  res.render('admin/add-products',{admin:true})
})
router.post('/add-products',(req,res,next)=>{

  MongoClient.connect('mongodb://localhost:27017',function(err,client){
    if (err)
    console.log('error');
    else
    console.log('datatbase connected');
    client.db('shopping').collection('Products').insertOne(req.body).then(result=>{
    
      let image=req.files.Image
      
      image.mv('./public/product-images/'+result.insertedId+'.jpg',(err)=>{
        if(err)
        throw err;
        else
        res.render('admin/add-products',{admin:true})
      })


    })

      
    })
      
      
    

  })


module.exports = router;
