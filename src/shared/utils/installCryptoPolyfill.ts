import * as Crypto from "expo-crypto";

const bytesToBinaryString = (bytes: Uint8Array) => {
  let result = "";

  for (let index = 0; index < bytes.length; index += 1) {
    result += String.fromCharCode(bytes[index]);
  }

  return result;
};

export const installCryptoPolyfill = () => {
  const currentCrypto = global.crypto as Crypto | undefined;
  const nextCrypto = (currentCrypto ?? {}) as Crypto & {
    subtle?: Partial<SubtleCrypto>;
  };

  if (typeof nextCrypto.getRandomValues !== "function") {
    nextCrypto.getRandomValues = (<T extends ArrayBufferView | null>(array: T) => {
      if (!array || !("byteLength" in array)) {
        return array;
      }

      const bytes = new Uint8Array(
        array.buffer,
        array.byteOffset,
        array.byteLength,
      );

      try {
        bytes.set(Crypto.getRandomBytes(bytes.length));
      } catch {
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = Math.floor(Math.random() * 256);
        }
      }

      return array;
    }) as Crypto["getRandomValues"];
  }

  if (!nextCrypto.subtle) {
    (nextCrypto as { subtle?: Partial<SubtleCrypto> }).subtle = {};
  }

  if (typeof nextCrypto.subtle.digest !== "function") {
    nextCrypto.subtle.digest = (async (
      algorithm: AlgorithmIdentifier,
      data: BufferSource,
    ) => {
      const algorithmName =
        typeof algorithm === "string" ? algorithm : algorithm.name;

      if (algorithmName.toUpperCase() !== "SHA-256") {
        throw new Error(`Unsupported algorithm: ${algorithmName}`);
      }

      const bytes =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      const input = bytesToBinaryString(bytes);
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        input,
      );
      const hashBytes = new Uint8Array(
        hash.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? [],
      );

      return hashBytes.buffer;
    }) as SubtleCrypto["digest"];
  }

  global.crypto = nextCrypto;
};

installCryptoPolyfill();
