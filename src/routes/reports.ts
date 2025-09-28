import { Elysia } from "elysia";
import { prisma } from "../lib/prisma";
import { stripe } from "../lib/stripe";
import { getPreviewData } from "../lib/preview";
import { randomUUIDv7 } from "bun";

export const reportRoutes = new Elysia()
  .post("/api/reports/start",
  async ({ body }) => {
    const { brandName } = body as { brandName?: string };
    if (!brandName) return { status: 400, body: "brandName is required" };

    try {
      const previewData = await getPreviewData(brandName);

      const reportId = randomUUIDv7();
      await prisma.report.create({
        data: {
          id: reportId,
          brandName,
          status: "PENDING",
          previewData,
        },
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: { name: `Relatório Estratégico ${brandName}` },
              unit_amount: 499, // R$ 4,99
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `http://localhost:3000/success?reportId=${reportId}`,
        cancel_url: `http://localhost:3000/cancel`,
        metadata: { reportId },
      });

      return {
        status: 200,
        body: {
          reportId,
          checkoutUrl: session.url,
          previewData,
        },
      };
    } catch (err) {
      console.error("Failed to start report:", err);
      return { status: 500, body: "Internal Server Error" };
    }
  }
)
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

      return { status: 200, body: report.fullReport };
    } catch (err) {
      console.error("Error fetching report:", err);
      return { status: 500, body: "Internal Server Error" };
    }
  });
;
