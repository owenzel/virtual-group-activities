import { useState } from 'react';
import { Container, Row, CardGroup } from 'react-bootstrap';
import { VideoChatWindow } from './VideoChatWindow';

// Activities:
import { WouldYouRather } from './Activities';

const activityComponents = {
    'Would You Rather': WouldYouRather,
}

export function VideoTopTemplate({ isHost, selectedActivities, socket }) {
    const [roomUsers, setRoomUsers] = useState([]);

    const ActivityComponent = activityComponents[selectedActivities[0]];

    socket.on('roomUsers', ({ userList }) => {
        setRoomUsers(userList);
    });

    return (
        <Container>
            <Row>
                <CardGroup style={{ textAlign: 'center', display: 'flex', flexDirection: 'row' }}>
                    {roomUsers.map((user, index) => {
                        return <VideoChatWindow key={index} name={user.name} style={{flex: 1}} />
                    })}
                </CardGroup>
            </Row>
            <Row style={{ marginTop: '30px'}}>
                <ActivityComponent socket={socket} />
            </Row>
        </Container>
    );
}