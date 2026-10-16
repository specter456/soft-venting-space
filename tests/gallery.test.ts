/**
 * Gallery import tests — the shared helper behind "from gallery" in every
 * creative tool (Photo Doodle, Scribble, Stickers, GIF Studio, Wall).
 *
 * Verifies the mission's contract:
 *   - a picked image becomes a local data-URL vault item (never uploaded),
 *   - unsupported/corrupt files are rejected with the soft line
 *     "that picture didn't open — try another one",
 *   - a good file lands in the vault as a deletable photo item.
 *
 * The DOM decode step (createImageBitmap) is stubbed so a fake PNG "opens"
 * headlessly; the corrupt case makes that decode throw.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

const toastMock = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: toastMock }));

import {
  GALLERY_ERROR_LINE,
  fileToImageDataUrl,
  importGalleryPhoto,
} from "@/lib/gallery";

const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const makeFile = (type: string, name = "pic.png") =>
  new File([pngBytes], name, { type });

const decodeOk = () => ({ width: 400, height: 300, close: () => {} });

beforeAll(() => {
  vi.stubGlobal("createImageBitmap", async () => decodeOk());
});

describe("fileToImageDataUrl", () => {
  it("reads an image file into a data URL", async () => {
    const dataUrl = await fileToImageDataUrl(makeFile("image/png"));
    expect(dataUrl?.startsWith("data:image/")).toBe(true);
  });

  it("rejects unsupported files (not an image)", async () => {
    expect(await fileToImageDataUrl(makeFile("text/plain", "notes.txt"))).toBeNull();
  });

  it("rejects corrupt files whose pixels don't decode", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      async () => {
        throw new Error("decode failed");
      },
    );
    expect(await fileToImageDataUrl(makeFile("image/png"))).toBeNull();
    vi.stubGlobal("createImageBitmap", async () => decodeOk());
  });
});

describe("importGalleryPhoto", () => {
  it("shows the soft line when the picture didn't open", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      async () => {
        throw new Error("decode failed");
      },
    );
    const item = await importGalleryPhoto({ file: makeFile("image/png") });
    expect(item).toBeNull();
    expect(toastMock).toHaveBeenCalledWith(GALLERY_ERROR_LINE);
    expect(GALLERY_ERROR_LINE).toBe("that picture didn't open — try another one");
    vi.stubGlobal("createImageBitmap", async () => decodeOk());
  });

  it("stores a good photo in the vault as a deletable photo item", async () => {
    const item = await importGalleryPhoto({ file: makeFile("image/png") });
    expect(item).toBeTruthy();
    expect(item!.kind).toBe("photo");
    expect(item!.art.startsWith("data:image/")).toBe(true);
    expect(item!.bg).toBe("tile-peach");
    expect(item!.caption).toBe("from your gallery");
    expect(item!._id).toBeTruthy();
  });

  it("keeps a custom caption when given one", async () => {
    const item = await importGalleryPhoto({
      file: makeFile("image/png"),
      caption: "scribble background",
    });
    expect(item!.caption).toBe("scribble background");
  });
});
