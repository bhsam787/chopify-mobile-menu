import { assertNoUserErrors, gql, type Admin } from "./admin-graphql.server";

const STAGE_UPLOAD = `#graphql
  mutation StageImageUpload($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters { name value }
      }
      userErrors { field message }
    }
  }
`;

const CREATE_FILE = `#graphql
  mutation CreateImageFile($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files { id }
      userErrors { field message }
    }
  }
`;

const FILE_STATUS = `#graphql
  query ImageFileStatus($id: ID!) {
    node(id: $id) {
      ... on MediaImage {
        fileStatus
        image { url }
      }
    }
  }
`;

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Uploads an image to Shopify Files and returns its CDN URL once processed. */
export async function uploadImage(
  admin: Admin,
  file: File,
): Promise<{ url: string; fileId: string }> {
  if (!ALLOWED_TYPES.includes(file.type))
    throw new Error("Use a JPG, PNG, WebP, GIF or SVG image.");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("Images can be up to 20 MB.");

  const staged = await gql(admin, STAGE_UPLOAD, {
    input: [
      {
        filename: file.name,
        mimeType: file.type,
        resource: "IMAGE",
        httpMethod: "POST",
        fileSize: String(file.size),
      },
    ],
  });
  assertNoUserErrors(staged.stagedUploadsCreate.userErrors);
  const target = staged.stagedUploadsCreate.stagedTargets[0];

  const form = new FormData();
  for (const parameter of target.parameters)
    form.append(parameter.name, parameter.value);
  form.append("file", file);
  const upload = await fetch(target.url, { method: "POST", body: form });
  if (!upload.ok) throw new Error("The image upload failed. Please try again.");

  const created = await gql(admin, CREATE_FILE, {
    files: [
      {
        originalSource: target.resourceUrl,
        contentType: "IMAGE",
        alt: file.name.replace(/\.[^.]+$/, ""),
      },
    ],
  });
  assertNoUserErrors(created.fileCreate.userErrors);
  const fileId: string = created.fileCreate.files[0].id;

  // Shopify processes images asynchronously; the URL appears when it's ready.
  for (let attempt = 0; attempt < 20; attempt++) {
    const status = await gql(admin, FILE_STATUS, { id: fileId });
    if (status.node?.image?.url) return { url: status.node.image.url, fileId };
    if (status.node?.fileStatus === "FAILED") break;
    await wait(500);
  }
  throw new Error("Shopify couldn't process this image. Try another file.");
}
