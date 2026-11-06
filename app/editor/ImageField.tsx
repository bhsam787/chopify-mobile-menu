import { useEffect, useRef, useState } from "react";
import type { ImageRef } from "@chopi/menu-core";

interface ImageFieldProps {
  label: string;
  value: ImageRef | undefined;
  onChange: (image: ImageRef | undefined) => void;
  details?: string;
}

interface PickedFile {
  fileId: string;
  url: string | null;
  alt: string;
  ready: boolean;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Turns a file ID from the picker into an image URL; waits for files that are still processing. */
async function resolveFile(id: string): Promise<PickedFile | null> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const response = await fetch(
      `/app/api/files?ids=${encodeURIComponent(id)}`,
    );
    if (!response.ok) throw new Error("Couldn't load the selected image.");
    const { files } = (await response.json()) as { files: PickedFile[] };
    const file = files[0];
    if (!file) return null;
    if (file.ready) return file;
    await wait(800);
  }
  throw new Error(
    "The image is still processing in Shopify. Try again in a moment.",
  );
}

/**
 * Image chosen from the store's Files with Shopify's own file picker (where
 * merchants can also upload). Falls back to a direct upload when the admin
 * doesn't support the picker yet.
 */
export function ImageField({
  label,
  value,
  onChange,
  details,
}: ImageFieldProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canPick =
    typeof shopify !== "undefined" &&
    typeof shopify.intents?.invoke === "function";

  const pick = async () => {
    setError(null);
    setBusy(true);
    try {
      const activity = await shopify.intents.invoke!("pick:shopify/File", {
        data: {
          mediaTypes: ["MediaImage"],
          multiSelect: false,
          selectedFiles: value?.fileId ? [value.fileId] : [],
        },
      });
      // The result normally arrives via `complete`; some admin versions return it directly (seen in bbb-menu-sh).
      const response = (
        activity.complete ? await activity.complete : activity
      ) as { code?: string; data?: { ids?: string[] } } | undefined;
      const id = response?.code === "ok" ? response.data?.ids?.[0] : undefined;
      if (!id) return;
      const file = await resolveFile(id);
      if (!file?.url) throw new Error("Please choose an image file.");
      onChange({
        url: file.url,
        fileId: file.fileId,
        alt: file.alt || undefined,
      });
    } catch (pickError) {
      setError(
        pickError instanceof Error
          ? pickError.message
          : "Couldn't open the file picker.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <s-stack gap="small-200">
      <s-text>{label}</s-text>
      <s-box
        padding="small"
        border="base"
        borderRadius="large"
        background="base"
      >
        <s-grid
          gridTemplateColumns="auto minmax(0, 1fr) auto"
          gap="base"
          alignItems="center"
        >
          {value?.url ? (
            <s-thumbnail src={value.url} alt={value.alt ?? ""} size="base" />
          ) : (
            <s-box padding="small" background="subdued" borderRadius="base">
              <s-icon type="image" color="subdued" />
            </s-box>
          )}
          <s-stack gap="small-500">
            <s-text type="strong">
              {value?.url ? value.alt || "Selected image" : "No image"}
            </s-text>
            <s-text color="subdued">
              {details ??
                (value?.url
                  ? "From your store's files"
                  : "Choose from your store's files or upload a new one")}
            </s-text>
          </s-stack>
          <s-stack direction="inline" gap="small-200" alignItems="center">
            {canPick ? (
              <s-button
                icon={value?.url ? "image" : "image-add"}
                loading={busy}
                onClick={pick}
              >
                {value?.url ? "Change" : "Select image"}
              </s-button>
            ) : (
              <UploadButton
                busy={busy}
                setBusy={setBusy}
                setError={setError}
                onUploaded={onChange}
                hasImage={Boolean(value?.url)}
              />
            )}
            {value?.url && (
              <s-button
                icon="delete"
                variant="tertiary"
                tone="critical"
                accessibilityLabel={`Remove ${label}`}
                onClick={() => onChange(undefined)}
              />
            )}
          </s-stack>
        </s-grid>
      </s-box>
      {error && <s-text tone="critical">{error}</s-text>}
    </s-stack>
  );
}

/** Fallback for admins without the file picker intent: upload straight to Shopify Files. */
function UploadButton({
  busy,
  setBusy,
  setError,
  onUploaded,
  hasImage,
}: {
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
  onUploaded: (image: ImageRef) => void;
  hasImage: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const uploaded = useRef(onUploaded);
  uploaded.current = onUploaded;

  useEffect(() => {
    const element = input.current;
    if (!element) return;
    const onFile = async () => {
      const file = element.files?.[0];
      element.value = "";
      if (!file) return;
      setBusy(true);
      setError(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/app/api/upload", {
          method: "POST",
          body: form,
        });
        const body = (await response.json()) as {
          url?: string;
          fileId?: string;
          error?: string;
        };
        if (!response.ok || !body.url)
          throw new Error(body.error ?? "Upload failed");
        uploaded.current({ url: body.url, fileId: body.fileId });
      } catch (uploadError) {
        setError(
          uploadError instanceof Error ? uploadError.message : "Upload failed",
        );
      } finally {
        setBusy(false);
      }
    };
    element.addEventListener("change", onFile);
    return () => element.removeEventListener("change", onFile);
  }, [setBusy, setError]);

  return (
    <>
      <input ref={input} type="file" accept="image/*" hidden />
      <s-button
        icon="upload"
        loading={busy}
        onClick={() => input.current?.click()}
      >
        {hasImage ? "Replace" : "Upload image"}
      </s-button>
    </>
  );
}
