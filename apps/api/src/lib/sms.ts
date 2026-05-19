export async function sendSMS(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from) return // SMS not configured — silently skip

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error("SMS send failed:", err)
  }
}
