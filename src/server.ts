import express, { Request, Response } from "express";
import { createServer } from "http";
import { RemoteSocket, Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

enum MessageType {
  Hello = "hello",
  JoinRoom = "joinRoom",
  OtherUsers = "otherUsers",
  Offer = "offer",
  Answer = "answer",
  Candidate = "candidate",
  Disconnect = "disconnect",
  OtherExit = "otherExit",
  GameServer = "gameserver",
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
  type?: string;
}

interface RemoteRoomSocekt extends RemoteSocket<DefaultEventsMap, any> {
  roomId?: string;
  type?: string;
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

  socket.on(MessageType.JoinRoom, async (data) => {
    const { roomId, type } = data;
    console.log("on", roomId, type);

    const roomInfo = rooms.get(roomId);
    if (roomInfo && roomInfo.size >= MAX_CAPACITY) {
      console.error(`${roomId} is full`);
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.type = type;

    switch (type) {
      case "node":
        const updatedRoomInfo = rooms.get(roomId) ?? new Set();

        const otherUsers = Array.from(updatedRoomInfo).filter(
          (client) => client !== socket.id
        );

        socket.emit(MessageType.OtherUsers, otherUsers);
        break;
      case "gameServer":
        break;
      case "user":
        const roomSockets = await wsServer.in(roomId).fetchSockets();
        const gameServerSocketId =
          roomSockets.find(
            (socket: RemoteRoomSocekt) => socket.type === "gameserver"
          )?.id || "";

        socket.emit(MessageType.GameServer, gameServerSocketId);
        break;
    }
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
    console.log(roomInfo);
    if (roomInfo) {
      socket.to(socket.roomId).emit(MessageType.OtherExit, socket.id);
    }
  });
});

export default httpServer;
