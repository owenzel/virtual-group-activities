import { useState } from 'react';
import { Container, Row, Col, Card, ListGroup, ButtonGroup, Button } from 'react-bootstrap';

export function WouldYouRather({ socket }) {
    const [roomUsers, setRoomUsers] = useState([]);

    socket.on('roomUsers', ({ userList }) => {
        setRoomUsers(userList);
    });

    return (
        <Container>
            <Row>
                <Col xs={4}>
                    <Card >
                        <h5>Scoreboard</h5>
                        <ListGroup id="users-list">
                            {roomUsers.map((user, index) => {
                                return <ListGroup.Item key={index}>{user.name}</ListGroup.Item>
                            })}
                        </ListGroup>
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card border="dark">
                        <h3>Would You Rather...</h3>
                        <ButtonGroup vertical className="mt-3 mb-3">
                            <Button className="mb-3">Choice 1</Button>
                            <h4>OR</h4>
                            <Button className="mt-3">Choice 2</Button>
                        </ButtonGroup>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}