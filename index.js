const express = require('express');
const mongoose = require('mongoose');
const moment = require('moment');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/socialNetworkDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected!');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true },
  email: { type: String, unique: true, required: true, match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
  thoughts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Thought' }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

const User = mongoose.model('User', userSchema);

// Thought Schema
const thoughtSchema = new mongoose.Schema({
  thoughtText: { type: String, required: true, minlength: 1, maxlength: 280 },
  createdAt: { type: Date, default: Date.now, get: (createdAtVal) => moment(createdAtVal).format('MMM DD, YYYY [at] hh:mm a') },
  username: { type: String, required: true },
  reactions: [
    {
      reactionId: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
      reactionBody: { type: String, required: true, maxlength: 280 },
      username: { type: String, required: true },
      createdAt: { type: Date, default: Date.now, get: (createdAtVal) => moment(createdAtVal).format('MMM DD, YYYY [at] hh:mm a') },
    },
  ],
},
{
    toJSON: {
        getters: true,
    },
    id: false,
});

const Thought = mongoose.model('Thought', thoughtSchema);

// API Routes

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().populate('thoughts').populate('friends');
    res.json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get a single user by id
app.get('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('thoughts').populate('friends');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const user = await User.create(req.body);
    res.json(user);
  } catch (err) {
    res.status(400).json(err);
  }
});

// Update a user by id
app.put('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, req.body, { new: true, runValidators: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(400).json(err);
  }
});

// Delete a user by id
app.delete('/api/users/:userId', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    await Thought.deleteMany({ username: user.username });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json(err);
  }
});

// Add a friend
app.post('/api/users/:userId/friends/:friendId', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.userId, { $addToSet: { friends: req.params.friendId } }, { new: true });
        if(!user){
            return res.status(404).json({message: "User not found."});
        }
        const friend = await User.findByIdAndUpdate(req.params.friendId, {$addToSet: {friends: req.params.userId}}, {new: true});
        if(!friend){
          return res.status(404).json({message: "Friend not found."});
        }

        res.json(user);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Remove a friend
app.delete('/api/users/:userId/friends/:friendId', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.userId, { $pull: { friends: req.params.friendId } }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const friend = await User.findByIdAndUpdate(req.params.friendId, {$pull: {friends: req.params.userId}}, {new: true});

    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get all thoughts
app.get('/api/thoughts', async (req, res) => {
  try {
    const thoughts = await Thought.find();
    res.json(thoughts);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Get a single thought by id
app.get('/api/thoughts/:thoughtId', async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.thoughtId);
    if (!thought) {
      return res.status(404).json({ message: 'Thought not found' });
    }
    res.json(thought);
  } catch (err) {
    res.status(500).json(err);
  }
});

// Create a new thought
app.post('/api/thoughts', async (req, res) => {
  try {
    const thought = await Thought.create(req.body);
    await User.findOneAndUpdate(
        {username: req.body.username},
        {$push: {thoughts: thought._id}},
        {new: true}
    );
    res.json(thought);
  } catch (err) {
    res.status(400).json(err);
  }
});

// Update a thought by id
app.put('/api/thoughts/:thoughtId', async (req, res) => {
  try {
    const thought = await Thought.findByIdAndUpdate(req.params.thoughtId, req.body, { new: true, runValidators: true });
    if (!thought) {
      return res.status(404).json({ message: 'Thought not found' });
    }
    res.json(thought);
  } catch (err) {
    res.status(400).json(err);
  }
});

// Delete a thought by id
app.delete('/api/thoughts/:thoughtId', async (req, res) => {
  try {
    const thought = await Thought.findByIdAndDelete(req.params.thoughtId);
    if (!thought) {
      return res.status(404).json({ message: 'Thought not found' });
    }
    await User.findOneAndUpdate(
        {username: thought.username},
        {$pull: {thoughts: thought._id}},
        {new: true}
    );
    res.json({ message: 'Thought deleted' });
  } catch (err) {
    res.status(500).json(err);
  }
} );

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

