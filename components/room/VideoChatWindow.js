import { Card } from 'react-bootstrap';

export function VideoChatWindow({name}) {
    return (
        <Card>
            <Card.Img variant="top" src='/face-placeholder-1.png' style={{ margin: 'auto', width: '60%' }}/>
            <Card.Body>
                <Card.Title>{name}</Card.Title>
            </Card.Body>
        </Card>
    );
}