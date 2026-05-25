export default async function handler(req, res) {
  const VERIFY_TOKEN = "rodrigo_token_123";

  const MONDAY_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY2Mjc0MDM4OCwiYWFpIjoxMSwidWlkIjoxMDMyMTE3MDQsImlhZCI6IjIwMjYtMDUtMjVUMjI6NDE6NDAuMDAwWiIsInBlciI6Im1lOndyaXRlIiwiYWN0aWQiOjgzMjY0MTAsInJnbiI6InVzZTEifQ.aCSoGeqhkzLvJ_TUn4xuIisR3seqR5VGbaBSR-2Os3w";
  const BOARD_ID = 18414789099;

  // ✅ VERIFICACIÓN META
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Error");
  }

  // ✅ PROCESAR MENSAJES
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      if (value?.messages) {
        const msg = value.messages[0];
        const contact = value.contacts?.[0];

        const phone = msg.from;
        const text = msg.text?.body || "";
        const name = contact?.profile?.name || "Lead WhatsApp";

        console.log("Nuevo lead:", { name, phone, text });

        // ✅ ESCAPAR caracteres peligrosos
        const safeText = text.replace(/"/g, '\\"');

        // ✅ CREAR ITEM EN MONDAY
        await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: MONDAY_API_KEY,
          },
          body: JSON.stringify({
            query: `
              mutation {
                create_item(
                  board_id: ${BOARD_ID},
                  item_name: "${name}",
                  column_values: "{\\"phone_mm3p1g70\\":{\\"phone\\":\\"${phone}\\"},\\"long_text_mm3p7w7a\\":{\\"text\\":\\"${safeText}\\"}}"
                ) {
                  id
                }
              }
            `,
          }),
        });
      }

      return res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).send("Error");
    }
  }

  return res.status(405).send("Method not allowed");
}
