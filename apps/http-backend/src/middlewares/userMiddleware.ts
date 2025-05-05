import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";

declare global {
    namespace Express {
      interface Request {
        userId?: string;  // Optional userId, as not every request will have it
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || "defaultSecretKey";

export default function userMiddleware (req: Request, res: Response, next: NextFunction){
    try {
        const token = req.headers["authorization"]?.split(" ")[1];

        if(!token) {
            res.status(401).json({
                message:"unauthorized"
            });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };


        if(!decoded) {
            res.status(401).json({
                message:"unauthorized"
            });
            return;
        }

        req.userId = decoded.userId;

        next();
    } catch (error) {

        if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
              message: "Unauthorized: Invalid token"
            });
            return;
        }

        res.status(401).json({
            message:"unauthorized"
        });
    }
}