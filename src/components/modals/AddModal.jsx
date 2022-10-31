import { useState } from "react";
import {
  Modal,
  Button,
  Form,
  FloatingLabel,
  InputGroup,
} from "react-bootstrap";
import { uploadToIpfs } from "../../utils/request";

export default function AddModal({ show, handleClose, createRequest }) {
  const [data, setData] = useState({
    title: "",
    description: "",
    price: "",
    image: "",
  });
  const handleChange = (e) =>
    setData({ ...data, [e.target.name]: e.target.value });
  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>New Auction</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <FloatingLabel
            controlId="inputLocation"
            label="Title"
            className="mb-3"
          >
            <Form.Control
              type="text"
              name="title"
              value={data.title}
              placeholder="Title"
              onChange={handleChange}
            />
          </FloatingLabel>

          <FloatingLabel
            controlId="inputDescription"
            label="Description"
            className="mb-3"
          >
            <Form.Control
              as="textarea"
              name="description"
              value={data.description}
              placeholder="Description"
              style={{ height: "80px" }}
              onChange={handleChange}
            />
          </FloatingLabel>

          <InputGroup className="mb-3">
            <Form.Control
              value={data.price}
              type="number"
              name="price"
              onChange={handleChange}
              placeholder="How much for this pet?"
            />
            <InputGroup.Text>ALGO</InputGroup.Text>
          </InputGroup>

          <Form.Control
            type="file"
            className={"mb-3"}
            onChange={async (e) => {
              const imageUrl = await uploadToIpfs(e);
              if (!imageUrl) {
                alert("failed to upload image");
                return;
              }
              setData({ ...data, image: imageUrl });
            }}
          ></Form.Control>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleClose}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            handleClose();
            createRequest(data);
            // createNft(performActions, data).then((res) => window.location.reload());
          }}
        >
          Create Auction
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
