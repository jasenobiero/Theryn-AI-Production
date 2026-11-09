import fs from "node:fs";
import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";

const defaultApiKey = process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "not-configured";
const defaultBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ?? "https://api.openai.com/v1";

export function createImageClient(apiKey = defaultApiKey) {
  return new OpenAI({ apiKey, baseURL: defaultBaseUrl });
}

export const openai = createImageClient();

export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "1536x1024" | "1024x1536" = "1024x1024",
  apiKey?: string,
): Promise<Buffer> {
  const response = await createImageClient(apiKey).images.generate({
    model: "gpt-image-2.5-flare",
    prompt,
    size,
  });
  const imageData = response.data ?? [];
  const base64 = imageData[0]?.b64_json ?? "";
  return Buffer.from(base64, "base64");
}

export async function editImages(
  imageFiles: string[],
  prompt: string,
  outputPath?: string,
  apiKey?: string,
): Promise<Buffer> {
  const images = await Promise.all(
    imageFiles.map((file) =>
      toFile(fs.createReadStream(file), file, {
        type: "image/png",
      })
    )
  );

  const response = await createImageClient(apiKey).images.edit({
    model: "gpt-image-2.5-flare",
    image: images,
    prompt,
  });

  const imageData = response.data ?? [];
  const imageBase64 = imageData[0]?.b64_json ?? "";
  const imageBytes = Buffer.from(imageBase64, "base64");

  if (outputPath) {
    fs.writeFileSync(outputPath, imageBytes);
  }

  return imageBytes;
}

