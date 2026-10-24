export function connectorConfig(value) {
  if (!value) return { state: "configuration_missing" };
  if (
    typeof value !== "string" ||
    value.endsWith(".apps.googleusercontent.com") ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(value)
  )
    return { state: "configuration_invalid" };
  return { state: "configured", connectorId: value };
}
export async function connectionStatus({ connectorId, connectors }) {
  const config = connectorConfig(connectorId);
  if (config.state !== "configured") return config;
  try {
    const connection = await connectors.getCurrentAppUserConnection(
      config.connectorId,
    );
    return {
      state: connection?.accessToken ? "connected" : "connection_unconfirmed",
      connectorId: config.connectorId,
    };
  } catch (error) {
    // A 404 can mean missing connection OR a wrong connector ID. Never claim a definite disconnect.
    if (error?.status === 404)
      return {
        state: "connection_unconfirmed",
        connectorId: config.connectorId,
      };
    return { state: "unavailable" };
  }
}
