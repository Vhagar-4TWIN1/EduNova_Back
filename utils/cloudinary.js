const cloudinary = require("cloudinary").v2;
const path = require("path");
const mime = require("mime-types");
//configure with env data
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


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
    });

    return result;
  } catch (error) {
    console.log("Cloudinary Upload Error:", error);
    throw new Error("Error uploading to cloudinary");
  }
};
const deleteMediaFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.log(error);
    throw new Error("failed to delete assest from cloudinary");
  }
};

module.exports = { uploadMediaToCloudinary, deleteMediaFromCloudinary };
