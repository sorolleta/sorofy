import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import { API_URL, getToken } from "./api";

// Conexión al hub de chat. El JWT viaja en la query string porque los
// WebSockets no pueden mandar el header Authorization; withCredentials
// va a false porque no usamos cookies y así el CORS no exige credenciales.
export function createChatConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/chat`, {
      accessTokenFactory: () => getToken() ?? "",
      withCredentials: false,
    })
    .withAutomaticReconnect()
    .build();
}
