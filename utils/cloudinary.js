const cloudinary = require("cloudinary").v2;
<<<<<<< HEAD
const path = require("path");
const mime = require("mime-types");
=======

>>>>>>> origin/main
//configure with env data
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

<<<<<<< HEAD

const uploadMediaToCloudinary = async (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = mime.lookup(ext);

    let resourceType = "auto";

    if (mimeType?.startsWith("video")) {
      resourceType = "video";
    } else if (mimeType === "application/pdf" || mimeType?.startsWith("audio")) {
      resourceType = "raw";
    }

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: resourceType,
      type: "upload",
      access_mode: "public",
=======
const uploadMediaToCloudinary = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
>>>>>>> origin/main
    });

    return result;
  } catch (error) {
<<<<<<< HEAD
    console.log("Cloudinary Upload Error:", error);
    throw new Error("Error uploading to cloudinary");
  }
};
=======
    console.log(error);
    throw new Error("Error uploading to cloudinary");
  }
};

>>>>>>> origin/main
const deleteMediaFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.log(error);
    throw new Error("failed to delete assest from cloudinary");
  }
};

<<<<<<< HEAD
module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
=======
module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
>>>>>>> origin/main
