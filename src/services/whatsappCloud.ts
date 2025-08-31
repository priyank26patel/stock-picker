import axios from "axios";
import "dotenv/config";

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION ?? "v21.0"}`;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const TOKEN = process.env.WHATSAPP_TOKEN!;
const TO = process.env.MY_WHATSAPP_NUMBER!; // E.164 without '+'

const api = axios.create({
  baseURL: GRAPH,
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  },
});

export async function sendWhatsAppText(body: string, to: string = TO) {
  const url = `/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  };
  const { data } = await api.post(url, payload);
  return data;
}

export async function sendWhatsAppTemplate(
  templateName: string,
  variables: string[] = [],
  lang = "en_US",
  to: string = TO
) {
  const url = `/${PHONE_NUMBER_ID}/messages`;
  const components =
    variables.length > 0
      ? [
          {
            type: "body",
            parameters: variables.map((v) => ({ type: "text", text: v })),
          },
        ]
      : [];

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: lang },
      components,
    },
  };

  const { data } = await api.post(url, payload);
  return data;
}
