import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { stripe } from "../lib/stripe";

export const reportRoutes = new Elysia()
  .post("/api/reports/start", async ({ body }) => {
    const { brandName } = body as { brandName: string };
    if (!brandName) return { error: "brandName is required" };

    // 1️⃣ Cria registro inicial no DB
    const report = await prisma.report.create({
      data: {
        brandName,
        status: "PENDING",
        previewData: {
          whois: "available",
          website: "ok",
          instagram: "ok",
          twitter: "ok",
          facebook: "ok",
        },
      },
    });

    // 2️⃣ Cria sessão do Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "BrandFuse Strategic Report",
            },
            unit_amount: 499, // R$4,99
          },
          quantity: 1,
        },
      ],
      metadata: {
        reportId: report.id,
      },
      success_url: `${process.env.FRONTEND_URL}/success?reportId=${report.id}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    return {
      reportId: report.id,
      checkoutUrl: session.url,
      previewData: report.previewData,
    };
  }) 
  .get("/api/reports/:accessToken", async ({ params }) => {
    const accessToken = params.accessToken as string;

    if (!accessToken) {
      return { status: 400, body: "Missing access token" };
    }

    try {
      const report = await prisma.report.findFirst({
        where: { accessToken },
      });

      if (!report) {
        return { status: 404, body: "Report not found" };
      }

      if (report.status !== "PAID") {
        return { status: 403, body: "Report not paid yet" };
      }

      // Retorna o fullReport
      return { status: 200, body: report.fullReport };
    } catch (err) {
      console.error("Error fetching report:", err);
      return { status: 500, body: "Internal Server Error" };
    }
  });
;
