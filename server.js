// Imports 
const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const next = require('next');
const bodyParser = require('body-parser'); // Middleware for sanitizing requests
const { body, validationResult } = require('express-validator'); // Middleware for sanitizing user input

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
  //              }
  //         }
const rooms = {};
const activityOptions = [
  { title: 'Would You Rather',
    description: 'Casual Game'
  },
  { title: 'Never Have I Ever',
    description: 'Casual Game'
  },
];

// FOR TESTING -- TODO: DELETE LATER:
rooms['test'] = { 
  'host': { 'id': '', 'name': 'test', 'email': 'test@gmail.com', 'password': djb2_xor('test') },
  'users': [],
  'activities': ['Would You Rather'],
};

// Handle GET requests to the /api/activities route (at the pre-render of the /create page) by returning the activityOptions array
app.get('/api/activities', (req, res) => {
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
    return res.send({ error: 'Please enter a valid name, email, and password.' });
  }
  // If the user selected activities, ensure they're valid
  req.body.selectedActivities.forEach(selectedActivity => {
    if (activityOptions.findIndex(activityOption => selectedActivity.title == activityOption.title) == -1) {
      return res.send({ error: 'Please enter (a) valid activity/activities.' });
    }
  });

  // If the inputs are valid, proceed with creating the room
  
  //Hash the password
  const hashedPassword = djb2_xor(req.body.hostPassword);

  // Save the new room to the rooms dictionary
  rooms[req.body.roomId] = { 
    'host': { 'id': '', 'name': req.body.hostName, 'email': req.body.hostEmail, 'password': hashedPassword },
    'users': [],
    'activities': req.body.selectedActivities
  };

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