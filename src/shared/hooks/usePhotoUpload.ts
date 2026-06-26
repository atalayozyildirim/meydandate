// Profil fotoğrafını Supabase Storage'a yükler ve public URL döndürür
import { useState } from "react";
import { Alert } from "react-native";
import { supabase } from "@/infrastructure/supabase/client";

const PROFILE_PHOTOS_BUCKET = "profile-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadPhotoOptions {
  userId: string;
  fileUri: string;
}

export const usePhotoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadPhoto = async ({
    userId,
    fileUri,
  }: UploadPhotoOptions): Promise<string | null> => {
    setIsUploading(true);

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        throw new Error("Oturum doğrulanamadı. Lütfen tekrar giriş yap.");
      }

      // Fetch the file from the URI
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Check file size
      if (blob.size > MAX_FILE_SIZE) {
        throw new Error("Fotoğraf en fazla 5 MB olabilir.");
      }

      // Determine file extension from mime type
      const mimeTypes: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      };

      const extension = mimeTypes[blob.type] || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const ownerId = authUser.id || userId;
      const filePath = `${ownerId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .upload(filePath, blob, {
          cacheControl: "3600",
          contentType: blob.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        const uploadMessage = /row-level security|violates/i.test(
          uploadError.message,
        )
          ? "Fotoğraf yükleme izni eksik. Storage politikaları güncellenmeli."
          : uploadError.message;

        throw new Error(`Fotoğraf yüklenemedi: ${uploadMessage}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(PROFILE_PHOTOS_BUCKET).getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Fotoğraf yüklenemedi";
      Alert.alert("Fotoğraf yükleme hatası", message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadPhoto, isUploading };
};
