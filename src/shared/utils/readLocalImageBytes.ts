import * as FileSystem from "expo-file-system/legacy";

const decodeBase64 = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const readWithFileSystem = async (fileUri: string): Promise<Uint8Array> => {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return decodeBase64(base64);
};

const readWithFetch = async (fileUri: string): Promise<Uint8Array> => {
  const response = await fetch(fileUri);
  const blob = await response.blob();
  return new Uint8Array(await blob.arrayBuffer());
};

export const readLocalImageBytes = async (fileUri: string): Promise<Uint8Array> => {
  const trimmedUri = fileUri.trim();

  if (!trimmedUri) {
    throw new Error("Seçilen fotoğraf okunamadı.");
  }

  const bytes =
    trimmedUri.startsWith("file://") ||
    trimmedUri.startsWith("content://") ||
    trimmedUri.startsWith("ph://")
      ? await readWithFileSystem(trimmedUri)
      : await readWithFetch(trimmedUri);

  if (bytes.byteLength === 0) {
    throw new Error("Seçilen fotoğraf boş görünüyor. Lütfen başka bir fotoğraf dene.");
  }

  return bytes;
};

export const resolveImageContentType = (
  contentType: string | undefined,
  fileUri: string,
): string => {
  if (contentType?.startsWith("image/")) {
    if (contentType === "image/heic" || contentType === "image/heif") {
      return "image/jpeg";
    }

    return contentType;
  }

  const extension = fileUri.split("?")[0]?.split(".").pop()?.toLowerCase();
  const mimeByExtension: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heic: "image/jpeg",
    heif: "image/jpeg",
  };

  return mimeByExtension[extension ?? ""] ?? "image/jpeg";
};

export const extensionForContentType = (contentType: string): string => {
  const extensionByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return extensionByMime[contentType] ?? "jpg";
};
