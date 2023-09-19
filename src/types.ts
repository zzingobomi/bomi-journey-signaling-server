import { RemoteSocket, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export enum MessageType {
  Hello = "hello",
  JoinAdminRoom = "joinAdminRoom",
  JoinHostRoom = "joinHostRoom",
  JoinGuestRoom = "joinGuestRoom",
  JoinRoom = "joinRoom",
  OtherUsers = "otherUsers",
  Offer = "offer",
  Answer = "answer",
  Candidate = "candidate",
  Disconnect = "disconnect",
  OtherExit = "otherExit",
  GameServer = "gameserver",
}

export type OfferPayload = {
  sdp: RTCSessionDescriptionInit;
  offerSendId: string;
};

export type AnswerPayload = {
  sdp: RTCSessionDescriptionInit;
  answerSendId: string;
};

export type CandidatePayload = {
  candidate: RTCIceCandidate;
  candidateSendId: string;
};

export class RoomSocket extends Socket {
  // TODO: rooms 관리
  roomId?: string;
  roomIds?: string[];
  type?: string;
}

export interface RemoteRoomSocekt extends RemoteSocket<DefaultEventsMap, any> {
  roomId?: string;
  type?: string;
}

export enum SpiralDirection {
  RIGHT,
  UP,
  LEFT,
  DOWN,
}
