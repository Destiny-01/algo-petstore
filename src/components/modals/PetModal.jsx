import { Modal, Button, Image, Row, Col } from "react-bootstrap";
import { microAlgosToString } from "../../utils/conversions";

export default function PetModal({
  show,
  handleClose,
  request,
  address,
  showEditModal,
}) {
  return (
    <Modal show={show} size="lg" onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>{request.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {request.owner === address && (
          <Row>
            <Col md="9"></Col>
            <Col md="3" style={{ display: "flex" }}>
              <Button variant="info" onClick={showEditModal}>
                <i class="bi bi-pencil-square"></i>
              </Button>
              <Button variant="danger">
                <i class="bi bi-trash3"></i>
              </Button>
            </Col>
          </Row>
        )}
        <Image src={request.image} alt="pet" fluid />
        <p className="mt-2">{request.description}</p>
        Price: <h5>{microAlgosToString(request.highestBid)}ALGO</h5>
        Date Listed: <h5>{microAlgosToString(request.createdAt)}</h5>
        {request.owner !== address ? (
          <Button onClick={() => {}}>Adopt Pet</Button>
        ) : (
          <p>You can't adopt your pet</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}
