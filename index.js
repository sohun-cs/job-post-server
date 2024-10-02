const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://jobpost-ecb07.web.app',
    'https://sparkling-paprenjak-63336f.netlify.app'
  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// verify jwt middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) return res.status(401).send({ message: 'unauthorized access' });

  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      req.user = decoded;
      next();

    })
  }


}


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
    app.post('/jwt', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '10d'
      });
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
        })
        .send({ success: true });
    });

    // Clear token on logout
    app.get('/logout', (req, res) => {
      res
        .clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          maxAge: 0,
        })
        .send({ success: true })
    });



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

    // --------------------------------------------------------------
    app.get('/jobs/:email', verifyToken, async (req, res) => {
      const tokenEmail = req.user.email;
      const email = req.params.email;

      if (tokenEmail !== email) {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const query = { 'buyer.email': email };
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/jobs', async (req, res) => {
      const jobData = req.body;
      const result = await jobCollection.insertOne(jobData);
      res.send(result);
    });

    app.delete('/job/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    app.put('/job/:id', verifyToken, async (req, res) => {
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

      const query = {
        email: bidData.email,
        jobId: bidData.jobId
      };
      const alreadyApplied = await bidCollection.findOne(query);

      if (alreadyApplied) {
        return res.status(400).send('You have already placed a bid on this job.');
      }

      const result = await bidCollection.insertOne(bidData);
      res.send(result);
    });

    app.get('/my-bids/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/bid-requests/:email', verifyToken, async (req, res) => {
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
    });



    // Get all jobs data from db for pagination
    app.get('/all-jobs', async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const filter = req.query.filter;
      const sort = req.query.sort;
      const search = req.query.search;

      let query = {
        job_title: {
          $regex: search, $options: 'i'
        }
      };
      // if (filter) query = { category: filter };

      // if (filter) query = { ...query, category: filter };
      if (filter) query.category = filter;

      let options = {};
      if (sort) options = { sort: { deadline: sort === 'asc' ? 1 : -1 } }
      const result = await jobCollection.find(query, options).skip(page * size).limit(size).toArray();
      res.send(result)
    });

    // Get all jobs data from db
    app.get('/jobs-count', async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;

      let query = {
        job_title: {
          $regex: search, $options: 'i'
        }
      };

      if (filter) query.category = filter;
      const count = await jobCollection.countDocuments(query);

      res.send({ count })
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