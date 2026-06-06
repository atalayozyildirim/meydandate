// Gelecekte Supabase veya Node API baglantisina gecmek icin merkezi API istemcisi.
import { HttpClient } from "./HttpClient";

export class ApiClient {
  readonly http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }
}
