import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";

enum MessageType {
  Hello = "hello",
  JoinRoom = "joinRoom",
  OtherUsers = "otherUsers",
  Offer = "offer",
  Answer = "answer",
  Candidate = "candidate",
  Disconnect = "disconnect",
  OtherExit = "otherExit",
}

type OfferPayload = {
  sdp: RTCSessionDescriptionInit;
  offerSendId: string;
};

type AnswerPayload = {
  sdp: RTCSessionDescriptionInit;
  answerSendId: string;
};

type CandidatePayload = {
  candidate: RTCIceCandidate;
  candidateSendId: string;
};

class RoomSocket extends Socket {
  roomId?: string;
}

const app = express();
const httpServer = createServer(app);
const wsServer = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const MAX_CAPACITY = process.env.MAX_CLIENTS
  ? parseInt(process.env.MAX_CLIENTS, 10)
  : 500;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello BomiJourney Signaling server");
});

const rooms = wsServer.sockets.adapter.rooms;

wsServer.on("connection", (socket: RoomSocket) => {
  socket.emit(MessageType.Hello, "bomi");
  console.log("conn:", socket.id);

  socket.on(MessageType.JoinRoom, (data) => {
    const { roomId } = data;

    const roomInfo = rooms.get(roomId);
    if (roomInfo && roomInfo.size >= MAX_CAPACITY) {
      console.error(`${roomId} is full`);
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;

    const updatedRoomInfo = rooms.get(roomId) ?? new Set();

    const otherUsers = Array.from(updatedRoomInfo).filter(
      (client) => client !== socket.id
    );

    socket.emit(MessageType.OtherUsers, otherUsers);
  });

  socket.on(
    MessageType.Offer,
    (data: OfferPayload & { offerReceiveId: string }) => {
      const offerPayload: OfferPayload = {
        sdp: data.sdp,
        offerSendId: data.offerSendId,
      };

      socket.to(data.offerReceiveId).emit(MessageType.Offer, offerPayload);
    }
  );

  socket.on(
    MessageType.Answer,
    (data: AnswerPayload & { answerReceiveId: string }) => {
      const answerPayload: AnswerPayload = {
        sdp: data.sdp,
        answerSendId: data.answerSendId,
      };

      socket.to(data.answerReceiveId).emit(MessageType.Answer, answerPayload);
    }
  );

  socket.on(
    MessageType.Candidate,
    (data: CandidatePayload & { candidateReceiveId: string }) => {
      const candidatePayload: CandidatePayload = {
        candidate: data.candidate,
        candidateSendId: data.candidateSendId,
      };
      socket
        .to(data.candidateReceiveId)
        .emit(MessageType.Candidate, candidatePayload);
    }
  );

  socket.on(MessageType.Disconnect, () => {
    console.log("disconnected socket:", socket.id);
    if (!socket.roomId) {
      console.error("check socket roomId");
      return;
    }
    const roomInfo = rooms.get(socket.roomId);
    if (roomInfo) {
      socket.to(socket.roomId).emit(MessageType.OtherExit, socket.id);
    }
  });
});

export default httpServer;
