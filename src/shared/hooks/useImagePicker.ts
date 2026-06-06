// Profil fotografi secimini Expo ImagePicker uzerinden soyutlar.
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";

export const useImagePicker = () => {
  const [isPicking, setIsPicking] = useState(false);

  const pickImage = async () => {
    setIsPicking(true);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82
      });

      if (result.canceled) {
        return null;
      }

      return result.assets[0]?.uri ?? null;
    } finally {
      setIsPicking(false);
    }
  };

  return { isPicking, pickImage };
};
