import type { LoaderFunctionArgs } from "react-router";
import type { ResourceLink } from "@chopify/menu-core";
import { authenticate } from "../shopify.server";
import { gql } from "../services/admin-graphql.server";
import { storefrontPath } from "../services/resources.server";

const LINK_OPTIONS = `#graphql
  query LinkOptions($query: String) {
    pages(first: 50, query: $query, sortKey: TITLE) {
      nodes { id handle title }
    }
    blogs(first: 50, query: $query) {
      nodes { id handle title }
    }
    articles(first: 50, query: $query, sortKey: PUBLISHED_AT, reverse: true) {
      nodes {
        id
        handle
        title
        blog { handle }
      }
    }
  }
`;

interface Option {
  id: string;
  handle: string;
  title: string;
  blog?: { handle: string };
}

/** Pages, blogs and blog posts for the editor's link picker (no native picker exists for these). */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const search = new URL(request.url).searchParams.get("q")?.trim();
  const data = await gql<{
    pages: { nodes: Option[] };
    blogs: { nodes: Option[] };
    articles: { nodes: Option[] };
  }>(admin, LINK_OPTIONS, {
    query: search ? `title:*${search.replace(/[^\p{L}\p{N} -]/gu, "")}*` : null,
  });
  const toLink =
    (type: "page" | "blog" | "article") =>
    (node: Option): ResourceLink => ({
      type,
      id: node.id,
      handle: node.handle,
      title: node.title,
      url: storefrontPath(type, node.handle, node.blog?.handle),
    });
  return {
    page: data.pages.nodes.map(toLink("page")),
    blog: data.blogs.nodes.map(toLink("blog")),
    article: data.articles.nodes.map(toLink("article")),
  };
};
