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
const auth = require('./auth.js');

const PORT = process.env.PORT || 3001;

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = process.env.SECRET;

app.use(cors({ credentials: true, origin: process.env.CORS }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS);
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

mongoose.set('strictQuery', false);

const connectDB = () => {
  return mongoose.connect(
    `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@cluster0.ypcmtju.mongodb.net/?retryWrites=true&w=majority`
  );
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
            res
              .status(200)
              .cookie('token', token, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                path: '/',
              })
              .json({
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

  if (token) {
    jwt.verify(token, secret, {}, (err, info) => {
      if (err) {
        console.log(err.message);
        res.status(401).json({ message: 'Unauthorized', error: err.message });
        return;
      }
      res.status(200).json(info);
    });
  } else {
    res.status(401).json('Unauthorized');
  }
});

app.post('/logout', (req, res) => {
  res
    .clearCookie('token', {
      httpOnly: true,
      path: '/',
      secure: true,
      sameSite: 'none',
    })
    .json('ok');
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

app.post('/payment', (req, res) => {
  const { metadata } = req.body;
  const userId = metadata.id;

  // Update the user's subscription status in database
  User.updateOne({ _id: userId }, { subscriptionStatus: 'active' }, (err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ message: 'Error updating subscription status' });
    } else {
      res.status(200).json({ message: 'Subscription updated successfully' });
    }
  });
});

// authentication endpoint
app.get('/auth-endpoint', auth, (request, response) => {
  response.json({ message: 'Authorized' });
});

connectDB()
  .then((connect) => {
    console.log(`MongoDB Connected: ${connect.connection.host}`);
    app.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
