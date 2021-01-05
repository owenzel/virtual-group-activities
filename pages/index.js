import Head from 'next/head';
import { useRouter } from 'next/router';
import { Container, Row, Col, ButtonGroup, Button } from 'react-bootstrap';

export default function Home() {
  const router = useRouter();

  return (
    <div >
      <Head>
        <title>AltruTec</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Container style={{ paddingTop: '30px'}}>
        <Row className="mb-5" style={{ textAlign: 'center', marginBottom: '10px'}}>
          <Col>
            <h1>AltruTec</h1>
          </Col>
        </Row>
        <Row>
          <Col style={{ textAlign: 'center' }}>
            <ButtonGroup size="lg">
              <Button variant="info" className="mr-5" onClick={() => router.push('/create')}>Create a Virtual Event</Button>
              <Button variant="info" onClick={() => router.push('/room')}>Join a Virtual Event</Button>
            </ButtonGroup>
          </Col>
        </Row>
      </Container>
    </div>
  );
}