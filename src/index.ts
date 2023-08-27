import "./pre-start"; // Must be the first import
import logger from "jet-logger";

import EnvVars from "@src/constants/EnvVars";
import httpServer from "./server";

// **** Run **** //

const SERVER_START_MSG =
  "BomiJourney Signaling server started on port: " + EnvVars.Port.toString();

httpServer.listen(EnvVars.Port, () => logger.info(SERVER_START_MSG));
