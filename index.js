const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Story = require('./models/Story');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');
const axios = require('axios');

const PORT = process.env.PORT || 3001;

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET;

app.use(cors({ credentials: true, origin: process.env.CORS }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS);
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

mongoose.set('strictQuery', false);
const connectDB = async () => {
  try {
    const connect = await mongoose.connect(
      `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@cluster0.ypcmtju.mongodb.net/?retryWrites=true&w=majority`
    );
    console.log(`Mongo DB Connected: ${connect.connection.host}`);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

app.use('/uploads', express.static(__dirname + '/uploads'));

app.use('/openai', require('./routes/openaiRoutes'));

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      email,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(400).json(e);
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userDoc = await User.findOne({ email });

    if (userDoc) {
      const passOk = bcrypt.compareSync(password, userDoc.password);
      if (passOk) {
        //Logged in
        jwt.sign(
          { email: userDoc.email, id: userDoc._id },
          secret,
          { expiresIn: '24h' },
          (err, token) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: 'Error signing token' });
            }
            res.cookie('token', token).json({
              httpOnly: false,
              id: userDoc._id,
              email,
            });
          }
        );
      } else {
        res.status(400).json('wrong credentials');
      }
    } else {
      res.status(400).json('user not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.get('/profile', (req, res) => {
  const { token } = req.cookies;
  // const token = req.cookies.token;

  if (token) {
    jwt.verify(token, secret, {}, (err, info) => {
      if (err) {
        console.log(err.message);
        res.status(401).json('Unauthorized');
        return;
      }
      res.json(info);
    });
  } else {
    res.status(401).json('Unauthorized');
  }
});

app.post('/logout', (req, res) => {
  res.cookie('token', '').json('ok');
});

app.post('/post', async (req, res) => {
  const { token } = req.cookies;

  try {
    const info = jwt.verify(token, secret, {});
    const { title, description, storyBody, storyEnd, image } = req.body;

    const response = await axios({
      method: 'get',
      url: image,
      responseType: 'stream',
    });

    const cleanTitle = title.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
    const imagePath = `uploads/${cleanTitle}.jpg`;
    response.data.pipe(fs.createWriteStream(imagePath));

    const storyDoc = await Story.create({
      title,
      description,
      storyBody,
      storyEnd,
      image: imagePath,
      author: info.id,
    });

    res.json({ storyDoc });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/post', async (req, res) => {
  res.json(await Story.find().sort({ createdAt: -1 }).limit(20));
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
});
