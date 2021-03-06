import Head from 'next/head';
import { useState, useEffect } from 'react';
import io from "socket.io-client";
import { Container, Row, Col } from 'react-bootstrap';
import { JoinRoom } from '../components/JoinRoom';
import { VideoTopTemplate } from '../components/Templates';

// Connect the client to the socket.io server
const socket = io();

export default function Room() {
  // Use state to keep track of screen
  const [screen, setScreen] = useState(<JoinRoom updateScreen={updateScreen} />);

  function updateScreen(isHost, name, activities, roomId) {
    setScreen(<VideoTopTemplate isHost={isHost} name={name} selectedActivities={activities} room={roomId} socket={socket} />);
  }

  useEffect(() => {
    // On the component unmount, close the connection when the component disappears from the DOM (to prevent memory leaks)
    return () => socket.disconnect();
  }, []);

  return (
    <div >
      <Head>
        <title>AltruTec</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container style={{ paddingTop: '30px', paddingBottom: '30px' }}>
        <Row>
          <Col>
            {screen}
          </Col>
        </Row>
      </Container>
    </div>
  );
}