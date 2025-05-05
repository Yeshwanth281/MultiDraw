import { WebSocketServer, WebSocket } from 'ws';
import jwt from "jsonwebtoken";
import { prismaClient } from "@repo/db/client";

const JWT_SECRET = process.env.JWT_SECRET || "defaultSecretKey";
const wss = new WebSocketServer({ port: 8080 });

interface UserConnection {
    ws: WebSocket;
    rooms: string[];
    userId: string;
}

interface MessageQueue {
    type: "shape";
    roomId: string;
    shapeType: string;
    shapeData: object;
    userId: string;
}

const users: UserConnection[] = [];
const messageQueue: MessageQueue[] = [];

function checkUser(token: string): string | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        if (typeof decoded === 'string' || !decoded?.userId) {
            return null;
        }
        return decoded.userId;
    } catch (e) {
        return null;
    }
}

// Prevent concurrent queue processing
let isProcessing = false;

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    isProcessing = true;

    while (messageQueue.length > 0) {
        const parsedData = messageQueue.shift();
        if (!parsedData) continue;

        try {
            await prismaClient.shape.create({
                data: {
                    type: parsedData.shapeType,
                    roomId: parsedData.roomId,
                    createdById: parsedData.userId,
                    data: parsedData.shapeData
                }
            });

            users.forEach(u => {
                if (u.rooms.includes(parsedData.roomId) && u.ws.readyState === WebSocket.OPEN) {
                    u.ws.send(JSON.stringify({
                        type: "shape",
                        shapeType: parsedData.shapeType,
                        shapeData: parsedData.shapeData,
                        roomId: parsedData.roomId,
                    }));
                }
            });
        } catch (err) {
            console.error("Error saving shape or sending to clients:", err);
        }
    }

    isProcessing = false;
}

wss.on("connection", function connection(ws: WebSocket) {
    let authenticatedUserId: string | null = null;

    ws.on("message", async function message(data: string) {
        try {
            const parsedData = JSON.parse(data);

            if (!authenticatedUserId) {
                if (parsedData.type === "authenticate") {
                    const userId = checkUser(parsedData.token);
                    if (!userId) {
                        ws.close(1008, "Invalid token");
                        return;
                    }
                    authenticatedUserId = userId;
                    users.push({
                        userId,
                        rooms: [],
                        ws
                    });
                    return;
                } else {
                    ws.close(1008, "Not authenticated");
                    return;
                }
            }

            const user = users.find(user => user.ws === ws);
            if (!user) {
                ws.close(1008, "User not found");
                return;
            }

            if (parsedData.type === "join_room") {
                if (!user.rooms.includes(parsedData.roomId)) {
                    user.rooms.push(parsedData.roomId);
                }
                return;
            }

            if (parsedData.type === "leave_room") {
                user.rooms = user.rooms.filter(room => room !== parsedData.roomId);
                return;
            }

            if (parsedData.type === "shape") {
                // Validate shape message
                if (!user.rooms.includes(parsedData.roomId)) {
                    ws.send(JSON.stringify({ error: "User not in room" }));
                    return;
                }

                // Optional: Validate shape data size/structure
                if (typeof parsedData.shapeType !== 'string' || typeof parsedData.shapeData !== 'object') {
                    ws.send(JSON.stringify({ error: "Invalid shape data" }));
                    return;
                }

                messageQueue.push({
                    type: "shape",
                    roomId: parsedData.roomId,
                    shapeType: parsedData.shapeType,
                    shapeData: parsedData.shapeData,
                    userId: user.userId
                });

                processQueue();
                return;
            }

        } catch (e) {
            console.error("Error processing message:", e, data);
            ws.close(1008, "Invalid message format");
        }
    });

    ws.on("close", () => {
        const index = users.findIndex(u => u.ws === ws);
        if (index !== -1) {
            users.splice(index, 1);
        }
    });
});

// Fallback interval (optional but harmless)
setInterval(processQueue, 200);
