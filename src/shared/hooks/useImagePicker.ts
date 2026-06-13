// Profil fotografi secimini Expo ImagePicker uzerinden soyutlar.
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";

interface PickImageOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  base64?: boolean;
  quality?: number;
}

export const useImagePicker = () => {
  const [isPicking, setIsPicking] = useState(false);

  const pickImageAsset = async (options: PickImageOptions = {}) => {
    setIsPicking(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [1, 1],
        base64: options.base64 ?? false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: options.quality ?? 0.82,
      });

      if (result.canceled) {
        return null;
      }

      return result.assets[0] ?? null;
    } finally {
      setIsPicking(false);
    }
  };

  const pickImage = async (options: PickImageOptions = {}) =>
    (await pickImageAsset(options))?.uri ?? null;

  return { isPicking, pickImage, pickImageAsset };
};
