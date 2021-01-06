import { useRef } from 'react';
import { Container, Row, Col, Alert, Form, Button } from 'react-bootstrap';

export function JoinRoom({ updateScreen }) {
  // Get the name and room id input fields
  const nameRef = useRef();
  const roomIdRef = useRef();
  const hostPasswordRef = useRef();

  // Handle the user's submission of the join room form
  function handleSubmit(e) {
    // Prevent the default refresh behavior
    e.preventDefault();

    // POST entered information to the server to confirm this room has been created
    fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: roomIdRef.current.value, hostPassword: hostPasswordRef.current.value })
    })
    .then(response => response.json())
    .then(data => {
      // If there was an error POSTing the data or if this activity does not yet exist, alert the user
      if (data.error) {
        return alert(data.error);
      }

      // Update the activity screen, and pass in the selected activities and whether or not this user is the host
      updateScreen(data.host, nameRef.current.value, data.selectedActivities, roomIdRef.current.value);
    });
  }

  return (
      <Container style={{ paddingTop: '30px'}}>
        <Row>
          <Col>
            <Alert variant="info" style={{ textAlign: 'center' }}>
              <Alert.Heading>Join a Virtual Activity</Alert.Heading>
                <Form onSubmit={handleSubmit} className="w-100">
                  <Form.Group>
                      <Form.Label>Enter Your Name:</Form.Label>
                      <Form.Control type="text" ref={nameRef} required ></Form.Control>
                  </Form.Group>
                  <Form.Group>
                      <Form.Label>Enter Your Room Id:</Form.Label>
                      <Form.Control type="text" ref={roomIdRef} required ></Form.Control>
                  </Form.Group>
                  <Form.Group>
                      <Form.Label>If You are the Host, Enter Your Host Password. Otherwise, skip this field and click 'Join Room'.</Form.Label>
                      <Form.Control type="text" ref={hostPasswordRef} ></Form.Control>
                  </Form.Group>
                  <Button type="submit">Join Room</Button>
                </Form>
            </Alert>
          </Col>
        </Row>
      </Container>
  );
}