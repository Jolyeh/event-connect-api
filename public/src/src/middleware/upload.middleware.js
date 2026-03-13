import multer from "multer";
import path from "path";
import fs from "fs";

export const upload = (folder) => {
  const uploadDir = path.join("public/uploads", folder);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueName + path.extname(file.originalname));
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error("Format image non supporté");
      error.statusCode = 400;
      error.code = "INVALID_FILE_TYPE";
      return cb(error, false);
    }

    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 },
  });
};