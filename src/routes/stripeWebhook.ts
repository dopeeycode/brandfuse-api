// src/routes/stripeWebhook.ts
import { Elysia } from "elysia";
import { stripe } from "../lib/stripe";
import { prisma } from "../lib/prisma";
import { randomUUID } from "crypto";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const stripeWebhookRoutes = new Elysia()
  .post("/api/stripe/webhook", async ({ body, headers, request }) => {
    const signature = headers["stripe-signature"];

    if (!signature && STRIPE_WEBHOOK_SECRET) {
      return { status: 400, body: "Missing stripe-signature" };
    }

    let event: any;

    try {
      // Para teste local: se não houver secret, usa JSON direto
      if (!STRIPE_WEBHOOK_SECRET) {
        console.log(
          "⚠️ Stripe Webhook secret not defined, skipping signature check for local test"
        );
        event = body;
      } else {
        const rawBody = Buffer.from(await request.arrayBuffer());
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature!,
          STRIPE_WEBHOOK_SECRET
        );
      }
    } catch (err) {
      console.error("Webhook signature verification failed.", err);
      return { status: 400, body: `Webhook Error: ${(err as Error).message}` };
    }

    // Processa apenas checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const reportId: string | undefined = session?.metadata?.reportId;

      if (!reportId) {
        console.error("No reportId in metadata");
        return { status: 400, body: "Missing reportId in metadata" };
      }

      try {
        // Verifica se já foi processado (idempotência)
        const existingReport = await prisma.report.findUnique({
          where: { id: reportId },
        });
        if (!existingReport) {
          console.error(`Report ${reportId} not found`);
          return { status: 404, body: "Report not found" };
        }
        if (existingReport.status === "PAID") {
          console.log(`Report ${reportId} already processed`);
          return { status: 200, body: "Already processed" };
        }

        // Gera accessToken único
        const accessToken = randomUUID();

        // Mock de fullReport (substituir por lógica real depois)
        const fullReport = {
          whois: "available",
          website: "ok",
          instagram: "ok",
          twitter: "ok",
          facebook: "ok",
          score: Math.floor(Math.random() * 100),
          advancedChecks: ["Trademark check", "Auction analysis", "Domain history"],
        };

        // Atualiza no banco
        await prisma.report.update({
          where: { id: reportId },
          data: {
            status: "PAID",
            accessToken,
            fullReport,
          },
        });

        console.log(`✅ Report ${reportId} updated with accessToken ${accessToken}`);
      } catch (err) {
        console.error("Failed to update report:", err);
        return { status: 500, body: "Internal Server Error" };
      }
    }

    return { status: 200, body: "Received" };
  });
