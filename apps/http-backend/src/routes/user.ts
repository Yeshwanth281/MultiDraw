import { Router, type Router as ExpressRouter } from "express";
import { SignupSchema, SigninSchema } from "@repo/common/types"
import bcrypt from "bcrypt";
import { prismaClient } from "@repo/db/client";
import jwt from "jsonwebtoken";
import userMiddleware from "../middlewares/userMiddleware";

const router: ExpressRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "defaultSecretKey";

router.post("/signup", async (req, res) => {
    try{
        const user = SignupSchema.safeParse(req.body);
        if(!user.success) {
            res.status(400).json({
                message: "Invalid Signup data"
            })
            return;
        }

        const hashedPassword = await bcrypt.hash(user.data.password, 10);

        const newUser = await prismaClient.user.create({
            data:{
                ...user.data,
                password: hashedPassword
            }
        })

        res.status(201).json({
            userID: newUser.id,
        })
    } catch (error) {
        res.status(500).json({
            message: " Email already exists"
        })
    }

});


router.post("/signin", async (req, res)=> {
    try{
        const user = SigninSchema.safeParse(req.body);

        if(!user.success) {
            res.status(400).json({
                message: "Invalid Signin data"
            })
            return;
        }

        const exisitingUser = await prismaClient.user.findUnique({
            where:{
                email: user.data.email
            }
        });

        if(!exisitingUser) {
            res.status(401).json({
                message: "Invalid email "
            });
            return;
        }

        const isPasswordValid = await bcrypt.compare(user.data.password, exisitingUser.password);

        if(!isPasswordValid) {
            res.status(401).json({
                message: "Incorrect password"
            });
        }

        const token = jwt.sign({
            userId: exisitingUser.id
        }, JWT_SECRET, {
            expiresIn: "3d"
        });

        res.status(200).json({
            token,
        });
    } catch (error) {
        res.status(500).json({
            message: "Invalid password or username"
        });
    }
});

router.get("/verify", userMiddleware, async (req, res)=> {
    res.json({ valid: true, userId: req.userId });
})


export default router;