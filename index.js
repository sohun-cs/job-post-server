const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');

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

    const jobCollection = client.db("jobPostDB").collection("jobs");

  try {
    // Connect the client to the server	(optional starting in v4.7)
    // Send a ping to confirm a successful connection

    app.get('/jobs', async(req, res) => {
        const result = await jobCollection.find().toArray();
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