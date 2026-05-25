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

        console.log("📩 Mensaje recibido:", { name, phone, text });

        // ✅ ESCAPE texto
        const safeText = text.replace(/"/g, '\\"');

        // ✅ 1. BUSCAR SI EL CONTACTO YA EXISTE
        const search = await fetch("https://api.monday.com/v2", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: MONDAY_API_KEY,
          },
          body: JSON.stringify({
            query: `
              query {
                items_page_by_column_values(
                  board_id: ${BOARD_ID},
                  columns: [{
                    column_id: "phone_mm3p1g70",
                    column_values: ["${phone}"]
                  }]
                ) {
                  items {
                    id
                    column_values {
                      id
                      text
                    }
                  }
                }
              }
            `,
          }),
        });

        const data = await search.json();
        const item =
          data.data?.items_page_by_column_values?.items?.[0] || null;

        // ✅ 2. SI EXISTE → ACTUALIZAR HISTORIAL
        if (item) {
          const prevMessage =
            item.column_values.find(
              (c) => c.id === "long_text_mm3p7w7a"
            )?.text || "";

          const newHistory =
            prevMessage + `\n${text}`;

          const safeHistory = newHistory.replace(/"/g, '\\"');

          console.log("🔄 Actualizando historial...");

          await fetch("https://api.monday.com/v2", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: MONDAY_API_KEY,
            },
            body: JSON.stringify({
              query: `
                mutation {
                  change_column_value(
                    board_id: ${BOARD_ID},
                    item_id: ${item.id},
                    column_id: "long_text_mm3p7w7a",
                    value: "{\\"text\\":\\"${safeHistory}\\"}"
                  ) {
                    id
                  }
                }
              `,
            }),
          });
        }

        // ✅ 3. SI NO EXISTE → CREAR NUEVO LEAD
        else {
          console.log("🆕 Creando nuevo lead...");

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
      }

      return res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("❌ Error:", error);
      return res.status(500).send("Error");
    }
  }

  return res.status(405).send("Method not allowed");
}
