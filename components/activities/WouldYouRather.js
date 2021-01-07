import { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Accordion, Card, ListGroup, ButtonGroup, Button } from 'react-bootstrap';

export function WouldYouRather({ room, users, socket }) {
    const [ game, setGame ] = useState();
    const [ points, setPoints ] = useState(0);
    const choice1Ref = useRef();
    const choice2Ref = useRef();

    useEffect(() => {
        socket.emit('joinGame', { room, activity: 'Would You Rather' });
        socket.on('gameStart', ({ choice1, choice2 }) => {
            if (choice1 && choice2) {
                setGameContent();
                choice1Ref.current.innerHTML = choice1;
                choice2Ref.current.innerHTML = choice2;
            } else {
                setGame(<Button variant="success" size="lg" onClick={startGame}>Start Game</Button>);
            }
        });
        socket.on('nextQuestion', ({ choice1, choice2 }) => {
            setGameContent();
            choice1Ref.current.innerHTML = choice1;
            choice2Ref.current.innerHTML = choice2;
        });
    }, []);

    function setGameContent() {
        setGame(
            <>
                <h3>Would You Rather...</h3>
                <ButtonGroup vertical className="mt-3 mb-3">
                    <Button className="mb-3" ref={choice1Ref}></Button>
                    <h4>OR</h4>
                    <Button className="mt-3" ref={choice2Ref}></Button>
                </ButtonGroup>
                <Button variant="success" onClick={getNextQuestion}>Next Question</Button>
            </>
        );
    }

    function getNextQuestion() {
        socket.emit('requestNextQuestion', { activity: 'Would You Rather' } );
        socket.on('nextQuestion', ({ choice1, choice2 }) => {
            choice1Ref.current.innerHTML = choice1;
            choice2Ref.current.innerHTML = choice2;
        });
    }

    function startGame() {
        setGameContent();
        getNextQuestion();
    }

    return (
        <Container>
            <Row style={{ marginTop: '20px'}}>
                <Col xs={12}>
                    <Accordion defaultActiveKey="0">
                        <Card>
                            <Accordion.Toggle as={Card.Header} eventKey="0">
                            Click here to expand or shrink the instructions for the game!
                            </Accordion.Toggle>
                            <Accordion.Collapse eventKey="0">
                            <Card.Body>
                                    <p>Everyone starts with 0 points.
                                    You will see two choices. When the game says it is your turn, click on the choice you prefer, but don't tell anyone what you chose.
                                    All other players will click on the choice they think you prefer.
                                    If no one correctly guessed what you chose, you get 3 points. If another player guessed what you chose, they get 1 point.
                                    The game will rotate whose turn it is. Repeat the process until there are no questions left.
                                    The player with the most points at the end of the game wins!</p>
                            </Card.Body>
                            </Accordion.Collapse>
                        </Card>
                    </Accordion>
                </Col>
            </Row>
            <Row style={{ marginTop: '20px' }}>
                <Col xs={4}>
                    <Card >
                        <h5>Scoreboard</h5>
                        <ListGroup id="users-list" style={{ textAlign: 'center' }}>
                            {users.map((user) => {
                                return <ListGroup.Item key={user.peerId}><b>{user.name}</b>: {points} points</ListGroup.Item>
                            })}
                        </ListGroup>
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card border="dark">
                        {game}
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}