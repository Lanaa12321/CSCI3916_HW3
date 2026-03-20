require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const authJwtController = require('./auth_jwt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./Users');
const Movie = require('./Movies');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

const router = express.Router();

router.post('/signup', async (req, res) => {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({
      success: false,
      msg: 'Please include both username and password to signup.'
    });
  }

  try {
    const user = new User({
      name: req.body.name,
      username: req.body.username,
      password: req.body.password
    });

    await user.save();

    res.status(201).json({
      success: true,
      msg: 'Successfully created new user.'
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with that username already exists.'
      });
    }

    console.error(err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
});

router.post('/signin', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username }).select(
      'name username password'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: 'Authentication failed. User not found.'
      });
    }

    const isMatch = await user.comparePassword(req.body.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        msg: 'Authentication failed. Incorrect password.'
      });
    }

    const userToken = {
      id: user._id,
      username: user.username
    };

    // ✅ FIXED LINE
    const token = jwt.sign(userToken, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({
      success: true,
      token: token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
});

router.route('/movies')
  .get(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const movies = await Movie.find({});
      return res.status(200).json(movies);
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Failed to get movies'
      });
    }
  })
  .post(authJwtController.isAuthenticated, async (req, res) => {
    try {
      const { title, releaseDate, genre, actors } = req.body;

      if (!title || !releaseDate || !genre || !actors || actors.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required movie information'
        });
      }

      const movie = new Movie({
        title,
        releaseDate,
        genre,
        actors
      });

      await movie.save();

      return res.status(201).json({
        success: true,
        movie
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Failed to create movie'
      });
    }
  });

app.use('/', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;