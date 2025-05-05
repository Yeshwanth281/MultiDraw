import { Router, type Router as ExpressRouter } from "express";
import {  createRoomSchema } from "@repo/common/types";
import userMiddleware from "../middlewares/userMiddleware";
import { prismaClient } from "@repo/db/client";

const router: ExpressRouter = Router();

export type Shape = {
    type: "rect",
    x: number,
    y: number,
    width: number,
    height: number,
} | {
    type: "circle",
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number
} | {
    type: "pencil",
    points: { x: number, y: number }[]
}


router.post("/create", userMiddleware , async (req, res)=> {
    try {
        const room = createRoomSchema.safeParse(req.body);

        if(!room.success) {
            res.status(400).json({
                message: "Room already exists"
            });
            return;
        }

        if(!req.userId) {
            res.status(401).json({
                message: "UserId required"
            })
            return;
        }
    
        const newRoom = await prismaClient.room.create({
            data:{
                ...room.data,
                createdById: req.userId
            }
        })

        res.status(201).json({
            roomId: newRoom.id,
            slug: newRoom.slug,
        })

    } catch (error) {
        res.status(500).json({
            message: "Room already exists"
        })
    }
});

router.get("/:slug", userMiddleware, async (req, res)=> {
    try {

        const {slug} = req.params;

        if(!slug) {
            res.status(400).json({
                message: "Slug is required"
            })
            return;
        }

        const room = await prismaClient.room.findUnique({
            where:{
                slug,
            }
        })

        if(!room) {
            res.status(404).json({
                message: "Room not found"
            })
            return;
        }

        if(room.public === false && room.createdById !== req.userId) {
            res.status(403).json({
                message: "You don't have access to this room"
            })
            return;
        }

        res.status(200).json({
            room,
        });

    } catch(e) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
});

router.get('/check-slug/:slug', userMiddleware, async (req, res)=> {
    try {

        const {slug} = req.params;

        const room = await prismaClient.room.findUnique({
            where: {
                slug,
            }
        });

        if(room) {
            res.status(200).json({
                available: false
            });
            return;
        }

        res.status(200).json({
            available: true
        });

    } catch (e) {
        res.status(500).json({
             message: "An error occurred while checking the slug" 
        });
    }
});

// router.get('/shapes/:roomId', userMiddleware, async (req, res)=> {
//     try{
//         const roomId = req.params.roomId;

//         if(!roomId) {
//             res.status(400).json({
//                 message: "RoomId is required"
//             })
//             return;
//         }

//         const shapes = await prismaClient.shape.findMany({
//             where: {
//                 roomId: roomId
//             }
//         });

//         res.status(200).json({
//             shapes
//         });
//     } catch (e) {
//         res.status(500).json({
//             message: "An error occurred while fetching the shapes"
//         })
//     }
// })


router.get('/shapes/:roomId', userMiddleware, async (req, res)=> {
    try {
      const roomId = req.params.roomId;
  
      if (!roomId) {
        res.status(400).json({ message: "RoomId is required" });
        return;
      }
  
      const rawShapes = await prismaClient.shape.findMany({
        where: { roomId }
      });
  
      const shapes: Shape[] = rawShapes.map((shape) => {
        if (shape.type === "rect") {
          return {
            type: "rect",
            x: (shape.data as any).x,
            y: (shape.data as any).y,
            width: (shape.data as any).width,
            height: (shape.data as any).height
          };
        } else if (shape.type === "circle") {
          return {
            type: "circle",
            centerX: (shape.data as any).centerX,
            centerY: (shape.data as any).centerY,
            radiusX: (shape.data as any).radiusX,
            radiusY: (shape.data as any).radiusY
          };
        } else if (shape.type === "pencil") {
          return {
            type: "pencil",
            points: (shape.data as any).points
          };
        } else {
          throw new Error("Unknown shape type");
        }
      });
  
      res.status(200).json({ shapes });
  
    } catch (e) {
      console.error("Shape fetch error:", e);
      res.status(500).json({ message: "An error occurred while fetching the shapes" });
    }
  });
  

export default router;