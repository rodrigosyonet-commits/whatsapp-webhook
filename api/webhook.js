export default function handler(req, res) {
  const VERIFY_TOKEN = "rodrigo_token_123";

  // ✅ Verificación de Meta
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado");
      return res.status(200).send(challenge);
    } else {
      console.log("❌ Error de verificación");
      return res.status(403).send("Error de verificación");
    }
  }

  // ✅ Recepción de mensajes
  if (req.method === "POST") {
    console.log("📩 Evento recibido:");
    console.log(JSON.stringify(req.body, null, 2));

    return res.status(200).send("EVENT_RECEIVED");
  }

  return res.status(405).send("Método no permitido");
}
