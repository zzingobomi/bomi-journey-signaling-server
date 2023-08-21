import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket, RawData } from "ws";
import { v4 as uuidv4 } from "uuid";

enum MessageType {
  Hello = "hello",
  Users = "users",
  Candidate = "candidate",
  Offer = "offer",
  Answer = "answer",
}

interface ISignalingMessage {
  event: string;
  payload: string;
}

interface ICandidatePayload {
  candidate: RTCIceCandidate;
  candidateSendID: string;
  candidateReceiveID: string;
}

interface IOfferPayload {
  sdp: RTCSessionDescription;
  offerSendID: string;
  offerReceiveID: string;
}

interface IAnswerPayload {
  sdp: RTCSessionDescription;
  answerSendID: string;
  answerReceiveID: string;
}

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const clients: WebSocket[] = [];

app.get("/", (req: Request, res: Response) => {
  res.send("hello bomi-journey signaling server");
});

wss.on("connection", function connection(ws: WebSocket) {
  ws.id = uuidv4();
  clients.push(ws);
  console.log("connection:", ws.id);

  const helloMessage: ISignalingMessage = {
    event: MessageType.Hello,
    payload: ws.id,
  };
  ws.send(JSON.stringify(helloMessage));

  ws.on("message", (data: RawData) => {
    const { event, payload } = JSON.parse(data.toString()) as ISignalingMessage;
    console.log("ws:", ws.id, " event:", event);

    switch (event) {
      case MessageType.Hello:
        break;
      case MessageType.Users:
        handleUsers(ws);
        break;
      case MessageType.Candidate:
        handleCandidate(payload);
        break;
      case MessageType.Offer:
        handleOffer(payload);
        break;
      case MessageType.Answer:
        handleAnswer(payload);
        break;
    }
  });

  ws.on("close", () => handleClose(ws));
});

// ========================
// Message Handler
// ========================

function handleUsers(ws: WebSocket) {
  const users = clients
    .filter((client) => client.id !== ws.id)
    .map((client) => client.id);

  const userMessage: ISignalingMessage = {
    event: MessageType.Users,
    payload: JSON.stringify(users),
  };

  ws.send(JSON.stringify(userMessage));
}

function handleCandidate(payload: string) {
  const candidatePayload = JSON.parse(payload) as ICandidatePayload;

  const candidateMessage: ISignalingMessage = {
    event: MessageType.Candidate,
    payload: JSON.stringify(candidatePayload),
  };

  findClientById(candidatePayload.candidateReceiveID)?.send(
    JSON.stringify(candidateMessage)
  );
}

function handleOffer(payload: string) {
  const offerPayload = JSON.parse(payload) as IOfferPayload;

  const offerMessage: ISignalingMessage = {
    event: MessageType.Offer,
    payload: JSON.stringify(offerPayload),
  };

  findClientById(offerPayload.offerReceiveID)?.send(
    JSON.stringify(offerMessage)
  );
}

function handleAnswer(payload: string) {
  const answerPayload = JSON.parse(payload) as IAnswerPayload;

  const answerMessage: ISignalingMessage = {
    event: MessageType.Answer,
    payload: JSON.stringify(answerPayload),
  };

  findClientById(answerPayload.answerReceiveID)?.send(
    JSON.stringify(answerMessage)
  );
}

function handleClose(ws: WebSocket) {
  const position = clients.indexOf(ws);
  clients.splice(position, 1);
  console.log("connection closed:", ws.id);
}

// ========================
// Utility
// ========================

function findClientById(id: string) {
  return clients.find((client) => client.id === id);
}

export default httpServer;
