// Profil fotografi secimini Expo ImagePicker uzerinden soyutlar.
import { useState } from "react";
import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

interface PickImageOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  base64?: boolean;
  quality?: number;
}

export const useImagePicker = () => {
  const [isPicking, setIsPicking] = useState(false);

  const showPermissionPrimer = () =>
    new Promise<boolean>((resolve) => {
      Alert.alert(
        "Fotoğraf erişimi",
        "Profil veya akış için galerinden fotoğraf seçebilmen adına bir sonraki ekranda izin isteyeceğiz.",
        [
          {
            text: "Vazgeç",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: "Devam et",
            onPress: () => resolve(true),
          },
        ],
      );
    });

  const pickImageAsset = async (options: PickImageOptions = {}) => {
    setIsPicking(true);

    try {
      const permission = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (permission.status === ImagePicker.PermissionStatus.DENIED) {
        Alert.alert(
          "Fotoğraf erişimi kapalı",
          "Fotoğraf seçmek için cihaz ayarlarından Ehlibyte fotoğraf erişimini açman gerekiyor.",
          [
            { text: "İptal", style: "cancel" },
            {
              text: "Ayarlar",
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ],
        );
        return null;
      }

      if (
        permission.status !== ImagePicker.PermissionStatus.GRANTED &&
        !(await showPermissionPrimer())
      ) {
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect ?? [1, 1],
        base64: options.base64 ?? false,
        mediaTypes: ["images"],
        quality: options.quality ?? 0.82,
      });

      if (result.canceled) {
        return null;
      }

      return result.assets[0] ?? null;
    } catch (error) {
      Alert.alert(
        "Fotoğraf seçilemedi",
        "Galeri açılamadı. Lütfen fotoğraf erişimini cihaz ayarlarından kontrol edip tekrar deneyin."
      );
      return null;
    } finally {
      setIsPicking(false);
    }
  };

  const pickImage = async (options: PickImageOptions = {}) =>
    (await pickImageAsset(options))?.uri ?? null;

  return { isPicking, pickImage, pickImageAsset };
};
