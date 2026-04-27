import { assertCloudinaryClientConfig, cloudinaryConfig } from "@/lib/cloudinary/config";

export async function uploadImageToCloudinary(file: File) {
  assertCloudinaryClientConfig();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", cloudinaryConfig.uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Cloudinary upload failed.");
  }

  return response.json() as Promise<{ secure_url: string; public_id: string }>;
}
