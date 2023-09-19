import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  AnswerPayload,
  CandidatePayload,
  MessageType,
  OfferPayload,
  RoomSocket,
} from "./types";
import {
  getNextSpiralCoordinate,
  getNodeRoomsToJson,
  getPublicRoomsJson,
} from "./utils";
import { NodeRoom } from "./core/NodeRoom";

// TODO: 중간에 빠지는 노드 처리하기
let lastNodeNum = 0;

const app = express();
const httpServer = createServer(app);
const wsServer = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const MAX_CAPACITY = process.env.MAX_CLIENTS
  ? parseInt(process.env.MAX_CLIENTS, 10)
  : 500;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello BomiJourney Signaling server");
});

app.get("/admin", (req: Request, res: Response) => {
  res.sendFile("view/admin.html", { root: __dirname });
});

const rooms = wsServer.sockets.adapter.rooms;

const nodeRoomMap = new Map<string, NodeRoom>();

wsServer.on("connection", (socket: RoomSocket) => {
  console.log("conn:", socket.id);

  socket.on(MessageType.Hello, async (data) => {
    const { connectType } = data;
    switch (connectType) {
      case "admin":
        socket.emit(MessageType.Hello, "admin");
        break;
      case "node":
        const [x, y] = getNextSpiralCoordinate(lastNodeNum++);
        socket.emit(MessageType.Hello, `${x}_${y}`);
        break;
      case "user":
        break;
    }
  });

  // TODO: 상대방 방의 방장하고만 접속을 하면 되지 않나?
  // TODO: user 예외처리? switch? node용 소켓인지 게임서버용 소켓인지 확인 필요?

  socket.on(MessageType.JoinHostRoom, async (data) => {
    const { roomId } = data;

    await socket.join(roomId);

    let nodeRoom = nodeRoomMap.get(roomId);

    if (!nodeRoom) {
      nodeRoom = new NodeRoom(roomId);
      nodeRoomMap.set(roomId, nodeRoom);
    }
    nodeRoom.SetHostId(socket.id);

    wsServer
      .to("admin")
      .emit("updateNodeRoom", getNodeRoomsToJson(nodeRoomMap));
  });

  socket.on(MessageType.JoinGuestRoom, async (data) => {
    const { roomIds } = data;

    for (const roomId of roomIds) {
      await socket.join(roomId);

      let nodeRoom = nodeRoomMap.get(roomId);

      if (!nodeRoom) {
        nodeRoom = new NodeRoom(roomId);
        nodeRoomMap.set(roomId, nodeRoom);
      }
      nodeRoom.AddGuestId(socket.id);
    }

    wsServer
      .to("admin")
      .emit("updateNodeRoom", getNodeRoomsToJson(nodeRoomMap));
  });

  socket.on(MessageType.JoinRoom, async (data) => {
    const { roomIds } = data;

    for (const roomId of roomIds) {
      await socket.join(roomId);

      // const updatedRoomInfo = rooms.get(roomId) ?? new Set();
      // const otherUsers = Array.from(updatedRoomInfo).filter(
      //   (client) => client !== socket.id
      // );
      // socket.emit(MessageType.OtherUsers, otherUsers);
    }
    socket.roomIds = roomIds;

    wsServer.to("admin").emit("updateNodeRoom", getPublicRoomsJson(wsServer));

    // const { roomId, type } = data;
    // console.log("on", roomId, type);

    // const roomInfo = rooms.get(roomId);
    // if (roomInfo && roomInfo.size >= MAX_CAPACITY) {
    //   console.error(`${roomId} is full`);
    //   return;
    // }

    // socket.join(roomId);
    // socket.roomId = roomId;
    // socket.type = type;

    // switch (type) {
    //   case "node":
    //     const updatedRoomInfo = rooms.get(roomId) ?? new Set();

    //     const otherUsers = Array.from(updatedRoomInfo).filter(
    //       (client) => client !== socket.id
    //     );

    //     socket.emit(MessageType.OtherUsers, otherUsers);
    //     break;
    //   case "gameServer":
    //     break;
    //   case "user":
    //     const roomSockets = await wsServer.in(roomId).fetchSockets();
    //     const gameServerSocketId =
    //       roomSockets.find(
    //         (socket: RemoteRoomSocekt) => socket.type === "gameserver"
    //       )?.id || "";

    //     socket.emit(MessageType.GameServer, gameServerSocketId);
    //     break;
    // }
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
    // TODO: 여기 부분이 잘못된거 같은데..?
    // if (!socket.roomId) {
    //   console.error("check socket roomId");
    //   return;
    // }
    // const roomInfo = rooms.get(socket.roomId);
    // console.log(roomInfo);
    // if (roomInfo) {
    //   socket.to(socket.roomId).emit(MessageType.OtherExit, socket.id);
    // }

    wsServer.to("admin").emit("updateNodeRoom", getPublicRoomsJson(wsServer));
  });
});

export default httpServer;
