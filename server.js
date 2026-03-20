require('dotenv').config();

const express = require('express');
const cors = require('cors');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('./Users');
const Movie = require('./Movies');
const auth = require('./auth_jwt');

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

require('./auth_jwt');

app.get('/', (req, res) => {
  res.send('API is running');
});

app.post('/signup', async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, username, and password are required'
      });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    const newUser = new User({
      name,
      username,
      password
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'User created successfully'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.post('/signin', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User not found.'
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Incorrect password.'
      });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.SECRET_KEY,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      success: true,
      token: 'Bearer ' + token
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.get('/movies', auth.isAuthenticated, async (req, res) => {
  try {
    const movies = await Movie.find();
    return res.status(200).json(movies);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.get('/movies/:movieparameter', auth.isAuthenticated, async (req, res) => {
  try {
    const movie = await Movie.findOne({ title: req.params.movieparameter });

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    return res.status(200).json(movie);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.post('/movies', auth.isAuthenticated, async (req, res) => {
  try {
    const { title, releaseDate, genre, actors } = req.body;

    if (!title || !releaseDate || !genre || !actors || actors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'title, releaseDate, genre, and actors are required'
      });
    }

    const existingMovie = await Movie.findOne({ title });

    if (existingMovie) {
      return res.status(409).json({
        success: false,
        message: 'Movie already exists'
      });
    }

    const newMovie = new Movie({
      title,
      releaseDate,
      genre,
      actors
    });

    await newMovie.save();

    return res.status(201).json({
      success: true,
      message: 'Movie created successfully',
      movie: newMovie
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.put('/movies/:movieparameter', auth.isAuthenticated, async (req, res) => {
  try {
    const { title, releaseDate, genre, actors } = req.body;

    if (!title || !releaseDate || !genre || !actors || actors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'title, releaseDate, genre, and actors are required'
      });
    }

    const updatedMovie = await Movie.findOneAndUpdate(
      { title: req.params.movieparameter },
      {
        title,
        releaseDate,
        genre,
        actors
      },
      { new: true, runValidators: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Movie updated successfully',
      movie: updatedMovie
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

app.delete('/movies/:movieparameter', auth.isAuthenticated, async (req, res) => {
  try {
    const deletedMovie = await Movie.findOneAndDelete({
      title: req.params.movieparameter
    });

    if (!deletedMovie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Movie deleted successfully'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});