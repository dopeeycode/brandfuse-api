import { ApifyClient } from "apify-client";
import { fetch } from "bun";

const apifyClient = new ApifyClient({ token: process.env.APIFY_API_KEY! });

async function checkDomainAvailability(domain: string) {
  const apiKey = process.env.WHOISXML_API_KEY!;
  const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domain}&outputFormat=JSON`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch whois for ${domain}`);

    const data = await res.json();

    const record = data.WhoisRecord;
    if (!record) return { domain, status: "error" };

    const available =
      record.dataError === "MISSING_WHOIS_DATA" ||
      record.dataError === "NO_DATA" ||
      record.dataError === "INCOMPLETE_DATA" ||
      record.registryData?.rawText?.includes("No match") ||
      record.registryData?.strippedText?.includes("No match");

    return { domain, status: available ? "available" : "taken" };
  } catch (err) {
    console.error(err);
    return { domain, status: "error" };
  }
}

async function checkSocialProfile(actorId: string, brandName: string) {
  try {
    // Instagram
    if (actorId.includes("shu8")) {
      const run = await apifyClient.actor(actorId).call({
        directUrls: [`https://www.instagram.com/${brandName}/`],
        resultsType: "details",
        resultsLimit: 1,
      });

      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      console.log(`Actor run ID: ${run.id}, Dataset ID: ${run.defaultDatasetId}`);
      console.log(`Items retornados pelo actor Instagram:`, items);

      if (!items || items.length === 0) return "not found";
      if (items[0].error === "no_items") return "not found";
      return "ok";
    }

    // TikTok
    if (actorId.includes("GdWC")) {
      const run = await apifyClient.actor(actorId).call({
        directUrls: [`https://www.tiktok.com/@${brandName}`],
        resultsType: "profile",
        resultsLimit: 1,
      });

      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      console.log(`Actor run ID: ${run.id}, Dataset ID: ${run.defaultDatasetId}`);
      console.log(`Items retornados pelo actor TikTok:`, items);

      if (!items || items.length === 0) return "not found";
      if (items[0].demo) return "not found";
      return "ok";
    }

    // X (Twitter)
    if (actorId === "nfp1fpt5gUlBwPcor") {
      const run = await apifyClient.actor(actorId).call({
        directUrls: [`https://x.com/${brandName}`],
        resultsType: "profile",
        resultsLimit: 1,
      });

      const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
      console.log(`Actor run ID: ${run.id}, Dataset ID: ${run.defaultDatasetId}`);
      console.log(`Items retornados pelo actor X:`, items);

      if (!items || items.length === 0) return "not found";
      const realItem = items.find((i) => !i.demo);
      return realItem ? "ok" : "not found";
    }

    return "not found";
  } catch (err) {
    console.error(`Erro checando actor ${actorId} para ${brandName}:`, err);
    return "not found";
  }
}

export async function getPreviewData(brandName: string) {
  const tlds = [".com", ".com.br", ".net", ".org"];
  const domainChecks = await Promise.all(
    tlds.map((tld) => checkDomainAvailability(`${brandName}${tld}`))
  );

  let websiteStatus = "down";
  try {
    const res = await fetch(`https://${brandName}.com`, { method: "HEAD" });
    if (res.ok) websiteStatus = "ok";
  } catch (_) {
    websiteStatus = "down";
  }

  const [instagram, tiktok, x] = await Promise.all([
    checkSocialProfile("shu8hvrXbJbY3Eb9W", brandName), // Instagram
    checkSocialProfile("GdWCkxBtKWOsKjdch", brandName), // TikTok
    checkSocialProfile("nfp1fpt5gUlBwPcor", brandName), // X
  ]);

  return {
    whois: domainChecks,
    website: websiteStatus,
    social: { instagram, tiktok, x },
  };
}
