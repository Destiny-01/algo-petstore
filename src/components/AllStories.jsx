import { useState } from "react";
import { microAlgosToString, truncateAddress } from "../utils/conversions";
import { Button, Card, Col, Row } from "react-bootstrap";
import PetModal from "./modals/PetModal";
import EditModal from "./modals/EditModal";

export default function AllStories({
  address,
  request,
  editRequest,
  deleteRequest,
  buyPet,
  key: i,
}) {
  const [editModal, setEditModal] = useState(null);
  const [showModal, shouldShowModal] = useState(null);
  return (
    <>
      <Col key={i} md="4" className="mb-3">
        <Card style={{ width: "18rem" }}>
          <Card.Header className="font-monospace text-secondary">
            <Row>
              <Col md="7">{truncateAddress(request.owner)}</Col>
              <Col md="5">
                {parseFloat(microAlgosToString(request.price))} ALGO
              </Col>
            </Row>
          </Card.Header>
          <Card.Img
            variant="top"
            src={request.image.replace("ipfs.infura", "diac.infura-ipfs")}
          />
          <Card.Body>
            <Card.Title>{request.title}</Card.Title>
            <Card.Text>{request.description.slice(0, 30)}</Card.Text>
            <Button onClick={() => shouldShowModal(i)}>See More</Button>
            <PetModal
              key={i}
              show={showModal === i}
              request={request}
              showEditModal={() => setEditModal(i)}
              deleteRequest={deleteRequest}
              buyPet={buyPet}
              handleClose={() => shouldShowModal(null)}
              address={address}
            />
            <EditModal
              key={i}
              show={editModal === i}
              request={request}
              editRequest={editRequest}
              handleClose={() => setEditModal(null)}
            />
          </Card.Body>
        </Card>
      </Col>
    </>
  );
}
