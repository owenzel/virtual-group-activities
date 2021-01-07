// Credit for mesh network group video chat code: https://github.com/coding-with-chaim/group-video-final
import { useState, useRef, useEffect } from 'react';
import Peer from "simple-peer";
import { Container, Row, CardGroup, Card } from 'react-bootstrap';

// Activities:
import { WouldYouRather } from './activities/WouldYouRather';

const activityComponents = {
    'Would You Rather': WouldYouRather,
}

function VideoChatWindow({ user }) {
    const videoRef = useRef();

    useEffect(() => {
        user.peer.on('stream', stream => {
            videoRef.current.srcObject = stream;
        });
    }, []);

    return (
        <Card>
            <video playsInline autoPlay ref={videoRef} style={{ margin: 'auto', width: '60%' }}/>
            <Card.Title>{user.name}</Card.Title>
        </Card>
    );
}

export function VideoTopTemplate({ isHost, name, selectedActivities, room, socket }) {
    const [users, setUsers] = useState([]);
    const userVideoRef = useRef();
    const usersRef = useRef([]);

    const ActivityComponent = activityComponents[selectedActivities[0]];

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
            userVideoRef.current.srcObject = stream;

            // Join game room
            socket.emit('joinRoom', { name: name, room: room });

            // Get all other users in the room
            socket.on('roomUsers', ({ userList }) => {
                userList = userList.filter(user => user.id !== socket.id);
                const users = [];
                userList.forEach(u => {
                    const user = createUser(u.id, u.name, socket.id, stream);
                    usersRef.current.push({
                        peerId: u.id,
                        peer: user.peer,
                    });
                    users.push(user);
                });
                setUsers(users);
            });

            // Handle another user joining the room
            socket.on('userJoined', payload => {
                const user = addUser(payload.signal, payload.callerName, payload.callerId, stream);
                usersRef.current.push({
                    peerId: payload.callerId,
                    peer: user.peer,
                });
                setUsers(users => [...users, user]);
            });

            socket.on('receivingReturnedSignal', payload => {
                const item = usersRef.current.find(u => u.peerId == payload.id);
                item.peer.signal(payload.signal);
            });

            // Handle another user leaving the room
            socket.on('userLeft', id => {
                const user = usersRef.current.find(u => u.peerId == id);
                if (user) {
                    user.peer.destroy();
                }
                const users = usersRef.current.filter(u => u.peerId != id);
                usersRef.current = users;
                setUsers(users);
            })
        });
    }, []);

    function createUser(userToSignal, userName, callerId, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });
        const user = { peerId: userToSignal, name: userName, peer: peer };
        user.peer.on('signal', signal => {
            socket.emit('sendingSignal', { userToSignal, callerId, signal });
        });
        return user;
    }

    function addUser(incomingSignal, callerName, callerId, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });
        const user = { peerId: callerId, name: callerName, peer: peer };
        user.peer.on("signal", signal => {
            socket.emit("returningSignal", { signal, callerId })
        })
        user.peer.signal(incomingSignal);
        return user;
    }

    return (
        <Container>
            <Row>
                <CardGroup style={{ textAlign: 'center', display: 'flex', flexDirection: 'row' }}>
                    <Card>
                        <video muted playsInline autoPlay ref={userVideoRef} style={{ margin: 'auto', width: '60%' }}/>
                        <Card.Title>{name}</Card.Title>
                    </Card>
                    {users.map((user) => {
                        return <VideoChatWindow key={user.peerId} user={user} style={{flex: 1}} />
                    })}
                </CardGroup>
            </Row>
            <Row style={{ marginTop: '30px'}}>
                <ActivityComponent users={[{ peerId: socket.id, name: name}, ...users]} socket={socket} />
            </Row>
        </Container>
    );
}