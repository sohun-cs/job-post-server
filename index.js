const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const coreOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  Credential: true,
  optionSuccessStatus: 200
}

app.use(cors(coreOptions));
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.k7dzav4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {

  try {
    // Connect the client to the server	(optional starting in v4.7)


    const jobCollection = client.db("jobPostDB").collection("jobs");
    const bidCollection = client.db("jobPostDB").collection("bids");


    // JWT generate
    app.post('/jwt', async(req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '10d'
      });
      res.send({token})
    })



    app.get('/jobs', async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result)
    });

    app.get('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.get('/jobs/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'buyer.email': email };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/jobs', async (req, res) => {
      const jobData = req.body;
      const result = await jobCollection.insertOne(jobData);
      res.send(result);
    });

    app.delete('/job/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    app.put('/job/:id', async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const query = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          ...jobData,
        },
      }
      const result = await jobCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });


    app.post('/bids', async (req, res) => {
      const bidData = req.body;
      const result = await bidCollection.insertOne(bidData);
      res.send(result);
    });

    app.get('/my-bids/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/bid-requests/:email', async (req, res) => {
      const email = req.params.email;
      const query = { 'buyer.email': email }
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });


    app.patch('/bid/:id', async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: status
      };
      const result = await bidCollection.updateOne(query, updateDoc);
      res.send(result)
    })


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send("Hello Job post server")
});

app.listen(port, () => {
  console.log(`Server is Running on ${port}`);
})