import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { uploadImage } from "../services/files.server";

/** Uploads one image to Shopify Files for the editor. Returns `{ url, fileId }` or `{ error }`. */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const file = (await request.formData()).get("file");
  if (!(file instanceof File))
    return Response.json({ error: "No file received." }, { status: 400 });
  try {
    return Response.json(await uploadImage(admin, file));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 422 },
    );
  }
};
