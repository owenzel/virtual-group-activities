const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const next = require('next');
const bodyParser = require('body-parser'); // Middleware for sanitizing requests
const { body, validationResult } = require('express-validator'); // Middleware for sanitizing user input
const neatCsv = require('neat-csv');
const fs = require('fs');

// Server set up with Next.js
const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Rooms set up
const ROOM_CAPACITY = 4;
// Save the rooms to memory based on their id with the following structure:
  // rooms = { 
  //          roomId: { 
  //                'host': { 'id': '', 'name': '', 'email': '', 'password': '' }, 
  //                'users': [{ 'id': '', 'name': '' } ],
  //                'activities': [],
  //                'Would You Rather': { activityData: [], activityIndex: -1 }   -- example of activity storage
  //              }
  //         }
const rooms = {};
const activityOptions = [
  { title: 'Would You Rather',
    description: 'Casual Game',
    data: { activityData: [], activityIndex: -1 }
  },
];

// FOR TESTING -- TODO: DELETE LATER:
rooms['test'] = { 
  'host': { 'id': '', 'name': 'test', 'email': 'test@gmail.com', 'password': djb2_xor('test') },
  'users': [],
  'activities': ['Would You Rather'],
  'Would You Rather': { activityData: [], activityIndex: -1 },
};

// Handle GET requests to the /api/activities route (at the pre-render of the /create page) by returning the activityOptions array
app.get('/api/activity-names', (req, res) => {
  res.send({ activities: activityOptions });
});

// Handle POST requests to the /api/create route by creating a new room 
app.post('/api/create', [
  // Validate user inputs
  body('roomId').not().isEmpty(),
  body('hostName').not().isEmpty(),
  body('hostEmail').isEmail().normalizeEmail(),
  body('hostPassword').not().isEmpty(),
], (req, res) => {
  // If the inputs are not valid, throw an error
  const errors = validationResult(req);
  // TODO: Differentiate between errors caused by user input (name, email, pass) and errors caused by not receiving UUID
  if (!errors.isEmpty()) {
    return res.send({ error: 'Please enter a name, valid email, password, and confirmed password.' });
  }

  const roomId = req.body.roomId;

  //If the user entered a room Id that is already taken, alert the client
  if (rooms[roomId]) {
    return res.send({ error: 'This Room Id is not available. Please enter a different one.' });
  }

  const selectedActivities = req.body.selectedActivities;

  // If the user selected activities, ensure they're valid
  selectedActivities.forEach(selectedActivity => {
    if (activityOptions.findIndex(activityOption => selectedActivity.title == activityOption.title) == -1) {
      return res.send({ error: 'Please enter (a) valid activity/activities.' });
    }
  });

  // If the inputs are valid, proceed with creating the room
  
  //Hash the password
  const hashedPassword = djb2_xor(req.body.hostPassword);

  // Save the new room to the rooms dictionary
  rooms[roomId] = { 
    'host': { 'id': '', 'name': req.body.hostName, 'email': req.body.hostEmail, 'password': hashedPassword },
    'users': [],
    'activities': selectedActivities || []
  };

  for (let i = 0; i < selectedActivities.length; i++) {
    rooms[roomId][selectedActivities[i]] = activityOptions.find(activity => activity.title == selectedActivities[i]).data;
  }

  // Send dummy data to signify success
  res.send(JSON.stringify({ success: '' }));
});

// Handle POST requests to the /api/join route by validating whether the room already exists
app.post('/api/join', [
  // Validate user inputs
  body('roomId').not().isEmpty(),
], (req, res) => {
  //If the inputs are not valid, throw an error
  const errors = validationResult(req);
  if (!errors.isEmpty() || !rooms[req.body.roomId]) {
    return res.send({ error: 'Please enter a valid Room Id.' });
  }

  // If the room is already full, prevent the client from joining and throw an error
  if (rooms[req.body.roomId]['users'].length === ROOM_CAPACITY)
  {
      return res.send({ error: 'This activity room is full. Please create your own activity room or wait until another person disconnects.' });
  }

  //Hash the password, if this is a potential host
  if (req.body.hostPassword != '') {
    const hashedPassword = djb2_xor(req.body.hostPassword);

    // If the host password entered by the user does not match the one stored in memory, throw an error
    if (hashedPassword != rooms[req.body.roomId]['host']['password']) {
      return res.send({ error: "Please enter a valid Host Password or, if you're not the host, join as a guest." });
    }

    // If this is the host (the passwords matched), send this back to the client (along with the activities)
    return res.send({ host: true, activities: rooms[req.body.roomId]['activities'] });
  }

  // If this is not the host, send this back to the client (along with the activities)
  res.send({ host: false, selectedActivities: [ 'Would You Rather' ] });
});

// Handle a client connection
io.on('connection', socket => {
  let roomId;
  let roomUsers;

  // Handle the user joining a room
  socket.on('joinRoom', ({ name, room }) => {
      roomId = room;

      roomUsers = rooms[roomId]['users'];

      // Join the room via socket.io
      socket.join(roomId);
      
      // Add the joining user's id to memory
      roomUsers.push({ id: socket.id, name: name });

      // Send list of room users to all clients in the room
      socket.emit('roomUsers', { userList: roomUsers });
  });

    socket.on('sendingSignal', payload => {
        const userName = rooms[roomId]['users'].find(user => user.id == payload.callerId).name;
        io.to(payload.userToSignal).emit('userJoined', { signal: payload.signal, callerId: payload.callerId, callerName: userName });
    });

    socket.on('returningSignal', payload => {
        io.to(payload.callerId).emit('receivingReturnedSignal', { signal: payload.signal, id: socket.id });
    });

    // Game socket.io events:

    // Handle a user joining the game by sending back the current index
    socket.on('joinGame', ({ room, activity }) => {
      roomId = room;
      // If the game hasn't started yet, send starter data
      // TODO: Clean up this logic
      if (activity == 'Would You Rather') {
        if (rooms[roomId][activity]['activityIndex'] == -1) {
          socket.emit('gameStart', { choice1: null, choice2: null });
        } else {
          socket.emit('gameStart', { choice1: rooms[roomId][activity]['activityData'][rooms[roomId][activity]['activityIndex']].choice_1, choice2: rooms[roomId][activity]['activityData'][rooms[roomId][activity]['activityIndex']].choice_2 });
        }
      }
    });

    socket.on('requestNextQuestion', async ({ activity }) => {
      rooms[roomId][activity]['activityIndex']++;
      // TODO: Clean up this logic
      if (activity == 'Would You Rather' && rooms[roomId][activity]['activityIndex'] == 0) {
        // If this is the start of the game, get the data
        fs.readFile('./wouldYouRather.csv', async (err, data) => {
          if (err) {
            return console.error(err);
          }
          rooms[roomId][activity]['activityData'] = await neatCsv(data);
          io.in(roomId).emit('nextQuestion', { choice1: rooms[roomId][activity]['activityData'][0].choice_1, choice2: rooms[roomId][activity]['activityData'][0].choice_2 });
        });
      }
      else if (activity == 'Would You Rather' && rooms[roomId][activity]['activityIndex'] < rooms[roomId][activity]['activityData'].length) {
        io.in(roomId).emit('nextQuestion', { choice1: rooms[roomId][activity]['activityData'][rooms[roomId][activity]['activityIndex']].choice_1, choice2: rooms[roomId][activity]['activityData'][rooms[roomId][activity]['activityIndex']].choice_2 });
      }
    }
  );

  // Handle the user disconnecting
  socket.on('disconnect', () => {
    // Find the user that disconnected in memory and, if they exist, proceed with removing them
    if (roomUsers)
    {
      const index = roomUsers.findIndex(user => user.id === socket.id);
    
      if (index !== -1) {
        // Remove the user from memory
        roomUsers.splice(index, 1);

        io.in(roomId).emit('userLeft', socket.id);
      }
    }
  })
    
});

//Hash function for hashing the passwords -- credit: https://gist.github.com/eplawless/52813b1d8ad9af510d85
function djb2_xor(str) {
  let len = str.length
  let h = 5381
 
  for (let i = 0; i < len; i++) {
    h = h * 33 ^ str.charCodeAt(i)
   }
   return h >>> 0
}

// More server setup in conjunction with Next.js
nextApp.prepare().then(() => {
  app.get('*', (req, res) => {
    return nextHandler(req, res)
  });

  server.listen(port, err => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${port}`)
  });
});