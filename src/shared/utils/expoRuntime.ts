import Constants, {
  AppOwnership,
  ExecutionEnvironment,
} from "expo-constants";

export const isExpoGo =
  Constants.appOwnership === AppOwnership.Expo ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
