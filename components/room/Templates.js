// Credit for mesh network group video chat code: https://github.com/coding-with-chaim/group-video-final
import { useState, useRef, useEffect } from 'react';
import Peer from "simple-peer";
import { Container, Row, CardGroup, Card } from 'react-bootstrap';

// Activities:
import { WouldYouRather } from './Activities';

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
            socket.on('roomUsers', ({ userList }) => {
                userList = userList.filter(user => user.id !== socket.id);
                const users = [];
                console.log(userList);
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
            socket.on('userJoined', payload => {
                const user = addUser(payload.signal, payload.callerID, stream);
                usersRef.current.push({
                    peerId: payload.callerID,
                    peer: user.peer,
                });

                setUsers(users => [...users, user]);
            });
            socket.on('receivingReturnedSignal', payload => {
                const item = usersRef.current.find(u => u.peerId == payload.id);
                item.peer.signal(payload.signal);
            });
        });
    }, []);

    function createUser(userToSignal, userName, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        const user = { name: userName, peer: peer };

        user.peer.on('signal', signal => {
            socket.emit('sendingSignal', { userToSignal, callerID, signal });
        });

        return user;
    }

    function addUser(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        const user = { peer: peer };

        user.peer.on("signal", signal => {
            socket.emit("returningSignal", { signal, callerID })
        })

        user.peer.signal(incomingSignal);

        return user;
    }

    return (
        <Container>
            <Row>
                {/*<video muted ref={userVideo} autoPlay playsInline />*/}
                <CardGroup style={{ textAlign: 'center', display: 'flex', flexDirection: 'row' }}>
                    <Card>
                        <video muted playsInline autoPlay ref={userVideoRef} style={{ margin: 'auto', width: '60%' }}/>
                        <Card.Title>{name}</Card.Title>
                    </Card>
                    {users.map((user, index) => {
                        return <VideoChatWindow key={index} user={user} style={{flex: 1}} />
                    })}
                </CardGroup>
            </Row>
            <Row style={{ marginTop: '30px'}}>
                <ActivityComponent socket={socket} />
            </Row>
        </Container>
    );
}