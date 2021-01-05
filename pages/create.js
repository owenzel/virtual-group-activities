import Head from 'next/head';
import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Container, Row, Col, Alert, Form, Button } from 'react-bootstrap';

// TODO: Add fields for customization of activity

export default function Create({ activities }) {
  // Get the room id input fields
  const nameRef = useRef();
  const emailRef = useRef();
  const passwordRef = useRef();
  const confirmPasswordRef = useRef();
  
  const selectedActivities = [];
  activities.forEach(activity => selectedActivities.push({ 'title': activity.title, 'selected': false }));

  const [pageContent, setPageContent] = useState({ 
   color: "primary",
   title: "Create an Event",
   body: 
    <Form onSubmit={handleSubmit} className="w-100">
      <Form.Group>
          <Form.Label>Enter Your Name:</Form.Label>
          <Form.Control type="text" ref={nameRef} required ></Form.Control>
      </Form.Group>
      <Form.Group>
          <Form.Label>Enter Your Email:</Form.Label>
          <Form.Control type="email" ref={emailRef} required ></Form.Control>
      </Form.Group>
      <Form.Group>
          <Form.Label>Enter Your Host Password:</Form.Label>
          <Form.Control type="password" ref={passwordRef} required ></Form.Control>
      </Form.Group>
      <Form.Group>
          <Form.Label>Enter Your Host Password Again:</Form.Label>
          <Form.Control type="password" ref={confirmPasswordRef} required ></Form.Control>
      </Form.Group>
      <Form.Group>
          <Form.Label>Select the Activities to Include in Your Event:</Form.Label>
          <div>
            {activities.map((activity, index) => {
              return <Form.Check key={index} name={activity.title} label={activity.title} onChange={onActivityCheckMarkChange} />
            })}
          </div>
      </Form.Group>
      <Button type="submit">Create Event</Button>
    </Form> });

  function onActivityCheckMarkChange(e) {
    selectedActivities.map((activity, index) => {
      if (activity.title === e.target.name) {
        activity.selected = e.target.checked;
      }
    });
  }

  // Handle the user's submission of the join room form
  function handleSubmit(e) {
    // Prevent the default refresh behavior
    e.preventDefault();

    // If the passwords don't match, alert the user
    if (passwordRef.current.value !== confirmPasswordRef.current.value)
    {
        return alert('Passwords must match!');
    }

    // Generate random id for event
    const id = uuidv4();

    // POST activity and host information to the server for storage in memory
    fetch('/api/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: id, hostName: nameRef.current.value, hostEmail: emailRef.current.value, hostPassword: passwordRef.current.value, selectedActivities: selectedActivities })
    })
    .then(response => response.json())
    .then(data => {
      // If there was an error POSTing the data, alert the user
      if (data.error) {
        return alert(data.error);
      }

      // Update the alert with the activity details
      setPageContent({
        color: 'success',
        title: 'Activity Details:',
        body: 
          <>
            <p>Host name: {nameRef.current.value}</p>
            <p>Host email: {emailRef.current.value}</p>
            <p>Host password: {passwordRef.current.value}</p>
            <p>Event Room Id: {id}</p>
            <p>Event Activities: </p>
            <ul>
              {selectedActivities.map((activity, index) => { return <li key={index}>{activity.title}</li> })}
            </ul>
            <hr />
            <p>Share the Event Room Id with your guests (up to 3 guests allowed) so they can use it to join at the time of the event! Do NOT share your host password!</p>
          </>
      });

      // TODO: Send email to host with meeting information
    })
    .catch(error => {
      return alert('Server error. Please try again.');
    });
  }

  return (
    <div >
      <Head>
        <title>AltruTec</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container style={{ paddingTop: '30px'}}>
        <Row>
          <Col>
            <Alert variant={pageContent.color} style={{ textAlign: 'center' }}>
              <Alert.Heading>{pageContent.title}</Alert.Heading>
                {pageContent.body}
            </Alert>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

// Fetch the activity options before the component renders and pass it as a prop to the Create component
export async function getStaticProps(context) {
  const res = await fetch ('http://localhost:3000/api/activities');
  const data = await res.json();

  if (!data) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      activities: data.activities,
    },
  }
}