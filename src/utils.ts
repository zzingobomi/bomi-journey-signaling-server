import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { SpiralDirection } from "./types";

export function getPublicRoomsJson(
  wsServer: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) {
  const jsonObject: { [key: string]: string[] } = {};
  getPublicRooms(wsServer).forEach((value, key) => {
    jsonObject[key] = value;
  });

  return jsonObject;
}

export function getPublicRooms(
  wsServer: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;

  const publicRooms: Map<string, string[]> = new Map<string, string[]>();
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      const sockets = Array.from<string>(rooms.get(key) ?? new Set());
      publicRooms.set(key, sockets);
    }
  });

  return publicRooms;
}

// TODO: 중간에 나간 노드 처리하기
export function getNextSpiralCoordinate(n: number): [number, number] {
  if (n === 0) {
    return [0, 0];
  }

  let x = 0;
  let y = 0;
  let step = 1;
  let currentStep = 0;
  let direction = 0;

  for (let i = 1; i <= n; i++) {
    if (direction === SpiralDirection.RIGHT) {
      x += 1;
    } else if (direction === SpiralDirection.UP) {
      y += 1;
    } else if (direction === SpiralDirection.LEFT) {
      x -= 1;
    } else if (direction === SpiralDirection.DOWN) {
      y -= 1;
    }

    currentStep += 1;

    if (currentStep === step) {
      currentStep = 0;
      direction = (direction + 1) % 4;

      if (direction % 2 === 0) {
        step += 1;
      }
    }
  }

  return [x, y];
}
