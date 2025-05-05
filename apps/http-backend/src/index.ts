import express from "express";
import userRoutes from "./routes/user"
import roomRoutes from "./routes/room";
import cors from "cors";
import { FRONTEND_URL } from "@repo/common/config"


const app = express();

app.use(cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, 
}))

app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/room", roomRoutes);

app.listen(3001, () => {
    console.log("Server is running on port 3001");
}); 