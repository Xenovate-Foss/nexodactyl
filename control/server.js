import {Router} from "express";
import {verifyToken} from "./auth.js"
import axios from "axios"
import User from "../model/User.js";

const conf = JSON.parse(JSON.stringify(process.env));

const router = Router()

router.get("/servers", verifyToken, async (req, res) => {
    try {
        if(!req.user.ptero_id) {
            return res.json({success: false, error: "User not linked to Pterodactyl account"})
        }
        
        // Fetch user data from Pterodactyl panel
        const pteroUser = await axios.get(`${conf.panel_url}/api/application/users/${req.user.ptero_id}`, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${conf.panel_key}`
            }
        });

        // Fetch servers for the user
        const serversResponse = await axios.get(`${conf.panel_url}/api/application/servers`, {
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": `Bearer ${conf.panel_key}`
            },
            params: {
                "filter[owner_id]": req.user.ptero_id
            }
        });

        // Return the servers data
        res.json({
            success: true,
            user: pteroUser.data,
            servers: serversResponse.data
        });

    } catch (error) {
        console.error("Error fetching servers:", error.response?.data || error.message);
        res.status(500).json({
            success: false, 
            error: "Failed to fetch servers from panel"
        });
    }
});

export default router;