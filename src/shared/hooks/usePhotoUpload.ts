// Profil fotoğrafını Supabase Storage'a yükler ve public URL döndürür
import { useState } from "react";
import { Alert } from "react-native";
import { supabase } from "@/infrastructure/supabase/client";
import {
  extensionForContentType,
  readLocalImageBytes,
  resolveImageContentType,
} from "@/shared/utils/readLocalImageBytes";

const PROFILE_PHOTOS_BUCKET = "profile-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadPhotoOptions {
  userId: string;
  fileUri: string;
  contentType?: string;
}

export const usePhotoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadPhoto = async ({
    userId,
    fileUri,
    contentType,
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

      const bytes = await readLocalImageBytes(fileUri);

      if (bytes.byteLength > MAX_FILE_SIZE) {
        throw new Error("Fotoğraf en fazla 5 MB olabilir.");
      }

      const resolvedContentType = resolveImageContentType(contentType, fileUri);
      const extension = extensionForContentType(resolvedContentType);
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const ownerId = authUser.id || userId;
      const filePath = `${ownerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .upload(filePath, bytes, {
          cacheControl: "3600",
          contentType: resolvedContentType,
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
