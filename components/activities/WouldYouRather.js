import { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, ListGroup, ButtonGroup, Button } from 'react-bootstrap';

export function WouldYouRather({ room, users, socket }) {
    const [ game, setGame ] = useState();
    const choice1Ref = useRef();
    const choice2Ref = useRef();

    useEffect(() => {
        socket.emit('joinGame', { room, activity: 'Would You Rather' });
        socket.on('gameStart', ({ choice1, choice2 }) => {
            console.log('gameStart event');
            if (choice1 && choice2) {
                setGameContent();
                choice1Ref.current.innerHTML = choice1;
                choice2Ref.current.innerHTML = choice2;
            } else {
                console.log('game has not started');
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
                <ButtonGroup vertical className="mt-3 mb-5">
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
            <Row>
                <Col xs={4}>
                    <Card >
                        <h5>Scoreboard</h5>
                        <ListGroup id="users-list">
                            {users.map((user) => {
                                return <ListGroup.Item key={user.peerId}>{user.name}</ListGroup.Item>
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