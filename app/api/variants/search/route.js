import { NextResponse } from "next/server";
import { shopifyGraphQL } from "../../../../lib/shopify";

const SEARCH_QUERY = `
  query SearchVariants($query: String!) {
    products(first: 10, query: $query) {
      edges {
        node {
          id
          title
          featuredImage { url }
          variants(first: 50) {
            edges {
              node {
                id
                title
                price
                availableForSale
                inventoryQuantity
                selectedOptions { name value }
              }
            }
          }
        }
      }
    }
  }
`;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ error: "Zoekterm te kort." }, { status: 400 });
    }

    const data = await shopifyGraphQL(SEARCH_QUERY, { query: q.trim() });

    const products = data.products.edges.map((e) => ({
      id: e.node.id,
      title: e.node.title,
      image: e.node.featuredImage?.url || null,
      variants: e.node.variants.edges.map((v) => ({
        id: v.node.id,
        title: v.node.title,
        price: v.node.price,
        availableForSale: v.node.availableForSale,
        inventoryQuantity: v.node.inventoryQuantity,
        options: v.node.selectedOptions,
      })),
    }));

    return NextResponse.json({ products });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Zoeken mislukt. Probeer het opnieuw." }, { status: 500 });
  }
}
