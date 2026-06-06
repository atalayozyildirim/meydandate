// Fetch tabanli, tipli ve degistirilebilir HTTP istemcisi.
export interface HttpRequestConfig<TBody> {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: TBody;
  token?: string;
}

export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  async request<TResponse, TBody = unknown>(path: string, config: HttpRequestConfig<TBody> = {}): Promise<TResponse> {
    const requestInit: RequestInit = {
      method: config.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {})
      }
    };

    if (config.body) {
      requestInit.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, requestInit);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return (await response.json()) as TResponse;
  }
}
