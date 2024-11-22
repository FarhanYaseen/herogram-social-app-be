require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const connectDB = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// For testing purpose
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send('CORS is working!');
});

const startServer = async () => {
    try {
        await connectDB();
        const authRoutes = require("./routes/auth");
        const fileRoutes = require("./routes/files");

        app.use("/api/auth", authRoutes);
        app.use("/api/files", fileRoutes);

        app.use((req, res, next) => {
            res.status(404).json({ message: "Resource not found" });
        });

        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({ message: "Internal server error", error: err.message });
        });

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to MongoDB", error);
        process.exit(1);
    }
};

startServer();
