/* eslint-disable jsx-a11y/anchor-is-valid */
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Loader from "./utils/Loader";
import { NotificationError, NotificationSuccess } from "./utils/Notifications";
import {
  buyPetAction,
  createRequestAction,
  deleteRequestAction,
  getRequestsAction,
  editRequestAction,
} from "../utils/request";
import AllStories from "./AllStories";
import { Col, Container, Row } from "react-bootstrap";
import AddModal from "./modals/AddModal";

export default function Home({ address, fetchBalance }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModal, showAddModal] = useState(false);

  const getRequests = async () => {
    setLoading(true);
    getRequestsAction()
      .then((requests) => {
        if (requests) {
          console.log(requests);
          setRequests(requests);
        }
      })
      .catch((error) => {
        console.log(error);
      })
      .finally((_) => {
        setLoading(false);
      });
  };

  useEffect(() => {
    getRequests();
  }, []);

  const createRequest = async (newRequest) => {
    showAddModal(false);
    setLoading(true);
    createRequestAction(address, { ...newRequest, createdAt: Date.now() })
      .then(() => {
        toast(<NotificationSuccess text="Request added successfully." />);
        getRequests();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to create a request." />);
        setLoading(false);
      });
  };

  const editRequest = async (editedRequest) => {
    setLoading(true);
    editRequestAction(address, editedRequest)
      .then(() => {
        toast(<NotificationSuccess text="Request edited successfully." />);
        getRequests();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to edit request." />);
        setLoading(false);
      });
  };

  const buyPet = async (request, amount) => {
    setLoading(true);
    buyPetAction(address, request, amount)
      .then(() => {
        toast(<NotificationSuccess text="Donated successfully" />);
        getRequests();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to donate request." />);
        setLoading(false);
      });
  };

  const deleteRequest = async (request) => {
    setLoading(true);
    deleteRequestAction(address, request.appId)
      .then(() => {
        toast(<NotificationSuccess text="Request deleted successfully" />);
        getRequests();
        fetchBalance(address);
      })
      .catch((error) => {
        console.log(error);
        toast(<NotificationError text="Failed to delete request." />);
        setLoading(false);
      });
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <Container>
      <Row>
        <Col md="10">
          <h1 className="mb-4">Pet Shop</h1>
        </Col>
        <Col
          md="2"
          onClick={() => showAddModal(true)}
          style={{ fontSize: "24px" }}
        >
          <i className="bi bi-plus-circle"></i>
        </Col>
      </Row>
      <Row>
        {requests.length > 0 ? (
          requests.map((req, i) => {
            return (
              <AllStories
                key={i}
                address={address}
                request={req}
                buyPet={buyPet}
                editRequest={editRequest}
                deleteRequest={deleteRequest}
              />
            );
          })
        ) : (
          <Loader />
        )}
      </Row>
      <AddModal
        show={addModal}
        handleClose={() => showAddModal(false)}
        createRequest={createRequest}
      />
    </Container>
  );
}
