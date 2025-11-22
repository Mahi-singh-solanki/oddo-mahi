const mongoose = require("mongoose");
const express = require("express");
const { authenticateJWT } = require("./auth");
const { object } = require("webidl-conversions");
const router = express.Router();

const Product = mongoose.model(
  "Product",
  new mongoose.Schema({
    name: { type: String, required: true },
    SKUcode: { type: String, required: true },
    category:{ type: String, required: true },
    location:{ type: String, default:"Main warehouse" },
    price:{type:Number,required:true},
    unit:{type: String},
    stock:{type:Number,default:0},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })
);

const Transfer = mongoose.model(
  "Transfer",
  new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    from:{ type:String},
    to:{ type: String},
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  })
);

const Warehouse=mongoose.model(
    "Warehouse",
    new mongoose.Schema({
        name:{type: String, required: true},
        shortcode:{type: String, required: true},
        address:{type: String, required: true}
    })
)

const ReceiptProductSchema=new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 }
},{ _id: false })

const Receipt=mongoose.model(
    "Receipt",
    new mongoose.Schema({
        order_no:{type:Number,required:true},
        supplier:{type:String,required:true},
        products:[ReceiptProductSchema],
        totalamount:{type:Number,required:true},
        order_type:{type: String,
      enum: ["received", "sent"],
      default: "received",}
    })
)

const deliverySchema=new mongoose.Schema({
    receiptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Receipt',
        required: true,
        unique: true 
    },
    orderNumber: { 
        type: Number, 
        required: true,
        unique: true
    },
    deliveryStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'In Transit', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Pending',
        required: true
    },
    shippedDate: {
        type: Date,
        default: null
    },
    recipientName: {
        type: String,
        required: true
    },
    shippingAddress: {
        type: String,
        required: true
    },
    trackingNumber: {
        type: String,
        unique: true,
        sparse: true 
    },

}, { timestamps: true })

const DeliveryOrder = mongoose.model('DeliveryOrder', deliverySchema);

router.post("/product", authenticateJWT, async (req, res) => {
  try {
    const { name, SKUcode, category, price } = req.body;
    if (!name || !category)
      res.status(400).json({ error: "Name and category needed" });
    const product = new Product({
      name: name,
      category: category,
      SKUcode:SKUcode,
      price: price
    });
    await product.save();
    res.status(200).json({ message: "Product added suucesfully", product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});

router.get("/products", authenticateJWT, async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });
    res.json({
      count: products.length,
      products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});

router.put("/products/:id", authenticateJWT, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const { stock,unit,price,category,name } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "product not found" });
    if (name) product.name = name;
    if (category) product.category = category;
    if (stock) product.stock = stock;
    if (unit) product.unit = unit;
    if (price) product.price = price;
    product.updatedAt = Date.now();
    await product.save();
    res.status(200).json({ message: "Product updated successfully", product });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});

router.delete("/products/:id", authenticateJWT, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "product not found" });
    await product.deleteOne();
    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});

router.post("/orders/receipt", authenticateJWT, async (req, res) => {
  try {
    const { order_no,supplier,products,order_type } = req.body;
    if (!order_no || !supplier)
      res.status(400).json({ error: "order and supplier needed" });

    let totalamount=0
    const finalproducts=[]
    for (const item of products){
        if (!item.quantity || !item.unitPrice || item.quantity <= 0 || item.unitPrice < 0) {
                return res.status(400).json({ 
                    message: 'Each product must have a valid quantity and unitPrice.' 
                });
            }

        if(order_type=="received"){
            let existingProduct = await Product.findOne({ SKUcode: item.SKUcode });
            if(!existingProduct)
            {
                if (!item.name || !item.category || !item.price || !item.SKUcode) {
                     return res.status(400).json({ 
                        message: `Product with SKU ${item.SKUcode} is missing required fields (name, category, price) for creation.` 
                    });
                }
                const newProduct = new Product({
                    name: item.name,
                    SKUcode: item.SKUcode,
                    category: item.category,
                    price: item.price, 
                    unit: item.unit || 'unit', 
                    stock: item.quantity, 
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                existingProduct=await newProduct.save();
            }else{
                existingProduct.stock+=item.quantity
                existingProduct.updatedAt=new Date()
                await existingProduct.save();
            }
            totalamount+=item.quantity*item.unitPrice
            finalproducts.push({
                productId:existingProduct._id,
                name:existingProduct.name,
                quantity:item.quantity,
                unitPrice:item.unitPrice,
                SKUcode:existingProduct.SKUcode
            })

        }else{
            let existingProduct = await Product.findOne({ SKUcode: item.SKUcode });
            if(!existingProduct)
            {
                return res.status(404).json({ 
                    message: 'Product is not available' 
                });
            }
            if (existingProduct.stock < item.quantity) {
         return res.status(400).json({ 
            message: `Insufficient stock for product ${item.SKUcode}. Available: ${existingProduct.stock}` 
        });}
          else{
                existingProduct.stock=existingProduct.stock-item.quantity
                existingProduct.updatedAt=new Date()
                await existingProduct.save();
            }
            totalamount+=item.quantity*item.unitPrice
            finalproducts.push({
                productId:existingProduct._id,
                name:existingProduct.name,
                quantity:item.quantity,
                unitPrice:item.unitPrice,
                SKUcode:existingProduct.SKUcode
            })
        }

    }
    const newReceipt = new Receipt({
            order_no: order_no,
            supplier,
            products: finalproducts,
            totalamount,
            order_type
        });
        const savedreceipt=await newReceipt.save()
        if(savedreceipt.order_type==="sent")
        {
            const { recipientName, shippingAddress } = req.body;
            if (!recipientName || !shippingAddress){
                return res.status(400).json({ error: "Recipient name and address are required for issued orders." });
            }
            const newDelivery = new DeliveryOrder({
                receiptId: savedreceipt._id,
                orderNumber: savedreceipt.order_no,
                recipientName: recipientName,
                shippingAddress: shippingAddress,
                deliveryStatus: 'Pending', 
                shippedDate: new Date(), // Set the date the order was created/issued
            });
            await newDelivery.save();
        }
        return res.status(201).json(savedreceipt)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});

router.get("/orders/receipt", authenticateJWT, async (req, res) => {
  try {
    const receipts = await Receipt.find().sort({
      createdAt: -1,
    });
    res.json({
      count: receipts.length,
      receipts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});


router.get("/orders/delivery", authenticateJWT, async (req, res) => {
  try {
    const deliveryorders = await DeliveryOrder.find().sort({
      createdAt: -1,
    });
    res.json({
      count: deliveryorders.length,
      deliveryorders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});

router.put("/delivery/:id", authenticateJWT, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid delivery ID" });
    }
    const { deliveryStatus } = req.body;
    const delivery = await DeliveryOrder.findById(req.params.id);
    if (!delivery) return res.status(404).json({ error: "Delivery is not issued" });
    if (deliveryStatus) delivery.deliveryStatus = deliveryStatus;
    delivery.updatedAt = Date.now();
    await delivery.save();
    res.status(200).json({ message: "Delivery status updated successfully", delivery });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});


router.post("/warehouse", authenticateJWT, async (req, res) => {
  try {
    const { name,shortcode,address } = req.body;
    if (!name || !shortcode)
      res.status(400).json({ error: "Name and category needed" });
    const warehouse = new Warehouse({
      name: name,
      shortcode:shortcode,
      address:address
    });
    await warehouse.save();
    res.status(200).json({ message: "Warehouse added succesfully", warehouse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});

router.get("/warehouses", authenticateJWT, async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({
      createdAt: -1,
    });
    res.json({
      count: warehouses.length,
      warehouses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});

router.post("/products/:id/transfer", authenticateJWT, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const { to } = req.body;
    if (!to)
      res.status(400).json({ error: "tranfer location needed" });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "product not found" });
    
    const transfer = new Transfer({
      productId:product._id,
      from:product.location,
      to:to
    });
    if (to) product.location = to;
    product.updatedAt = Date.now();
    await product.save();
    await transfer.save();
    res.status(200).json({ message: "Transfered succesfully",transfer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});

router.get("/transfers", authenticateJWT, async (req, res) => {
  try {
    const transfers = await Transfer.find().sort({
      createdAt: -1,
    });
    res.json({
      count: transfers.length,
      transfers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server connection error" });
  }
});



module.exports = { router, Product };