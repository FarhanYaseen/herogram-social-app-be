const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const File = require("../models/File");
const { uploadSchema, reorderSchema } = require("./validations");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Access denied, no token provided" });

    const token = authHeader.split(" ")[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Invalid or expired token" });
        req.user = user;
        next();
    });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, "..", "uploads");
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/webm",
        "video/x-ms-wmv",
        "video/x-msvideo"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type"), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
});

const router = express.Router();

router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
    try {
        const { error } = uploadSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: "Invalid request data", details: error.details });
        }

        if (!req.file) {
            return res.status(400).json({ message: "File type not supported or no file uploaded" });
        }

        const { tags } = req.body;
        const newFile = new File({
            filename: req.file.filename,
            filepath: req.file.path,
            tags: tags.split(','),
        });

        await newFile.save();
        res.status(200).json({ message: "File uploaded successfully", file: req.file.filename });
    } catch (error) {
        res.status(500).json({ message: "File upload failed", error: error.message });
    }
});

router.get("/list", verifyToken, async (req, res) => {
    try {
        const files = await File.find({}).sort({ order: 1 });
        res.status(200).json(files);
    } catch (error) {
        res.status(500).json({ message: "Unable to list files", error: error.message });
    }
});

router.put('/reorder', verifyToken, async (req, res) => {
    const { error } = reorderSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: 'Invalid input. Please provide an array of reordered files.', details: error.details });
    }

    const { reorderedFiles } = req.body;

    try {
        const bulkOperations = reorderedFiles.map((file, index) => ({
            updateOne: {
                filter: { _id: file._id },
                update: { order: index },
            },
        }));

        await File.bulkWrite(bulkOperations);

        res.status(200).json({ message: 'File order updated successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update file order', details: error.message });
    }
});

router.get("/public/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, "..", "uploads", filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
    }

    const stat = fs.statSync(filePath);
    const total = stat.size;

    if (req.headers.range) {
        const range = req.headers.range;
        const parts = range.replace(/bytes=/, "").split("-");
        const partialstart = parts[0];
        const partialend = parts[1];

        const start = parseInt(partialstart, 10);
        const end = partialend ? parseInt(partialend, 10) : total - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4' // Adjust this according to file type
        });

        file.pipe(res);
    } else {
        res.writeHead(200, {
            'Content-Length': total,
            'Content-Type': 'video/mp4' // Adjust this according to file type
        });

        fs.createReadStream(filePath).pipe(res);
    }
});

router.post("/:id/shareable-link", async (req, res) => {
    const { id } = req.params;
    try {
        const file = await File.findById(id);
        if (!file) return res.status(404).json({ message: "File not found" });

        const link = `${req.protocol}://${req.get("host")}/api/files/public/${file.filename}`;
        file.shareableLink = link;
        await file.save();

        res.json({ link });
    } catch (error) {
        res.status(500).json({ message: "Unable to generate shareable link", error: error.message });
    }
});


router.post("/:id/increment-view", async (req, res) => {
    const { id } = req.params;
    try {
        await File.findByIdAndUpdate(id, { $inc: { views: 1 } });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ message: "Unable to increment view count", error: error.message });
    }
});


router.post("/increment-view/:filename", async (req, res) => {
    const { filename } = req.params;
    try {
        const file = await File.findOne({ filename });
        if (!file) return res.status(404).json({ message: "File not found" });
        await File.updateOne({ filename }, { $inc: { views: 1 } });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ message: "Unable to increment view count", error: error.message });
    }
});
module.exports = router;